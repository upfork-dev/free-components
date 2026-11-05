"""A quick look at cut-outs on a loud colour, the two walls, and enlarged edge crops."""
import sys
from pathlib import Path

from PIL import Image

work = Path(__file__).resolve().parents[2] / "photos-work"
names = sys.argv[2:] or [p.stem for p in sorted((work / "cut").glob("*.png"))]
out = sys.argv[1]
rows = []
for name in names:
    shoe = Image.open(work / "cut" / f"{name}.png").convert("RGBA")
    k = 620 / shoe.width
    small = shoe.resize((620, round(shoe.height * k)), Image.LANCZOS)
    row = Image.new("RGBA", (620 * 3 + 40, small.height + 20), (40, 40, 40, 255))
    for i, colour in enumerate([(235, 235, 230, 255), (18, 19, 21, 255), (255, 0, 200, 255)]):
        tile = Image.new("RGBA", small.size, colour)
        tile.alpha_composite(small)
        row.alpha_composite(tile, (10 + i * 630, 10))
    rows.append(row)
height = sum(r.height for r in rows)
page = Image.new("RGB", (rows[0].width, height), (40, 40, 40))
y = 0
for row in rows:
    page.paste(row.convert("RGB"), (0, y))
    y += row.height
page.save(out, quality=88)
print(out, page.size)
