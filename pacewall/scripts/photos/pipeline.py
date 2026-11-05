#!/usr/bin/env python3
"""Pacewall photo pipeline: a side-view picture in, a shelf-ready cut-out out.

    python scripts/photos/pipeline.py             # every shoe in shoes.json
    python scripts/photos/pipeline.py white-lane  # one shoe

Steps, in order:
  1. cut out: key and graph cut for the shape, closed-form matting for the edge
     (or a local BiRefNet model through rembg, with "method": "birefnet")
  2. clean the edge: pull background colour out of the rim, tighten the alpha
  3. level it: the sole's lowest points at heel and ball of the foot become horizontal
  4. normalise: toe left, same sole length, same margin, gentle exposure match
  5. measure baseline, contact range, hue, lightness

Nothing here invents detail: no upscaling beyond the source, no inpainting.
The one retouch allowed is cloning a small mark away from the same panel, and it
is listed per shoe in shoes.json so PHOTOS.md can report it.

Per-shoe settings in shoes.json:
  source, crop        the file in photos-source/ and the area to work on, in source pixels
  bg, fg              polygons in source pixels that are certainly background or shoe
  split_y             the line where a wall meets a floor, each gets its own colour fit
  key                 "dark" keys on brightness alone, for a light shoe on a dark backdrop
  t_high, t_low       distance from the background that means shoe, or maybe shoe
  weight_l            below 1 ignores brightness, so a soft shadow on the backdrop stays out
  band                width in pixels of the unknown edge the matting solves
  mirror, rotate      toe left, and any rough rotation before levelling
  scale               below 1 keeps a high-top from dominating its neighbours
  clone               small marks to clone away: poly, offset to a clean part of the same panel
  rim_allow           how much brighter than the material inside an outline pixel may be
  desaturate          keep this share of colour, for a neutral shoe lit by a coloured backdrop
  gain                overall exposure
  fill_below          keep holes larger than this (at 1500 px wide): a pull loop is a real hole
  despeckle           remove whiskers on the sole: radius, and the share of the height to start at
  dark_below          below this source line, dark pixels are shadow: y, L
  trust_key           skip the graph cut, for a backdrop that is already pure white
  t_low_below         a lower distance line for a pale sole: y, t
  erase               polygons in the finished picture's pixels to clear, for a shadow beside dark lugs
  plain               a plain studio backdrop: light, dark, chroma. What counts as the shoe is what
                      is lighter, much darker or more colourful than the backdrop. A soft shadow only
                      darkens a little and has no colour of its own, so it stays out.
"""
from __future__ import annotations

import colorsys
import json
import os
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "photos-source"
WORK = ROOT / "photos-work"
OUT = WORK / "cut"
MASKS = WORK / "masks"
for folder in (OUT, MASKS, WORK / "models"):
    folder.mkdir(parents=True, exist_ok=True)
os.environ.setdefault("U2NET_HOME", str(WORK / "models"))

MASTER_SOLE_PX = 2000  # sole length of the master at full size, before any export
MARGIN = 0.04  # share of the sole length kept around the shoe


def load_config() -> list[dict]:
    return json.loads((Path(__file__).parent / "shoes.json").read_text(encoding="utf8"))


def matte(rgb: np.ndarray, shoe: dict, origin: tuple[int, int], cache: Path) -> np.ndarray:
    """Alpha 0..1, cached because the matting takes a minute or two on a CPU.

    The first choice was BiRefNet through rembg. Its model is 973 MB, which at this
    laptop's 38 KB/s would take seven hours. These photographs have plain, known
    backgrounds, where a graph cut plus closed-form matting works at full resolution
    instead of the model's 1024 px. "method": "birefnet" remains for shops that want it.
    """
    if os.environ.get("PW_SHAPE_ONLY"):
        return cut_by_key(rgb, shoe, origin)  # A quick look while tuning: no matting, no cache.
    if cache.exists() and not shoe.get("no_cache"):
        return np.asarray(Image.open(cache).convert("L"), np.float32) / 255
    if shoe.get("method") == "birefnet":
        from rembg import new_session, remove

        session = new_session(shoe.get("model", "birefnet-general"))
        alpha = remove(Image.fromarray(rgb), session=session, only_mask=True, post_process_mask=False)
        alpha.save(cache)
        return np.asarray(alpha.convert("L"), np.float32) / 255
    alpha = cut_by_key(rgb, shoe, origin)
    Image.fromarray((alpha * 255).astype(np.uint8)).save(cache)
    return alpha


