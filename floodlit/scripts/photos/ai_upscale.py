#!/usr/bin/env python3
"""For AI-generated images only: bring a small cut-out towards focus size with Real-ESRGAN.

    python scripts/photos/ai_upscale.py cobalt-runner [neon-racer ...]       # upscale, one at a time
    python scripts/photos/ai_upscale.py --copy slate-gym [sand-knit ...]     # true size, rim cleaned only

Never run this on a real photograph. It invents fine detail, which is why the rule allows it only for
pictures that were generated in the first place, and it is recorded for each one in PHOTOS.md.

Input is the cut-out in photos-work/ai-cut/ (level, on a transparent canvas). Colour goes through the
model on a neutral grey like the one it was generated on. Alpha is scaled separately, so its edge stays
a clean ramp and takes no invented texture. Needs Python with torch and spandrel, and the model file
realesr-general-x4v3.pth from the Real-ESRGAN releases.

The model alone turns fine mesh into cracked leather: it reads JPEG noise as material. So the input is
softened first, and the result is mixed with a plain bicubic scale. Edges and stitches stay crisp, and
the material stays what it was.
"""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from pipeline import clean_rim, measure  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "photos-work" / "ai-cut"
OUT = ROOT / "photos-work" / "cut"
MEASURES = ROOT / "photos-work" / "measures.json"
MODELS = Path(os.environ.get("REALESR_DIR", Path.home() / ".cache" / "maple-upscale"))
INPUT_BLUR = 0.8  # px: removes the JPEG noise the model would otherwise read as cracks
MODEL_SHARE = 0.55  # the rest is bicubic
GREY = 172
RIM = {"rim_allow": 26, "rim_floor": 26, "rim_px": 3}


def load_model():
    import torch
    from spandrel import ImageModelDescriptor, ModelLoader

    torch.set_num_threads(max(1, os.cpu_count() or 1))
    model = ModelLoader().load_from_file(str(MODELS / "realesr-general-x4v3.pth"))
    assert isinstance(model, ImageModelDescriptor)
    model.eval()
    return model


def run_model(model, rgb: np.ndarray, tile: int = 320, pad: int = 16) -> np.ndarray:
    """Tiled, so memory stays small on a shared laptop."""
    import torch

    img = torch.from_numpy(rgb.astype(np.float32) / 255).permute(2, 0, 1).unsqueeze(0)
    _, _, h, w = img.shape
    s = model.scale
    out = torch.zeros((1, 3, h * s, w * s))
    for y in range(0, h, tile):
        for x in range(0, w, tile):
            y0, x0 = max(0, y - pad), max(0, x - pad)
            y1, x1 = min(h, y + tile + pad), min(w, x + tile + pad)
            with torch.inference_mode():
                t = model(img[:, :, y0:y1, x0:x1])
            ty, tx = (y - y0) * s, (x - x0) * s
            th, tw = (min(h, y + tile) - y) * s, (min(w, x + tile) - x) * s
            out[:, :, y * s : y * s + th, x * s : x * s + tw] = t[:, :, ty : ty + th, tx : tx + tw]
    return (out.clamp(0, 1)[0].permute(1, 2, 0).numpy() * 255 + 0.5).astype(np.uint8)


def alpha_scaled(alpha: np.ndarray, factor: int) -> np.ndarray:
    """Cubic, then a steeper ramp, because plain scaling doubles the width of the soft edge."""
    a = alpha.astype(np.float32) / 255
    big = cv2.resize(a, (a.shape[1] * factor, a.shape[0] * factor), interpolation=cv2.INTER_CUBIC)
    return np.clip((big - 0.5) * 1.7 + 0.5, 0, 1)


def record(name: str, info: dict) -> None:
    known = {r["id"]: r for r in json.loads(MEASURES.read_text(encoding="utf8"))}
    known[name] = info
    MEASURES.write_text(json.dumps(list(known.values()), indent=1, default=float), encoding="utf8")


def finish(name: str, rgb: np.ndarray, alpha: np.ndarray, note: str) -> None:
    clean = clean_rim(rgb, alpha, RIM)
    Image.fromarray(np.dstack([clean, np.uint8(alpha * 255 + 0.5)])).save(OUT / f"{name}.png", optimize=True)
    info = measure(alpha, clean)
    info.update(id=name, sole_px=int((alpha > 0.5).any(axis=0).sum()), scale_used=1.0, treatment=note)
    record(name, info)
    print(name, note, clean.shape[1], "x", clean.shape[0], flush=True)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    args = sys.argv[1:]
    copy_only = "--copy" in args
    names = [a for a in args if not a.startswith("--")]
    model = None if copy_only else load_model()
    for name in names:
        rgba = np.asarray(Image.open(SRC / f"{name}.png").convert("RGBA"))
        alpha = rgba[..., 3]
        if copy_only:
            finish(name, rgba[..., :3], alpha.astype(np.float32) / 255, "true size")
            continue
        t0 = time.time()
        a = alpha[..., None].astype(np.float32) / 255
        on_grey = np.uint8(rgba[..., :3] * a + GREY * (1 - a) + 0.5)
        up = run_model(model, cv2.GaussianBlur(on_grey, (0, 0), INPUT_BLUR))
        factor = 2  # the model gives 4x; 2x reaches focus size
        h, w = rgba.shape[0] * factor, rgba.shape[1] * factor
        big = cv2.resize(up, (w, h), interpolation=cv2.INTER_AREA).astype(np.float32)
        cubic = cv2.resize(on_grey, (w, h), interpolation=cv2.INTER_CUBIC).astype(np.float32)
        rgb = np.uint8(np.clip(big * MODEL_SHARE + cubic * (1 - MODEL_SHARE) + 0.5, 0, 255))
        finish(name, rgb, alpha_scaled(alpha, factor), "Real-ESRGAN 2x, mixed with bicubic")
        print(f"  {time.time() - t0:.0f} s", flush=True)


if __name__ == "__main__":
    main()
