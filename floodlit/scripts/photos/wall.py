#!/usr/bin/env python3
"""The wall: one real plaster photograph in, the maps the room needs out.

    python scripts/photos/wall.py <wall-source.jpg> [--height <height-map.jpg>] [--tag name] [--out public/wall]

Outputs, all from the photograph and nothing invented:
  albedo.webp   the plaster's own light and dark as a ratio around 1, nearly neutral. The room's
                night and day colours multiply it, so one image serves both themes.
  normal.webp   relief. From the measured height map when the source has one, otherwise derived
                from the photograph's luminance. Stored as RG in tangent space.
  detail.webp   a small tile for close range, high frequencies only, and it repeats invisibly.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
ROOT = Path(__file__).resolve().parents[2]


def to_linear(c: np.ndarray) -> np.ndarray:
    c = c.astype(np.float32) / 255
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def wide_blur(img: np.ndarray, sigma: float) -> np.ndarray:
    """A very wide Gaussian on a full-size picture costs minutes, because the kernel is thousands
    of pixels long. Blur a small copy instead: at this width nothing fine survives anyway."""
    h, w = img.shape[:2]
    factor = max(1, int(sigma / 4))
    small = cv2.resize(img, (max(8, w // factor), max(8, h // factor)), interpolation=cv2.INTER_AREA)
    small = cv2.GaussianBlur(small, (0, 0), sigma / factor)
    return cv2.resize(small, (w, h), interpolation=cv2.INTER_CUBIC)


def ratio_map(rgb: np.ndarray, keep_colour: float) -> tuple[np.ndarray, dict]:
    """The plaster's variation as a ratio around 1, measured in linear light."""
    linear = to_linear(rgb)
    luma = linear @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    mean = float(luma.mean())
    ratio = luma / mean
    # Very wide, slow changes across the whole picture are the shoot's light, not the wall's.
    wide = wide_blur(ratio, rgb.shape[1] / 5)
    flat = ratio / np.maximum(wide, 1e-3)
    tint = linear / np.maximum(luma[..., None], 1e-3)
    tint_mean = tint.reshape(-1, 3).mean(axis=0)
    tint = tint_mean + (tint - tint_mean) * keep_colour
    out = flat[..., None] * (tint / tint_mean)
    stats = {
        "mean": mean,
        "p01": float(np.percentile(flat, 1)),
        "p50": float(np.percentile(flat, 50)),
        "p99": float(np.percentile(flat, 99)),
        "low_freq_std": float(wide_blur(flat, rgb.shape[1] / 64).std()),
    }
    return out.astype(np.float32), stats


def encode_ratio(ratio: np.ndarray) -> np.ndarray:
    """Ratio 0..2 stored in 8 bits. Linear, so the shader decodes it with one multiply."""
    return np.uint8(np.clip(ratio / 2 * 255 + 0.5, 0, 255))


def normal_from_height(height: np.ndarray, slope_p99: float, wrap: bool = False) -> np.ndarray:
    """A real wall has no fixed relief in these units, so the strength is set from the data:
    the steepest 1% of the surface leans by `slope_p99`. The shader scales it further.
    A tile needs `wrap`: the default border reflects, which flattens a line along every seam."""
    source = cv2.copyMakeBorder(height, 2, 2, 2, 2, cv2.BORDER_WRAP) if wrap else height
    gx = cv2.Sobel(source, cv2.CV_32F, 1, 0, ksize=3) / 8
    gy = cv2.Sobel(source, cv2.CV_32F, 0, 1, ksize=3) / 8
    if wrap:
        gx, gy = gx[2:-2, 2:-2], gy[2:-2, 2:-2]
    strength = slope_p99 / max(float(np.percentile(np.hypot(gx, gy), 99)), 1e-6)
    nx, ny = -gx * strength, gy * strength
    nz = np.ones_like(nx)
    length = np.sqrt(nx * nx + ny * ny + nz * nz)
    return np.dstack([nx / length, ny / length, nz / length])


