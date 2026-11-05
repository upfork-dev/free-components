#!/usr/bin/env python3
"""The P0 gate: docs/photos-sheet-night.png and docs/photos-sheet-day.png, plus half-size copies.

Every chosen shoe at shelf size and at focus size, at 100%, composited in linear light as the room's
shader will. Each row says whether it is a real photograph or AI-generated. An upscaled picture also
shows a before and after at 100%. Then the shoes not chosen, small, and the wall photographs under the
theme's colour. No lighting here: this judges cut-outs, not the room.

The canvas stays in 8 bits and each shoe is composited on its own, because a float canvas of this size
would take over 300 MB on a laptop that other jobs share.

    python scripts/photos/make_sheets.py
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

Image.MAX_IMAGE_PIXELS = None
ROOT = Path(__file__).resolve().parents[2]
CUT = ROOT / "photos-work" / "cut"
AI_CUT = ROOT / "photos-work" / "ai-cut"
WALLS = ROOT / "photos-work" / "wall"
DOCS = ROOT / "docs"
DOCS.mkdir(exist_ok=True)
STATUS = json.loads((Path(__file__).parent / "chosen.json").read_text(encoding="utf8"))
EXPORT = {r["id"]: r for r in json.loads((ROOT / "photos-work" / "export.json").read_text(encoding="utf8"))}

THEMES = {
    "night": {"wall": (0x14, 0x13, 0x16), "ink": (0xF3, 0xF1, 0xEC), "muted": (0xA9, 0xA6, 0xA0), "title": "Night wall #141316", "wall_gain": 3.2, "ai": (0xFF, 0xB2, 0x7A)},
    "day": {"wall": (0xDE, 0xDA, 0xD1), "ink": (0x17, 0x16, 0x1A), "muted": (0x5E, 0x5C, 0x57), "title": "Day wall #DEDAD1", "wall_gain": 1.0, "ai": (0xA8, 0x45, 0x0C)},
}
SHELF_W = 280  # one shoe at 1440 x 900 with five columns
FOCUS_W = 2000  # what the room asks for in focus; smaller sources stay at their true size
GAP = 60
WIDTH = GAP + SHELF_W + GAP + FOCUS_W + GAP
WALL_H = 620
BA_W, BA_H = 1000, 520  # before and after crops, side by side at 100%
THUMB_W = 500
HEADER = 300


def font(size: int, bold: bool = False):
    for name in (("arialbd.ttf",) if bold else ()) + ("arial.ttf", "segoeui.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


def to_lin(c: np.ndarray) -> np.ndarray:
    c = c.astype(np.float32) / 255
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def to_srgb(c: np.ndarray) -> np.ndarray:
    c = np.clip(c, 0, 1)
    return np.uint8(255 * np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055) + 0.5)


def scaled(shoe: Image.Image, width: int) -> Image.Image:
    """Scale so the cut's width becomes `width`, premultiplied, never above 100%."""
    if width >= shoe.width:
        return shoe
    arr = np.asarray(shoe, np.float32) / 255
    a = arr[..., 3:4]
    pm = Image.fromarray(np.uint8(np.dstack([arr[..., :3] * a, a]) * 255 + 0.5), "RGBA")
    h = round(shoe.height * width / shoe.width)
    small = np.asarray(pm.resize((width, h), Image.LANCZOS), np.float32) / 255
    a2 = np.clip(small[..., 3:4], 0, 1)
    rgb = np.where(a2 > 1e-3, small[..., :3] / np.maximum(a2, 1e-3), 0)
    return Image.fromarray(np.uint8(np.clip(np.dstack([rgb, a2]) * 255 + 0.5, 0, 255)), "RGBA")


def over(canvas: Image.Image, shoe: Image.Image, x: int, y: int) -> None:
    """Composite one shoe onto the canvas in linear light."""
    box = (x, y, x + shoe.width, y + shoe.height)
    under = to_lin(np.asarray(canvas.crop(box), np.float32))
    arr = np.asarray(shoe, np.float32) / 255
    a = arr[..., 3:4]
    done = to_lin(arr[..., :3] * 255) * a + under * (1 - a)
    canvas.paste(Image.fromarray(to_srgb(done)), (x, y))


def wall_strip(tag: str, theme: dict, width: int, height: int) -> Image.Image | None:
    path = WALLS / f"{tag}-albedo.webp"
    if not path.exists():
        return None
    im = Image.open(path).convert("RGB")
    # Cut from the wall's middle, so the sheet shows what the room would use.
    h = round(im.width * height / width)
    top = (im.height - h) // 2
    im = im.crop((0, top, im.width, top + h)).resize((width, height), Image.BICUBIC)
    ratio = np.asarray(im, np.float32) / 255 * 2
    base = to_lin(np.array(theme["wall"], np.float32)) * theme["wall_gain"]
    return Image.fromarray(to_srgb(ratio * base))


def upscaled(name: str) -> bool:
    before = AI_CUT / f"{name}.png"
    if not before.exists():
        return False
    return Image.open(CUT / f"{name}.png").width > Image.open(before).width * 1.5