def polygons(items, origin, scale, shape) -> np.ndarray:
    mask = np.zeros(shape, np.uint8)
    for poly in items or []:
        pts = np.array([[(x - origin[0]) * scale, (y - origin[1]) * scale] for x, y in poly], np.int32)
        cv2.fillPoly(mask, [pts], 1)
    return mask.astype(bool)


def fit_background(lab: np.ndarray, known: np.ndarray) -> np.ndarray:
    """A smooth second-order surface per channel through pixels known to be background."""
    h, w = lab.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    xn, yn = xx / w, yy / h
    basis = np.stack([np.ones_like(xn), xn, yn, xn * yn, xn**2, yn**2], axis=-1).astype(np.float32)
    picks = np.flatnonzero(known.ravel())
    if picks.size > 60000:
        picks = picks[:: picks.size // 60000]
    design = basis.reshape(-1, 6)[picks]
    out = np.zeros_like(lab)
    for c in range(3):
        coef, *_ = np.linalg.lstsq(design, lab[..., c].ravel()[picks], rcond=None)
        out[..., c] = basis @ coef
    return out


def fill_holes(mask: np.ndarray, shoe: dict, keep: np.ndarray | None = None) -> np.ndarray:
    """Close holes in the shoe's shape. A pull loop or a lace loop is a real hole: a shoe with those
    sets `fill_below`, so only holes smaller than that many pixels are closed, or marks them with a
    `bg` seed, passed here as `keep`, so a hole holding a seed stays open whatever its size."""
    if not shoe.get("fill_holes", True):
        return mask
    filled = ndi.binary_fill_holes(mask)
    parts, count = ndi.label(filled & ~mask)
    if count == 0:
        return mask
    limit = shoe.get("fill_below")
    if limit is None:
        close = np.ones(count, bool)
    else:
        close = np.asarray(ndi.sum(np.ones_like(parts), parts, index=range(1, count + 1))) < limit
    if keep is not None:
        marked = np.unique(parts[keep & (parts > 0)])
        close[marked - 1] = False
    return mask | np.isin(parts, 1 + np.flatnonzero(close))


def despeckle(alpha: np.ndarray, shoe: dict) -> np.ndarray:
    """Remove whiskers and flakes the matting left on the sole. Only below a set height,
    because a lace tip is thin too and belongs to the shoe."""
    rule = shoe.get("despeckle")
    if not rule:
        return alpha
    radius, below = rule["radius"], rule["below"]
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (radius * 2 + 1, radius * 2 + 1))
    body = cv2.morphologyEx((alpha > 0.5).astype(np.uint8), cv2.MORPH_OPEN, kernel)
    body = cv2.dilate(body, np.ones((5, 5), np.uint8)).astype(np.float32)
    body = cv2.GaussianBlur(body, (0, 0), 1.2)
    out = alpha.copy()
    line = int(alpha.shape[0] * below)
    out[line:] = alpha[line:] * np.clip(body[line:], 0, 1)
    return out


