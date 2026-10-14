"""PNG renders → assets/scenes/<name>.webp, each at most 120 KB:  python art/webp.py <png-dir>

The best quality that fits, from 90 down. Run after art/render.mjs."""
import os
import sys

from PIL import Image

LIMIT = 120 * 1024
src = sys.argv[1]
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'scenes')
os.makedirs(out, exist_ok=True)
for name in sorted(os.listdir(src)):
    if not name.endswith('.png'):
        continue
    image = Image.open(os.path.join(src, name)).convert('RGB')
    target = os.path.join(out, name.split('-', 1)[1].replace('.png', '.webp'))
    for quality in range(90, 40, -4):
        image.save(target, 'WEBP', quality=quality, method=6)
        if os.path.getsize(target) <= LIMIT:
            break
    print(f'{target}: {image.size[0]}×{image.size[1]}, q{quality}, {os.path.getsize(target) // 1024} KB')