def build(theme_name: str) -> Path:
    theme = THEMES[theme_name]
    shoes = sorted(STATUS["shoes"], key=lambda s: s["order"])
    tops = {}
    y = HEADER
    for s in shoes:
        im = Image.open(CUT / f'{s["id"]}.png')
        fw = min(FOCUS_W, im.width)
        fh = round(im.height * fw / im.width)
        tops[s["id"]] = (y, fw, fh, im.width)
        y += 60 + fh + (BA_H + 70 if upscaled(s["id"]) else 0) + 110
    reserve_y = y
    reserve = STATUS.get("reserve", [])
    rows = (len(reserve) + 3) // 4
    y += 70 + rows * 360
    wall_y = y
    walls = STATUS.get("walls", [])
    y += (WALL_H + 100) * len(walls) + GAP

    canvas = Image.new("RGB", (WIDTH, y), theme["wall"])
    d = ImageDraw.Draw(canvas)
    ink, muted, ai = theme["ink"], theme["muted"], theme["ai"]
    d.text((GAP, 40), f'Floodlit, contact sheet: {theme["title"]}', fill=ink, font=font(44, True))
    for i, line in enumerate(STATUS.get("summary", [])):
        d.text((GAP, 110 + i * 40), line, fill=(ai if i == 1 else ink if i == 0 else muted), font=font(28))

    sample = None
    for s in shoes:
        name = s["id"]
        top, fw, fh, full_w = tops[name]
        im = Image.open(CUT / f"{name}.png").convert("RGBA")
        over(canvas, scaled(im, FOCUS_W), GAP + SHELF_W + GAP, top + 60)
        shelf = scaled(im, SHELF_W)
        over(canvas, shelf, GAP, top + 60)
        if name == "court-panel":
            sample = scaled(im, 760)
        e = EXPORT.get(name, {})
        d.text((GAP, top - 16), f'{name}: {s["verdict"]}', fill=ai if s["kind"] == "ai" else ink, font=font(32, True))
        note = f'Shown {fw} px wide at 100%. Strip colour {e.get("ledColor", "?")}. {s.get("note", "")}'
        d.text((GAP, top + 24), note, fill=muted, font=font(24))
        led = e.get("ledColor")
        if led:
            yy = top + 60 + shelf.height + 24
            d.rounded_rectangle((GAP, yy, GAP + SHELF_W, yy + 16), 8, fill=led)
        if upscaled(name):
            # A crop at the same place in both, at the size the room would show it.
            small = Image.open(AI_CUT / f"{name}.png").convert("RGBA")
            before = small.resize(im.size, Image.BICUBIC)
            x0 = int(im.width * 0.42)
            y0 = max(0, int(im.height * 0.28))
            by = top + 60 + fh + 50
            bx = GAP + SHELF_W + GAP
            d.text((bx, by - 34), "Before: plain scaling, no model", fill=muted, font=font(24))
            d.text((bx + BA_W + 20, by - 34), "After: Real-ESRGAN mixed with plain scaling (invents fine detail)", fill=muted, font=font(24))
            for k, pic in enumerate((before, im)):
                over(canvas, pic.crop((x0, y0, x0 + BA_W - 10, y0 + BA_H)), bx + k * (BA_W + 20), by)
        del im

    d.text((GAP, reserve_y), "Not chosen, small, to swap in if you prefer:", fill=ink, font=font(32, True))
    for i, r in enumerate(reserve):
        src = CUT / f'{r["id"]}.png'
        if not src.exists():
            src = AI_CUT / f'{r["id"]}.png'
        im = scaled(Image.open(src).convert("RGBA"), THUMB_W)
        x = GAP + (i % 4) * (THUMB_W + 50)
        yy = reserve_y + 60 + (i // 4) * 360
        over(canvas, im, x, yy + 34)
        d.text((x, yy), f'{r["id"]}: {r["note"]}', fill=ai if r["kind"] == "ai" else ink, font=font(21))

    for n, w in enumerate(walls):
        top = wall_y + n * (WALL_H + 100)
        d.text((GAP, top), f'Wall {w["label"]}', fill=ink, font=font(30, True))
        strip = wall_strip(w["tag"], theme, WIDTH - 2 * GAP, WALL_H)
        if strip is not None:
            canvas.paste(strip, (GAP, top + 50))
            if sample is not None:
                over(canvas, sample, (WIDTH - sample.width) // 2, top + 50 + WALL_H - sample.height - 30)

    path = DOCS / f"photos-sheet-{theme_name}.png"
    canvas.save(path, optimize=True)
    # A copy small enough to reach a phone: the upload limit is 8000 px on the long side.
    factor = min(0.5, 7900 / canvas.height)
    half = canvas.resize((round(canvas.width * factor), round(canvas.height * factor)), Image.LANCZOS)
    half_path = DOCS / f"photos-sheet-{theme_name}-half.png"
    half.save(half_path, optimize=True)
    print(path, canvas.size, path.stat().st_size // 1024, "KB; half", half.size, half_path.stat().st_size // 1024, "KB", flush=True)
    return path


def main() -> None:
    for name in THEMES:
        build(name)


if __name__ == "__main__":
    main()