def make_detail(height: np.ndarray, size: int) -> np.ndarray:
    """A tile of high frequencies, with its seams hidden by a cross-fade over a quarter of the tile."""
    base = cv2.GaussianBlur(height, (0, 0), 12)
    fine = height - base
    h, w = fine.shape
    # Take the calmest window: a stain or chip in the tile would repeat visibly.
    s = size * 2
    best, best_at = None, (0, 0)
    for y in range(0, h - s, s // 2):
        for x in range(0, w - s, s // 2):
            v = float(np.abs(fine[y : y + s, x : x + s]).max())
            if best is None or v < best:
                best, best_at = v, (y, x)
    y, x = best_at
    patch = fine[y : y + s, x : x + s]
    tile = cv2.resize(patch, (size, size), interpolation=cv2.INTER_AREA)
    fade = size // 4
    ramp = np.linspace(0, 1, fade, dtype=np.float32)
    out = tile.copy()
    # Blend the tile with itself shifted by half, weighted so that the edges come from the shifted copy.
    shifted = np.roll(np.roll(tile, size // 2, 0), size // 2, 1)
    weight = np.ones((size, size), np.float32)
    weight[:fade, :] *= ramp[:, None]
    weight[-fade:, :] *= ramp[::-1, None]
    weight[:, :fade] *= ramp[None, :]
    weight[:, -fade:] *= ramp[None, ::-1]
    out = tile * weight + shifted * (1 - weight)
    # Cross-fades lower the variance: put it back so the grain stays the same strength everywhere.
    local = np.sqrt(weight**2 + (1 - weight) ** 2)
    return out / np.maximum(local, 0.5)


def seam_jump(img: np.ndarray) -> float:
    """How far the tile's wrap-around differs from any ordinary neighbouring pair, as a ratio."""
    inner = np.abs(np.diff(img, axis=1)).mean()
    wrap = np.abs(img[:, 0] - img[:, -1]).mean()
    return float(wrap / max(inner, 1e-6))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("source")
    ap.add_argument("--height")
    ap.add_argument("--tag", default="wall")
    ap.add_argument("--out", default=str(ROOT / "photos-work" / "wall"))
    ap.add_argument("--albedo", type=int, default=1024)
    ap.add_argument("--normal", type=int, default=1024)
    ap.add_argument("--detail", type=int, default=256)
    ap.add_argument("--keep-colour", type=float, default=0.35)
    ap.add_argument("--albedo-q", type=int, default=82)
    ap.add_argument("--normal-q", type=int, default=72)
    ap.add_argument("--detail-q", type=int, default=74)
    args = ap.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    rgb = np.asarray(Image.open(args.source).convert("RGB"))
    print("source", rgb.shape[1], rgb.shape[0])
    ratio, stats = ratio_map(rgb, args.keep_colour)
    small = cv2.resize(ratio, (args.albedo, args.albedo), interpolation=cv2.INTER_AREA)
    Image.fromarray(encode_ratio(small)).save(out / f"{args.tag}-albedo.webp", quality=args.albedo_q, method=6)

    if args.height:
        height = np.asarray(Image.open(args.height).convert("L"), np.float32) / 255
        source = "measured height map"
    else:
        # No height data: the plaster's darker marks stand in for its pits. A guess, but from this wall.
        linear = to_linear(rgb) @ np.array([0.2126, 0.7152, 0.0722], np.float32)
        height = np.log(np.maximum(linear, 1e-3))
        height = height - wide_blur(height, rgb.shape[1] / 8)
        source = "derived from luminance"
    height_small = cv2.resize(height, (args.normal, args.normal), interpolation=cv2.INTER_AREA)
    normal = normal_from_height(height_small, 0.35)
    rg = np.dstack([normal[..., 0] * 0.5 + 0.5, normal[..., 1] * 0.5 + 0.5, np.full_like(normal[..., 0], 0.5)])
    Image.fromarray(np.uint8(np.clip(rg * 255 + 0.5, 0, 255))).save(out / f"{args.tag}-normal.webp", quality=args.normal_q, method=6)

    detail_size = args.detail
    detail = make_detail(height, detail_size)
    d_norm = normal_from_height(detail, 0.45, wrap=True)
    d_rg = np.dstack([d_norm[..., 0] * 0.5 + 0.5, d_norm[..., 1] * 0.5 + 0.5, np.full_like(detail, 0.5)])
    Image.fromarray(np.uint8(np.clip(d_rg * 255 + 0.5, 0, 255))).save(out / f"{args.tag}-detail.webp", quality=args.detail_q, method=6)
    stats.update(seam_jump=seam_jump(detail), height_source=source, normal_tilt_p99=float(np.percentile(1 - normal[..., 2], 99)))
    stats["files_kb"] = {p.name: p.stat().st_size // 1024 for p in out.glob(f"{args.tag}-*.webp")}
    (out / f"{args.tag}-stats.json").write_text(json.dumps(stats, indent=1), encoding="utf8")
    print(json.dumps(stats))


if __name__ == "__main__":
    main()
