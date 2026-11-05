#!/usr/bin/env python3
"""The Phase 0 gate: every cut-out at shelf size and at 200%, on the light wall,
the dark wall and flat mid-grey. Writes docs/photos-sheet-light.png and -dark.png."""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
CUT = ROOT / "photos-work" / "cut"
DOCS = ROOT / "docs"
DOCS.mkdir(exist_ok=True)

WALLS = {
    "light": {"wall": (0xEC, 0xEB, 0xE6), "ink": (0x15, 0x16, 0x1A), "top": (0xC9, 0xCB, 0xCB), "edge": (0x9E, 0xA1, 0xA2)},
    "dark": {"wall": (0x12, 0x13, 0x15), "ink": (0xF1, 0xF1, 0xEC), "top": (0x2B, 0x2D, 0x30), "edge": (0x44, 0x47, 0x4B)},
    "grey": {"wall": (0x80, 0x80, 0x80), "ink": (0xFF, 0xFF, 0xFF), "top": (0x6A, 0x6A, 0x6A), "edge": (0x55, 0x55, 0x55)},
}
SHELF_W = 300  # a medium-density slot at 1440 px wide
ZOOM_W = 600  # 200% of a shelf slot, to read the edge


def font(size: int):
    for name in ("arial.ttf", "segoeui.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


def scaled(shoe: Image.Image, width: int) -> Image.Image:
    alpha = np.asarray(shoe.getchannel("A"))
    xs = np.where((alpha > 128).any(axis=0))[0]
    sole = xs[-1] - xs[0] + 1
    factor = width / sole
    size = (round(shoe.width * factor), round(shoe.height * factor))
    return shoe.resize(size, Image.LANCZOS)


def bottom(image: Image.Image) -> int:
    alpha = np.asarray(image.getchannel("A"))
    return int(np.where((alpha > 128).any(axis=1))[0][-1])


def tile(shoe: Image.Image, palette: dict, width: int, pad: int, shelf: bool) -> Image.Image:
    art = scaled(shoe, width)
    sole_y = bottom(art)
    h = art.height + pad * 2 + 14
    canvas = Image.new("RGBA", (art.width + pad * 2, h), palette["wall"] + (255,))
    y = pad
    if shelf:
        draw = ImageDraw.Draw(canvas)
        top = y + sole_y + 1
        draw.rectangle((pad // 2, top, canvas.width - pad // 2, top + 3), fill=palette["top"])
        draw.rectangle((pad // 2, top + 4, canvas.width - pad // 2, top + 6), fill=palette["edge"])
    canvas.alpha_composite(art, (pad, y))
    return canvas


def sheet(theme: str) -> Path:
    order = json.loads((Path(__file__).parent / "shoes.json").read_text(encoding="utf8"))
    files = [CUT / f"{shoe['id']}.png" for shoe in order]
    palette = WALLS[theme]
    grey = WALLS["grey"]
    head = font(26)
    small = font(16)
    margin = 28
    cards: list[Image.Image] = []
    for path in files:
        shoe = Image.open(path).convert("RGBA")
        shelf_tile = tile(shoe, palette, SHELF_W, 24, True)
        shelf_grey = tile(shoe, grey, SHELF_W, 24, True)
        big = tile(shoe, palette, ZOOM_W, 30, False)
        big_grey = tile(shoe, grey, ZOOM_W, 30, False)
        h = 30 + max(shelf_tile.height + shelf_grey.height + 10, big.height) + 10 + big_grey.height + 16
        w = shelf_tile.width + big.width + 20 + margin
        card = Image.new("RGBA", (w, h), palette["wall"] + (255,))
        draw = ImageDraw.Draw(card)
        draw.text((0, 0), f"{path.stem}  ·  {shoe.width}×{shoe.height}", fill=palette["ink"], font=small)
        card.alpha_composite(shelf_tile, (0, 30))
        card.alpha_composite(shelf_grey, (0, 30 + shelf_tile.height + 10))
        card.alpha_composite(big, (shelf_tile.width + 20, 30))
        card.alpha_composite(big_grey, (shelf_tile.width + 20, 30 + big.height + 10))
        cards.append(card)
    width = max(c.width for c in cards) * 2 + margin * 3
    rows = [cards[i : i + 2] for i in range(0, len(cards), 2)]
    height = 90 + sum(max(c.height for c in r) + margin for r in rows)
    page = Image.new("RGBA", (width, height), palette["wall"] + (255,))
    draw = ImageDraw.Draw(page)
    draw.text((margin, 24), f"Pacewall cut-outs on the {theme} wall: {len(cards)} photographs, shelf size and 200% detail", fill=palette["ink"], font=head)
    y = 90
    for row in rows:
        x = margin
        for card in row:
            page.alpha_composite(card, (x, y))
            x += card.width + margin
        y += max(c.height for c in row) + margin
    out = DOCS / f"photos-sheet-{theme}.png"
    page.convert("RGB").save(out, optimize=True)
    return out


if __name__ == "__main__":
    for theme in ("light", "dark"):
        print(sheet(theme))
