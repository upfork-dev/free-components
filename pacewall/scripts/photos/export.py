#!/usr/bin/env python3
"""Step 5 and 6 of the photo pipeline: web images and src/data/photos.ts.

    python scripts/photos/export.py              # every shoe
    python scripts/photos/export.py lilac-chunky # encode only this one, keep the other files

Writes public/shoes/<id>-480.webp, -960.webp, -2000.webp and the TypeScript data module.
It never makes an image wider than the master: a shoe with a small source gets fewer sizes.
Budgets: 960 px at most 70 KB, 2000 px at most 280 KB. AVIF is written beside WebP as long as
it costs at most twice WebP's decode time, which this prints.
"""
from __future__ import annotations

import base64
import io
import json
import sys
import time
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
CUT = ROOT / "photos-work" / "cut"
OUT = ROOT / "public" / "shoes"
DATA = ROOT / "src" / "data" / "photos.ts"
OUT.mkdir(parents=True, exist_ok=True)
DATA.parent.mkdir(parents=True, exist_ok=True)

WIDTHS = (480, 960, 2000)
BUDGET = {960: 70_000, 2000: 280_000}


def encode_webp(image: Image.Image, width: int) -> tuple[bytes, int]:
    limit = BUDGET.get(width)
    for quality in (86, 82, 78, 74, 70, 66, 62, 58, 54):
        buffer = io.BytesIO()
        image.save(buffer, "WEBP", quality=quality, alpha_quality=92, method=6, exact=False)
        data = buffer.getvalue()
        if limit is None or len(data) <= limit:
            return data, quality
    return data, quality


def lqip(image: Image.Image) -> str:
    """A tiny WebP as a data address, under 400 bytes, that holds the shoe's place while it loads."""
    for width in (28, 24, 20, 16, 12):
        small = image.resize((width, max(1, round(image.height * width / image.width))), Image.LANCZOS)
        for quality in (30, 20, 10):
            buffer = io.BytesIO()
            small.save(buffer, "WEBP", quality=quality, alpha_quality=50, method=6)
            text = "data:image/webp;base64," + base64.b64encode(buffer.getvalue()).decode()
            if len(text) < 400:
                return text
    raise SystemExit("no placeholder under 400 bytes")


def decode_ms(data: bytes, repeat: int = 5) -> float:
    best = 1e9
    for _ in range(repeat):
        start = time.perf_counter()
        with Image.open(io.BytesIO(data)) as image:
            image.load()
        best = min(best, (time.perf_counter() - start) * 1000)
    return best


def main() -> None:
    measures = {m["id"]: m for m in json.loads((ROOT / "photos-work" / "measures.json").read_text(encoding="utf8"))}
    config = json.loads((Path(__file__).parent / "shoes.json").read_text(encoding="utf8"))
    rows = []
    comparison = []
    wanted = set(sys.argv[1:])
    for shoe in config:
        name = shoe["id"]
        master = Image.open(CUT / f"{name}.png").convert("RGBA")
        sizes = [w for w in WIDTHS if w <= master.width]
        if master.width not in sizes and master.width > sizes[-1] + 200 and master.width < 2000:
            sizes.append(master.width)
        set_entries = []
        for width in sizes:
            if wanted and name not in wanted:
                set_entries.append((width, (OUT / f"{name}-{width}.webp").stat().st_size, 0))
                continue
            height = round(master.height * width / master.width)
            image = master.resize((width, height), Image.LANCZOS) if width != master.width else master
            data, quality = encode_webp(image, width)
            (OUT / f"{name}-{width}.webp").write_bytes(data)
            avif_buffer = io.BytesIO()
            image.save(avif_buffer, "AVIF", quality=58, speed=6)
            (OUT / f"{name}-{width}.avif").write_bytes(avif_buffer.getvalue())
            set_entries.append((width, len(data), quality))
            if width == 960:
                comparison.append(
                    (name, len(data), decode_ms(data), len(avif_buffer.getvalue()), decode_ms(avif_buffer.getvalue()))
                )
        m = measures[name]
        alpha = np.asarray(master.getchannel("A")) > 128
        bottom = int(np.where(alpha.any(axis=1))[0][-1])
        # A lugged sole only touches at its tips, so its shadow reads from a deeper band.
        band = alpha[max(0, bottom - round(master.width * shoe.get("contact_band", 0.012))) : bottom + 1].any(axis=0)
        cols = np.where(band)[0]
        m["contact"] = [round(float(cols[0] / master.width), 4), round(float((cols[-1] + 1) / master.width), 4)]
        m["baseline"] = round((bottom + 1) / master.height, 4)
        rows.append(
            {
                "id": name,
                "width": master.width,
                "height": master.height,
                "baseline": m["baseline"],
                "contact": m["contact"],
                "hue": m["hue"],
                "lightness": m["lightness"],
                "lqip": lqip(master),
                "sizes": [w for w, _, _ in set_entries],
            }
        )
        print(name, master.size, [(w, f"{b // 1024} KB", f"q{q}") for w, b, q in set_entries], "lqip", len(rows[-1]["lqip"]))

    print("\n960 px: id, webp KB, webp ms, avif KB, avif ms")
    webp_total = avif_total = 0.0
    for name, wb, wm, ab, am in comparison:
        webp_total += wm
        avif_total += am
        print(f"  {name:14} {wb // 1024:4} {wm:6.1f} {ab // 1024:4} {am:6.1f}")
    if webp_total:
        ratio = avif_total / webp_total
        print(f"AVIF decode costs {ratio:.2f}x WebP: {'keep WebP only' if ratio > 2 else 'AVIF qualifies'}")

    lines = [
        "// Generated by scripts/photos/export.py. Do not edit by hand.",
        "// Photo paths live here so the importer finds them and points them at hosted copies.",
        "",
        "export type PhotoEntry = {",
        "  id: string;",
        "  width: number;",
        "  height: number;",
        "  /** 0..1 from the top: where the sole meets the shelf. */",
        "  baseline: number;",
        "  /** 0..1: the part of the sole that touches the shelf. */",
        "  contact: [number, number];",
        "  hue: number;",
        "  lightness: number;",
        "  lqip: string;",
        "  /** Widest first is last; every size exists in /shoes/. */",
        "  sizes: number[];",
        "};",
        "",
        "export const photoFiles: Record<string, Record<number, string>> = {",
    ]
    for row in rows:
        files = ", ".join(f'{w}: "/shoes/{row["id"]}-{w}.webp"' for w in row["sizes"])
        lines.append(f'  "{row["id"]}": {{ {files} }},')
    lines += ["};", "", "export const avifFiles: Record<string, Record<number, string>> = {"]
    for row in rows:
        files = ", ".join(f'{w}: "/shoes/{row["id"]}-{w}.avif"' for w in row["sizes"])
        lines.append(f'  "{row["id"]}": {{ {files} }},')
    lines += ["};", "", "export const photoEntries: PhotoEntry[] = ["]
    for row in rows:
        lines.append("  " + json.dumps(row, separators=(", ", ": ")) + ",")
    lines += ["];", ""]
    DATA.write_text("\n".join(lines), encoding="utf8", newline="\n")
    print("wrote", DATA)


if __name__ == "__main__":
    main()