def cut_by_key(rgb: np.ndarray, shoe: dict, origin: tuple[int, int]) -> np.ndarray:
    import pymatting

    height, width = rgb.shape[:2]

    # Shape first, at a size a graph cut handles quickly.
    small = min(1.0, 1500 / max(height, width))
    sw, sh = round(width * small), round(height * small)
    low = cv2.resize(rgb, (sw, sh), interpolation=cv2.INTER_AREA)
    lab = cv2.cvtColor(low.astype(np.float32) / 255, cv2.COLOR_RGB2LAB)

    bg_seed = polygons(shoe.get("bg"), origin, small, (sh, sw))
    fg_seed = polygons(shoe.get("fg"), origin, small, (sh, sw))
    ring = np.zeros((sh, sw), bool)
    t = max(3, sh // 250)
    ring[:t] = ring[-t:] = True
    ring[:, :t] = ring[:, -t:] = True

    # Distance from the background colour. A wall and a floor each get their own fit.
    weight_l = shoe.get("weight_l", 1.0)
    split = shoe.get("split_y")
    distance = np.zeros((sh, sw), np.float32)
    zones = [(0, sh)]
    if split is not None:
        cut = int((split - origin[1]) * small)
        zones = [(0, cut), (cut, sh)]
    for y0, y1 in zones:
        part = lab[y0:y1]
        known = (ring | bg_seed)[y0:y1] & ~fg_seed[y0:y1]
        model = fit_background(part, known)
        delta = part - model
        distance[y0:y1] = np.sqrt((weight_l * delta[..., 0]) ** 2 + delta[..., 1] ** 2 + delta[..., 2] ** 2)
    if shoe.get("key") == "dark":
        # A shoe on a dark, hazy backdrop: brightness says it better than any fitted colour.
        distance = lab[..., 0]

    t_high, t_low = shoe.get("t_high", 30), shoe.get("t_low", 12)
    sure_fg = ndi.binary_erosion(distance > t_high, iterations=2) & ~bg_seed
    sure_fg = fill_holes(sure_fg, shoe)
    sure_fg = (sure_fg | fg_seed) & ~bg_seed

    if shoe.get("plain"):
        rule = shoe["plain"]
        thick = np.zeros((sh, sw), bool)
        margin = rule.get("margin", 18)
        thick[:margin] = thick[-margin:] = True
        thick[:, :margin] = thick[:, -margin:] = True
        model = fit_background(lab, (thick | bg_seed) & ~fg_seed)
        delta = lab - model
        chroma = np.hypot(delta[..., 1], delta[..., 2])
        shape = (delta[..., 0] > rule["light"]) | (delta[..., 0] < -rule["dark"]) | (chroma > rule["chroma"])
        # Under the sole the backdrop carries the shoe's shadow: there it takes more to count as shoe.
        low = rule.get("below")
        if low:
            line = int((low["y"] - origin[1]) * small)
            shape[line:] = (
                (delta[line:, :, 0] > low.get("light", rule["light"]))
                | (delta[line:, :, 0] < -low.get("dark", rule["dark"]))
                | (chroma[line:] > low.get("chroma", rule["chroma"]))
            )
        shape = ndi.binary_opening(shape, iterations=rule.get("open", 1))
        shape = (shape | fg_seed) & ~bg_seed
    elif shoe.get("trust_key"):
        # A backdrop already pure white: a graph cut would give white lugs to the background.
        # JPEG ringing around a dark upper needs a higher line than a pale sole does.
        mask = distance > t_low
        low_rule = shoe.get("t_low_below")
        if low_rule:
            line = int((low_rule["y"] - origin[1]) * small)
            mask[line:] = distance[line:] > low_rule["t"]
        shape = ndi.binary_opening(mask, iterations=1) | fg_seed
    else:
        labels = np.where(distance > t_low, cv2.GC_PR_FGD, cv2.GC_PR_BGD).astype(np.uint8)
        labels[ring | bg_seed] = cv2.GC_BGD
        labels[sure_fg] = cv2.GC_FGD
        cv2.grabCut(
            cv2.cvtColor(low, cv2.COLOR_RGB2BGR),
            labels,
            None,
            np.zeros((1, 65)),
            np.zeros((1, 65)),
            shoe.get("gc_iter", 4),
            cv2.GC_INIT_WITH_MASK,
        )
        shape = (labels == cv2.GC_FGD) | (labels == cv2.GC_PR_FGD)
    parts, count = ndi.label(shape)
    if count > 1:
        sizes = ndi.sum(shape, parts, index=range(1, count + 1))
        shape = parts == 1 + int(np.argmax(sizes))
    shape = fill_holes(shape, shoe, keep=bg_seed)
    if os.environ.get("PW_SHAPE_ONLY"):
        return cv2.resize(shape.astype(np.float32), (width, height), interpolation=cv2.INTER_LINEAR)

    # Edge second, at working size: only a narrow band around the shape is unknown.
    work = min(1.0, shoe.get("work_w", 3200) / width)
    ww, wh = round(width * work), round(height * work)
    image = cv2.resize(rgb, (ww, wh), interpolation=cv2.INTER_AREA if work < 1 else cv2.INTER_LINEAR)
    solid = cv2.resize(shape.astype(np.uint8), (ww, wh), interpolation=cv2.INTER_LINEAR) > 0
    band = shoe.get("band", 9)
    inside = ndi.binary_erosion(solid, iterations=band)
    outside = ~ndi.binary_dilation(solid, iterations=band)
    # Seeds are certain: the matting may not undo them.
    inside |= polygons(shoe.get("fg"), origin, work, (wh, ww))
    trimap = np.full((wh, ww), 0.5, np.float64)
    trimap[inside] = 1.0
    trimap[outside] = 0.0

    alpha = pymatting.estimate_alpha_cf(
        image.astype(np.float64) / 255,
        trimap,
        laplacian_kwargs={"epsilon": 1e-6},
    )
    alpha = np.clip(alpha, 0, 1).astype(np.float32)
    interpolation = cv2.INTER_LINEAR if work < 1 else cv2.INTER_AREA
    alpha = cv2.resize(alpha, (width, height), interpolation=interpolation)

    # A pale sole on a dark floor: anything dark below this line is the shadow, never the shoe.
    rule = shoe.get("dark_below")
    if rule:
        line = int(rule["y"] - origin[1])
        lightness = cv2.cvtColor(rgb.astype(np.float32) / 255, cv2.COLOR_RGB2LAB)[..., 0]
        gate = np.clip((lightness - rule["L"]) / 12, 0, 1)
        alpha[line:] *= gate[line:]
    return alpha


def keep_largest(alpha: np.ndarray) -> np.ndarray:
    labels, n = ndi.label(alpha > 0.5)
    if n <= 1:
        return alpha
    sizes = ndi.sum(np.ones_like(labels), labels, index=range(1, n + 1))
    keep = 1 + int(np.argmax(sizes))
    grown = ndi.binary_dilation(labels == keep, iterations=6)
    return alpha * grown


def clean_edge(rgb: np.ndarray, alpha: np.ndarray, tighten: float, rim_allow: float) -> tuple[np.ndarray, np.ndarray]:
    """Remove the old background from rim pixels, so no fringe shows on either wall.

    The colour comes from a multi-level foreground estimate, then leans on the material
    just inside the shoe. `rim_allow` caps how much brighter an outline pixel may be than
    that material: a pale rim on a dark shoe is the halo that shows on the dark wall.
    """
    import pymatting

    a = np.clip((np.clip(alpha, 0, 1) - tighten) / (1 - tighten), 0, 1)
    foreground = pymatting.estimate_foreground_ml(rgb.astype(np.float64) / 255, a.astype(np.float64)) * 255

    interior = ndi.binary_erosion(a > 0.985, iterations=2)
    if interior.sum() < 100:
        interior = a > 0.9
    indices = ndi.distance_transform_edt(~interior, return_distances=False, return_indices=True)
    inner = rgb[indices[0], indices[1]].astype(np.float32)

    out = foreground.astype(np.float32)
    rim = a < 0.985
    out[rim] = 0.55 * out[rim] + 0.45 * inner[rim]
    near_edge = ~interior
    capped = np.minimum(out, inner + rim_allow)
    out[near_edge] = capped[near_edge]
    return np.clip(out, 0, 255).astype(np.uint8), a


def sole_tilt(alpha: np.ndarray) -> float:
    """Angle of the line through the lowest points at heel and ball of the foot."""
    mask = alpha > 0.5
    xs = np.where(mask.any(axis=0))[0]
    x0, x1 = xs[0], xs[-1]
    w = x1 - x0
    lows: list[tuple[float, float]] = []
    for lo, hi in ((0.10, 0.42), (0.62, 0.92)):
        col_a, col_b = int(x0 + lo * w), int(x0 + hi * w)
        bottoms = [(c, np.where(mask[:, c])[0][-1]) for c in range(col_a, col_b) if mask[:, c].any()]
        c, y = max(bottoms, key=lambda p: p[1])
        lows.append((float(c), float(y)))
    (xa, ya), (xb, yb) = lows
    return float(np.degrees(np.arctan2(yb - ya, xb - xa)))


def rotate(image: np.ndarray, angle: float, interp=cv2.INTER_CUBIC) -> np.ndarray:
    h, w = image.shape[:2]
    m = cv2.getRotationMatrix2D((w / 2, h / 2), angle, 1.0)
    cos, sin = abs(m[0, 0]), abs(m[0, 1])
    nw, nh = int(h * sin + w * cos), int(h * cos + w * sin)
    m[0, 2] += nw / 2 - w / 2
    m[1, 2] += nh / 2 - h / 2
    return cv2.warpAffine(image, m, (nw, nh), flags=interp, borderMode=cv2.BORDER_CONSTANT, borderValue=0)


def measure(alpha: np.ndarray, rgb: np.ndarray) -> dict:
    h, w = alpha.shape
    mask = alpha > 0.5
    ys, _ = np.where(mask)
    bottom = int(ys.max())
    baseline = (bottom + 1) / h
    band = mask[max(0, bottom - max(3, h // 160)) : bottom + 1].any(axis=0)
    cols = np.where(band)[0]
    contact = (round(float(cols[0] / w), 4), round(float(cols[-1] / w), 4))
    solid = alpha > 0.95
    pixels = rgb[solid].astype(np.float32) / 255
    sat_weight = pixels.max(1) - pixels.min(1) + 1e-3
    mean = (pixels * sat_weight[:, None]).sum(0) / sat_weight.sum()
    hue, _, _ = colorsys.rgb_to_hsv(*mean)
    lum = 0.2126 * pixels[:, 0] + 0.7152 * pixels[:, 1] + 0.0722 * pixels[:, 2]
    return {
        "width": w,
        "height": h,
        "baseline": round(baseline, 4),
        "contact": contact,
        "hue": round(float(hue) * 360, 1),
        "lightness": round(float(np.median(lum)), 3),
    }


def clone_patch(rgb: np.ndarray, retouch: dict, origin: tuple[int, int]) -> np.ndarray:
    """Copy a same-panel patch over a small mark with a feathered edge (no AI, no inpainting)."""
    poly = np.array([[x - origin[0], y - origin[1]] for x, y in retouch["poly"]], np.int32)
    dx, dy = retouch["offset"]

    h, w = rgb.shape[:2]
    # Sample the panel the offset points at, so the mark's place takes that panel's grain.
    shifted = cv2.warpAffine(
        rgb,
        np.float32([[1, 0, -dx], [0, 1, -dy]]),
        (w, h),
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_REPLICATE,
    )
    # A plain feather left the mark's shape as a pale ghost, because the panel's light differs
    # by a few levels from one place to the next. Poisson blending keeps the grain of the
    # sampled leather and takes its brightness from the edge of the hole.
    mask = np.zeros((h, w), np.uint8)
    cv2.fillPoly(mask, [poly], 255)
    x, y, bw, bh = cv2.boundingRect(poly)
    return cv2.seamlessClone(shifted, rgb, mask, (x + bw // 2, y + bh // 2), cv2.NORMAL_CLONE)


def process(shoe: dict) -> dict:
    name = shoe["id"]
    rgb = np.asarray(Image.open(SRC / shoe["source"]).convert("RGB"))
    print(f"{name}: source {rgb.shape[1]}x{rgb.shape[0]}", flush=True)

    origin = (shoe["crop"][0], shoe["crop"][1]) if shoe.get("crop") else (0, 0)
    if shoe.get("crop"):
        x0, y0, x1, y1 = shoe["crop"]
        rgb = rgb[y0:y1, x0:x1]

    for retouch in shoe.get("clone", []):
        rgb = clone_patch(rgb, retouch, origin)

    alpha = despeckle(keep_largest(matte(rgb, shoe, origin, MASKS / f"{name}.png")), shoe)
    clean, alpha = clean_edge(rgb, alpha, shoe.get("tighten", 0.03), shoe.get("rim_allow", 36))

    if shoe.get("mirror"):
        clean, alpha = clean[:, ::-1], alpha[:, ::-1]

    rgba = np.dstack([clean, (alpha * 255).astype(np.uint8)])
    rough = shoe.get("rotate", 0.0)
    if rough:
        rgba = rotate(rgba, rough)
    tilt = sole_tilt(rgba[..., 3].astype(np.float32) / 255)
    rgba = rotate(rgba, tilt)
    print(f"  levelled by {tilt:+.2f} deg (plus {rough:+.2f} by hand)", flush=True)

    mask = rgba[..., 3] > 128
    ys, xs = np.where(mask)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    sole_len = x1 - x0 + 1
    target = MASTER_SOLE_PX * shoe.get("scale", 1.0)
    factor = min(target / sole_len, 1.0)  # never above the source: no invented detail

    # Tight to the shoe first, then pad on a canvas whose width follows the full sole length.
    # Every photo then has the same proportions: draw them at one width and the soles match,
    # and a high-top with a `scale` below 1 comes out smaller by exactly that.
    rgba = rgba[y0 : y1 + 1, x0 : x1 + 1]
    if factor < 1:
        size = (round(rgba.shape[1] * factor), round(rgba.shape[0] * factor))
        rgba = np.asarray(Image.fromarray(rgba).resize(size, Image.LANCZOS))
    full_sole = rgba.shape[1] / shoe.get("scale", 1.0)
    canvas_w = round(full_sole * (1 + 2 * MARGIN))
    pad_x = canvas_w - rgba.shape[1]
    pad_y = round(MARGIN * full_sole)
    rgba = np.pad(
        rgba,
        ((pad_y, pad_y), (pad_x // 2, pad_x - pad_x // 2), (0, 0)),
        mode="constant",
        constant_values=0,
    )

    # A floor shadow that is as dark as the lugs beside it: traced by hand in the finished picture.
    if shoe.get("erase"):
        keep = np.ones(rgba.shape[:2], np.float32)
        for poly in shoe["erase"]:
            cv2.fillPoly(keep, [np.array(poly, np.int32)], 0.0)
        keep = cv2.GaussianBlur(keep, (0, 0), 0.8)
        rgba = rgba.copy()
        rgba[..., 3] = (rgba[..., 3] * keep).astype(np.uint8)

    final_rgb = rgba[..., :3]
    final_alpha = rgba[..., 3].astype(np.float32) / 255

    gain = shoe.get("gain", 1.0)
    if gain != 1.0:
        final_rgb = np.clip(final_rgb.astype(np.float32) * gain, 0, 255).astype(np.uint8)

    # A coloured backdrop bounces light onto a neutral shoe. This is white balance for one
    # material, not a change of colour: only for a shoe that is itself black and white.
    keep = shoe.get("desaturate")
    if keep is not None:
        lab = cv2.cvtColor(final_rgb.astype(np.float32) / 255, cv2.COLOR_RGB2LAB)
        lab[..., 1:] *= keep
        final_rgb = (np.clip(cv2.cvtColor(lab, cv2.COLOR_LAB2RGB), 0, 1) * 255).astype(np.uint8)

    Image.fromarray(np.dstack([final_rgb, rgba[..., 3]])).save(OUT / f"{name}.png", optimize=True)
    info = measure(final_alpha, final_rgb)
    info.update(id=name, sole_px=int((final_alpha > 0.5).any(axis=0).sum()), scale_used=round(factor, 3))
    print("  ", info, flush=True)
    return info


def main() -> None:
    wanted = set(sys.argv[1:])
    results = []
    for shoe in load_config():
        if wanted and shoe["id"] not in wanted:
            continue
        results.append(process(shoe))
    path = WORK / "measures.json"
    known = {}
    if path.exists():
        known = {r["id"]: r for r in json.loads(path.read_text(encoding="utf8"))}
    known.update({r["id"]: r for r in results})
    path.write_text(json.dumps(list(known.values()), indent=1), encoding="utf8")


if __name__ == "__main__":
    main()
