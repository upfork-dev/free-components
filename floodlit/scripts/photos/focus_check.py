#!/usr/bin/env python3
"""The focus-size check Floodlit asks of each cut-out, stricter than a catalogue's.

For one shoe at a time (this laptop is small):
- real source resolution: how sharp the picture is at its 2000 px focus size,
- edge fringe in numbers on the night and day walls,
- a sheet of 100% crops along the outline on both walls, to look at.

Usage: focus_check.py <cut.png> <out-dir> [--source-long-side N]
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

NIGHT = np.array([0x14, 0x13, 0x16], dtype=np.float32)
DAY = np.array([0xDE, 0xDA, 0xD1], dtype=np.float32)
LUMA = np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)


def srgb_to_linear(c: np.ndarray) -> np.ndarray:
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def linear_to_srgb(c: np.ndarray) -> np.ndarray:
    c = np.clip(c, 0, 1)
    return 255.0 * np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


def over(rgb: np.ndarray, alpha: np.ndarray, wall: np.ndarray) -> np.ndarray:
    """Composite in linear light, as the room's shader will."""
    a = alpha[..., None]
    return linear_to_srgb(srgb_to_linear(rgb) * a + srgb_to_linear(wall) * (1 - a))


def fringe(rgb: np.ndarray, alpha: np.ndarray) -> dict:
    """Compare the outline band with the shoe just inside it.

    A pale fringe shows on the night wall, a dark one on the day wall. The band is the
    partly transparent pixels. The reference is the median-free mean of solid pixels 4
    to 10 px inside, so a shoe with a really pale sole does not count against itself.
    """
    solid = alpha > 0.98
    dist = ndi.distance_transform_edt(solid)
    inner = (dist >= 4) & (dist <= 10)
    size = 21
    mask = inner.astype(np.float32)
    weight = ndi.uniform_filter(mask, size)
    luma = rgb @ LUMA
    ref = ndi.uniform_filter(luma * mask, size) / np.maximum(weight, 1e-4)
    band = (alpha > 0.15) & (alpha < 0.98) & (weight > 1e-3)
    rim = (dist >= 1) & (dist <= 2) & (weight > 1e-3)
    out = {}
    for name, m in (("band", band), ("rim", rim)):
        diff = luma[m] - ref[m]
        out[f"{name}_px"] = int(m.sum())
        out[f"{name}_pale_over36"] = round(float((diff > 36).mean()) * 100, 2) if m.any() else 0.0
        out[f"{name}_dark_over36"] = round(float((diff < -36).mean()) * 100, 2) if m.any() else 0.0
    out["band_width_px"] = round(float(band.sum()) / max(1.0, float(ndi.binary_erosion(alpha > 0.5, iterations=1).sum() ** 0.5 * 4)), 2)
    return out


def sharpness(rgb: np.ndarray, alpha: np.ndarray) -> dict:
    """How much real detail the picture holds at this size, inside the shoe only."""
    solid = ndi.binary_erosion(alpha > 0.98, iterations=12)
    luma = rgb @ LUMA
    lap = ndi.laplace(luma)
    half = ndi.zoom(luma, 0.5, order=1)
    lap_half = ndi.laplace(half)
    half_solid = ndi.zoom(solid.astype(np.float32), 0.5, order=1) > 0.99
    full = float(lap[solid].var())
    low = float(lap_half[half_solid].var())
    # 1 means full-size detail as strong as half-size detail; a soft picture scores far below.
    return {"laplacian_var": round(full, 1), "laplacian_var_half": round(low, 1), "detail_ratio": round(full / max(low, 1e-3), 3)}


def edge_crops(alpha: np.ndarray, size: int) -> list[tuple[str, int, int]]:
    """Six crops centred on the outline: toe, heel, top, sole, and the two busiest edges."""
    h, w = alpha.shape
    ys, xs = np.where(alpha > 0.5)
    band = (alpha > 0.1) & (alpha < 0.9)
    by, bx = np.where(band)
    def nearest(x, y):
        i = int(np.argmin((bx - x) ** 2 + (by - y) ** 2))
        return int(bx[i]), int(by[i])
    picks = [
        ("toe", *nearest(xs.min(), ys.max() - (ys.max() - ys.min()) // 5)),
        ("heel", *nearest(xs.max(), ys.min() + (ys.max() - ys.min()) // 2)),
        ("top", *nearest(int(np.mean(xs[ys == ys.min()])), ys.min())),
        ("sole", *nearest((xs.min() + xs.max()) // 2, ys.max())),
    ]
    # Where the outline is most complicated (laces, loops): the densest part of the band.
    density = ndi.uniform_filter(band.astype(np.float32), size // 2)
    for name in ("busy-1", "busy-2"):
        y, x = np.unravel_index(int(np.argmax(density)), density.shape)
        picks.append((name, int(x), int(y)))
        density[max(0, y - size):y + size, max(0, x - size):x + size] = 0
    out = []
    for name, x, y in picks:
        out.append((name, int(np.clip(x - size // 2, 0, max(0, w - size))), int(np.clip(y - size // 2, 0, max(0, h - size)))))
    return out


def sheet(rgb: np.ndarray, alpha: np.ndarray, path: Path, title: str, size: int = 420) -> None:
    crops = edge_crops(alpha, size)
    gap = 8
    cols = 6
    W = cols * size + (cols + 1) * gap
    H = 2 * size + 3 * gap + 24
    canvas = Image.new("RGB", (W, H), (70, 70, 70))
    draw = ImageDraw.Draw(canvas)
    draw.text((gap, 6), title, fill=(255, 255, 255))
    for row, wall in enumerate((NIGHT, DAY)):
        for col, (name, x, y) in enumerate(crops):
            crop_rgb = rgb[y:y + size, x:x + size]
            crop_a = alpha[y:y + size, x:x + size]
            comp = over(crop_rgb, crop_a, wall)
            im = Image.fromarray(np.uint8(np.clip(comp + 0.5, 0, 255)))
            px, py = gap + col * (size + gap), 24 + gap + row * (size + gap)
            canvas.paste(im, (px, py))
            draw.text((px + 4, py + 4), name, fill=(255, 200, 80) if row == 0 else (150, 60, 0))
    canvas.save(path, optimize=True)


def main() -> None:
    cut = Path(sys.argv[1])
    out = Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    name = cut.stem
    im = Image.open(cut).convert("RGBA")
    arr = np.asarray(im, dtype=np.float32)
    rgb, alpha = arr[..., :3], arr[..., 3] / 255.0
    result = {"id": name, "size": list(im.size), **sharpness(rgb, alpha), **fringe(rgb, alpha)}
    sheet(rgb, alpha, out / f"{name}-crops.png", f"{name} {im.size[0]}x{im.size[1]}: 100% crops, night wall above, day wall below")
    print(json.dumps(result))


if __name__ == "__main__":
    main()
