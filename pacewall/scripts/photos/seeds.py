"""Draw a shoe's seed polygons over its source, to check them before a long matting run."""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[2]
cfg = {s["id"]: s for s in json.loads((root / "scripts/photos/shoes.json").read_text(encoding="utf8"))}
out, *names = sys.argv[1:]
tiles = []
for name in names:
    s = cfg[name]
    im = Image.open(root / "photos-source" / s["source"]).convert("RGB")
    x0, y0, x1, y1 = s["crop"]
    im = im.crop((x0, y0, x1, y1))
    k = 1500 / im.width
    im = im.resize((1500, round(im.height * k)), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    for key, colour in (("bg", (255, 40, 40)), ("fg", (40, 255, 80))):
        for poly in s.get(key, []):
            pts = [((x - x0) * k, (y - y0) * k) for x, y in poly]
            d.line(pts + pts[:1], fill=colour, width=1)
    tiles.append(im)
page = Image.new("RGB", (1500, sum(t.height for t in tiles) + 8 * len(tiles)), (40, 40, 40))
y = 0
for t in tiles:
    page.paste(t, (0, y))
    y += t.height + 8
page.save(out, quality=90)
print(page.size)
