#!/usr/bin/env python3
"""From cut-outs to what the room loads. One shoe at a time, because this laptop is small.

    python scripts/photos/export.py             # every shoe in chosen.json
    python scripts/photos/export.py red-high    # one shoe

For each shoe:
  public/shoes/<id>-480.webp, -960.webp, -2000.webp   premultiplied while resizing, so no fringe
  public/shoes/<id>-shadow.webp                       blurred-alpha mip chain, stacked in one image
  src/data/photos.ts                       baseline, contact, ledColor, lqip, sizes

Nothing is ever scaled up: a source smaller than a size gets no file at that size.
"""
from __future__ import annotations

import base64
import colorsys
import io
import json
import sys
import time
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
CUT = ROOT / "photos-work" / "cut"
OUT = ROOT / "public" / "shoes"
DATA = ROOT / "src" / "data"
WORK = ROOT / "photos-work"
WIDTHS = (480, 960, 2000)
BUDGET_KB = {960: 70, 2000: 280}
WARM_DEFAULT = "#FFB27A"  # neutral shoes get a warm strip
STATUS = json.loads((Path(__file__).parent / "chosen.json").read_text(encoding="utf8"))
CHOSEN = {s["id"]: s for s in STATUS["shoes"]}
SHADOW_W = 256
SHADOW_LEVELS = 5
SHADOW_PAD = 0.22  # share of the width, so a wide blur has room to reach zero


def premultiplied_resize(rgba: np.ndarray, width: int) -> np.ndarray:
    """Resize with colour weighted by alpha. Straight-alpha resizing pulls in the colour under
    transparent pixels, and that is the fringe this product must not have."""
    if rgba.shape[1] == width:
        return rgba
    h = round(rgba.shape[0] * width / rgba.shape[1])
    arr = rgba.astype(np.float32) / 255
    a = arr[..., 3:4]
    pm = np.dstack([arr[..., :3] * a, a])
    small = cv2.resize(pm, (width, h), interpolation=cv2.INTER_AREA)
    a2 = np.clip(small[..., 3:4], 0, 1)
    rgb = small[..., :3] / np.maximum(a2, 1e-4)
    rgb = np.where(a2 > 1e-4, rgb, 0)
    return np.uint8(np.clip(np.dstack([rgb, a2]) * 255 + 0.5, 0, 255))


def encode(rgba: np.ndarray, fmt: str, quality: int) -> bytes:
    buf = io.BytesIO()
    im = Image.fromarray(rgba, "RGBA")
    if fmt == "WEBP":
        im.save(buf, "WEBP", quality=quality, method=6, alpha_quality=100, exact=False)
    else:
        im.save(buf, "AVIF", quality=quality, speed=4)
    return buf.getvalue()


def fit_budget(rgba: np.ndarray, kb: int | None) -> tuple[bytes, int]:
    """Highest quality that fits the budget, from 92 down, never below 70."""
    for q in (92, 88, 84, 80, 76, 72, 70):
        data = encode(rgba, "WEBP", q)
        if kb is None or len(data) <= kb * 1024:
            return data, q
    return data, 70


def decode_ms(data: bytes, rounds: int = 3) -> float:
    best = 1e9
    for _ in range(rounds):
        t = time.perf_counter()
        Image.open(io.BytesIO(data)).load()
        best = min(best, time.perf_counter() - t)
    return round(best * 1000, 1)


