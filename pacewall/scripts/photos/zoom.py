"""Crops of a master at 100%, on a mid-grey and a dark ground, to read the edge."""
import sys
from pathlib import Path

from PIL import Image

work = Path(__file__).resolve().parents[2] / "photos-work"
out, name, *boxes = sys.argv[1:]
shoe = Image.open(work / "cut" / f"{name}.png").convert("RGBA")
print(shoe.size)
tiles = []
for spec in boxes:
    x0, y0, x1, y1 = [float(v) for v in spec.split(",")]
    box = (int(x0 * shoe.width), int(y0 * shoe.height), int(x1 * shoe.width), int(y1 * shoe.height))
    crop = shoe.crop(box)
    for colour in ((128, 128, 128, 255), (18, 19, 21, 255)):
        tile = Image.new("RGBA", crop.size, colour)
        tile.alpha_composite(crop)
        tiles.append(tile)
w = sum(t.width for t in tiles[:2]) + 10
rows = [tiles[i : i + 2] for i in range(0, len(tiles), 2)]
h = sum(max(t.height for t in r) + 10 for r in rows)
page = Image.new("RGB", (w, h), (70, 70, 70))
y = 0
for row in rows:
    x = 0
    for t in row:
        page.paste(t.convert("RGB"), (x, y))
        x += t.width + 10
    y += max(t.height for t in row) + 10
if page.width > 1900:
    page = page.resize((1900, round(page.height * 1900 / page.width)), Image.LANCZOS)
page.save(out, quality=92)
print(out, page.size)
