#!/usr/bin/env python3
"""A 64 x 64 tile of real blue noise (void and cluster), for the room's dither. Written once, then shipped.

    python scripts/photos/make_noise.py public/wall/blue-noise.png
"""
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

N = 64
SIGMA = 1.5
rng = np.random.default_rng(7)


def energy(m: np.ndarray) -> np.ndarray:
    return ndi.gaussian_filter(m.astype(np.float64), SIGMA, mode="wrap")


pattern = np.zeros((N, N), bool)
start = rng.choice(N * N, N * N // 10, replace=False)
pattern.flat[start] = True
for _ in range(4 * N * N):
    e = energy(pattern)
    cluster = np.unravel_index(np.argmax(np.where(pattern, e, -1)), (N, N))
    pattern[cluster] = False
    e = energy(pattern)
    void = np.unravel_index(np.argmin(np.where(pattern, 1e9, e)), (N, N))
    pattern[void] = True
    if void == cluster:
        break

rank = np.zeros((N, N), np.int32)
ones = int(pattern.sum())
work = pattern.copy()
for r in range(ones - 1, -1, -1):
    e = energy(work)
    at = np.unravel_index(np.argmax(np.where(work, e, -1)), (N, N))
    work[at] = False
    rank[at] = r
work = pattern.copy()
for r in range(ones, N * N):
    e = energy(work)
    at = np.unravel_index(np.argmin(np.where(work, 1e9, e)), (N, N))
    work[at] = True
    rank[at] = r

Image.fromarray(np.uint8(rank * 256 // (N * N)), "L").save(sys.argv[1], optimize=True)
print("ok", rank.min(), rank.max())