def led_colour(rgba: np.ndarray) -> tuple[str, dict]:
    """The strip's colour: the shoe's own strongest hue, pushed to full strength. Neutral shoes get
    a warm default, because a grey strip would light nothing."""
    small = cv2.resize(rgba, (rgba.shape[1] // 4, rgba.shape[0] // 4), interpolation=cv2.INTER_AREA)
    solid = small[..., 3] > 240
    pixels = small[..., :3][solid].astype(np.float32) / 255
    lab = cv2.cvtColor(pixels[None, ...], cv2.COLOR_RGB2LAB)[0]
    chroma = np.hypot(lab[..., 1], lab[..., 2])
    coloured = chroma > 28
    share = float(coloured.mean())
    info = {"chroma_share": round(share, 3), "chroma_p90": round(float(np.percentile(chroma, 90)), 1)}
    if share < 0.08:
        info["neutral"] = True
        return WARM_DEFAULT, info
    hsv = cv2.cvtColor(pixels[coloured][None, ...], cv2.COLOR_RGB2HSV)[0]
    hist, edges = np.histogram(hsv[..., 0], bins=36, range=(0, 360), weights=hsv[..., 1])
    peak = int(hist.argmax())
    hue = (edges[peak] + edges[peak + 1]) / 2
    r, g, b = colorsys.hsv_to_rgb(hue / 360, 0.86, 1.0)
    info["neutral"] = False
    info["hue"] = round(float(hue), 1)
    return "#%02X%02X%02X" % (round(r * 255), round(g * 255), round(b * 255)), info


def contrast_ink(hex_colour: str) -> str:
    """Pill text on a fill of this colour: whichever of ink or paper passes against it."""
    c = np.array([int(hex_colour[i : i + 2], 16) for i in (1, 3, 5)], np.float32) / 255
    lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    lum = float(lin @ np.array([0.2126, 0.7152, 0.0722]))
    on_dark = (lum + 0.05) / (0.0091 + 0.05)  # against #17161A
    on_light = (0.88 + 0.05) / (lum + 0.05)  # against #F3F1EC
    return "#17161A" if on_dark >= on_light else "#F3F1EC"


def shadow_atlas(alpha: np.ndarray) -> tuple[np.ndarray, dict]:
    """Soft shadows sample this. Each level is smaller and more blurred; together they stack as a
    mip chain, level 0 on top and the rest in a row beneath it."""
    pad = round(SHADOW_W * SHADOW_PAD)
    inner_w = SHADOW_W - 2 * pad
    inner_h = round(alpha.shape[0] * inner_w / alpha.shape[1])
    base = cv2.resize(alpha.astype(np.float32) / 255, (inner_w, inner_h), interpolation=cv2.INTER_AREA)
    base = cv2.copyMakeBorder(base, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=0)
    h0, w0 = base.shape
    levels = []
    for k in range(SHADOW_LEVELS):
        sigma = 2.0 * 2**k  # in level-0 pixels
        blurred = cv2.GaussianBlur(base, (0, 0), sigma)
        # A window so that even the widest blur reaches exactly zero at the border.
        yy, xx = np.mgrid[0:h0, 0:w0]
        edge = np.minimum.reduce([xx, w0 - 1 - xx, yy, h0 - 1 - yy]).astype(np.float32)
        window = np.clip(edge / (pad * 0.5), 0, 1)
        window = window * window * (3 - 2 * window)
        blurred = blurred * window
        w, h = max(1, w0 >> k), max(1, h0 >> k)
        levels.append(cv2.resize(blurred, (w, h), interpolation=cv2.INTER_AREA))
    canvas_h = h0 + (levels[1].shape[0] if len(levels) > 1 else 0)
    canvas = np.zeros((canvas_h, w0), np.float32)
    canvas[:h0, :w0] = levels[0]
    x = 0
    rects = [[0, 0, w0, h0]]
    for lv in levels[1:]:
        canvas[h0 : h0 + lv.shape[0], x : x + lv.shape[1]] = lv
        rects.append([x, h0, lv.shape[1], lv.shape[0]])
        x += lv.shape[1]
    return np.uint8(np.clip(canvas * 255 + 0.5, 0, 255)), {"pad": SHADOW_PAD, "rects": rects, "sigmas": [2 * 2**k for k in range(SHADOW_LEVELS)]}


def contact_range(alpha: np.ndarray) -> list[float]:
    """Where the sole sits near the slab. The shoe was levelled on its two lowest points, but a
    toothed sole touches at single studs, so a strict reading leaves only the heel. Anything within
    1.2% of the shoe's width above the lowest point counts as touching."""
    mask = alpha > 128
    has = mask.any(axis=0)
    h, w = mask.shape
    bottoms = h - 1 - mask[::-1].argmax(axis=0)
    low = bottoms[has].max()
    near = has & (bottoms >= low - 0.012 * w)
    cols = np.flatnonzero(near)
    return [round(float(cols[0]) / w, 4), round(float(cols[-1]) / w, 4)]


def lqip(rgba: np.ndarray) -> str:
    small = premultiplied_resize(rgba, 24)
    for q in (40, 30, 20, 10):
        data = encode(small, "WEBP", q)
        if len(data) < 400:
            break
    return "data:image/webp;base64," + base64.b64encode(data).decode()


def process(name: str, measures: dict) -> dict:
    rgba = np.asarray(Image.open(CUT / f"{name}.png").convert("RGBA"))
    entry = {"id": name, "width": int(rgba.shape[1]), "height": int(rgba.shape[0]), "files": {}, "kb": {}, "quality": {}}
    for width in WIDTHS:
        if rgba.shape[1] < width * 0.9:
            continue
        target = min(width, rgba.shape[1])
        img = premultiplied_resize(rgba, target)
        data, q = fit_budget(img, BUDGET_KB.get(width))
        (OUT / f"{name}-{width}.webp").write_bytes(data)
        entry["files"][str(width)] = f"/shoes/{name}-{width}.webp"
        entry["kb"][str(width)] = round(len(data) / 1024, 1)
        entry["quality"][str(width)] = q
    # What the biggest size really is, when the source is too small for 2000.
    if "2000" not in entry["files"]:
        data, q = fit_budget(rgba, BUDGET_KB[2000])
        (OUT / f"{name}-max.webp").write_bytes(data)
        entry["files"]["max"] = f"/shoes/{name}-max.webp"
        entry["kb"]["max"] = round(len(data) / 1024, 1)
        entry["quality"]["max"] = q

    # Is AVIF worth it? Decode cost at the size the room leans on most.
    probe = premultiplied_resize(rgba, min(960, rgba.shape[1]))
    webp, avif = encode(probe, "WEBP", 84), encode(probe, "AVIF", 60)
    entry["codec"] = {
        "webp_kb": round(len(webp) / 1024, 1), "avif_kb": round(len(avif) / 1024, 1),
        "webp_decode_ms": decode_ms(webp), "avif_decode_ms": decode_ms(avif),
    }

    atlas, layout = shadow_atlas(rgba[..., 3])
    buf = io.BytesIO()
    Image.fromarray(atlas, "L").save(buf, "WEBP", lossless=True, method=6)
    (OUT / f"{name}-shadow.webp").write_bytes(buf.getvalue())
    entry["shadow"] = {"file": f"/shoes/{name}-shadow.webp", "kb": round(len(buf.getvalue()) / 1024, 1), **layout}

    led, led_info = led_colour(rgba)
    entry["ledColor"] = led
    entry["ledInk"] = contrast_ink(led)
    entry["led"] = led_info
    entry["lqip"] = lqip(rgba)
    entry["lqipBytes"] = len(base64.b64decode(entry["lqip"].split(",")[1]))
    for key in ("baseline", "contact", "hue", "lightness", "sole_px", "scale_used"):
        if key in measures:
            entry[key] = measures[key]
    entry["contact"] = contact_range(rgba[..., 3])
    chosen = CHOSEN.get(name, {})
    entry["kind"] = chosen.get("kind", "photo")
    entry["tool"] = chosen.get("tool")
    # The picture's real resolution, before any upscaling: the room's zoom limit reads this.
    small = WORK / "ai-cut" / f"{name}.png"
    entry["trueWidth"] = Image.open(small).width if small.exists() else entry["width"]
    return entry


def write_module(rows: list[dict]) -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    lines = [
        "// Generated by scripts/photos/export.py. Do not edit by hand.",
        "// Real photographs and AI-generated images, each marked by `kind`. See PHOTOS.md for licences and",
        "// terms. None of them is covered by this product's MIT licence.",
        "",
        "export type ShoePhotoData = {",
        "  id: string;",
        "  width: number;",
        "  height: number;",
        "  baseline: number;",
        "  contact: [number, number];",
        "  ledColor: string;",
        "  ledInk: string;",
        "  neutral: boolean;",
        '  kind: "photo" | "ai";',
        "  trueWidth: number;",
        "  lqip: string;",
        "  sizes: Record<string, string>;",
        "  shadow: { file: string; pad: number; rects: number[][] };",
        "};",
        "",
        "export const shoePhotos: ShoePhotoData[] = [",
    ]
    for r in rows:
        sizes = ", ".join(f'"{k}": "{v}"' for k, v in r["files"].items())
        rects = json.dumps(r["shadow"]["rects"], separators=(",", ":"))
        contact = json.dumps(r["contact"], separators=(",", ":"))
        lines += [
            "  {",
            f'    id: "{r["id"]}",',
            f'    width: {r["width"]},',
            f'    height: {r["height"]},',
            f'    baseline: {r["baseline"]},',
            f"    contact: {contact} as [number, number],",
            f'    ledColor: "{r["ledColor"]}",',
            f'    ledInk: "{r["ledInk"]}",',
            f'    neutral: {"true" if r["led"].get("neutral") else "false"},',
            f'    kind: "{r.get("kind", "photo")}",',
            f'    trueWidth: {r.get("trueWidth", r["width"])},',
            f'    lqip: "{r["lqip"]}",',
            f"    sizes: {{ {sizes} }},",
            f'    shadow: {{ file: "{r["shadow"]["file"]}", pad: {r["shadow"]["pad"]}, rects: {rects} }},',
            "  },",
        ]
    lines += ["];", ""]
    (DATA / "photos.ts").write_text("\n".join(lines), encoding="utf8")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    measures = {r["id"]: r for r in json.loads((WORK / "measures.json").read_text(encoding="utf8"))}
    wanted = sys.argv[1:] or sorted(CHOSEN)
    path = WORK / "export.json"
    known = {r["id"]: r for r in json.loads(path.read_text(encoding="utf8"))} if path.exists() else {}
    for name in wanted:
        entry = process(name, measures.get(name, {}))
        known[name] = entry
        slim = {k: entry[k] for k in ("id", "kb", "quality", "codec", "ledColor", "ledInk", "led", "lqipBytes")}
        print(json.dumps(slim), flush=True)
    rows = [known[k] for k in sorted(known) if k in CHOSEN]
    path.write_text(json.dumps(rows, indent=1), encoding="utf8")
    write_module(rows)


if __name__ == "__main__":
    main()
