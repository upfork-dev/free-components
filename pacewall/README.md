# Pacewall

A wall of sports shoes standing on slim shelves, for online stores, in React and Tailwind CSS. A shopper can rearrange the wall, thin it out to what fits them, and take a pair down: the shoe itself travels from its shelf into a detail view, they pick a size and add it to the bag, and the shoe travels back to its place.

No animation library. Light, dark and auto themes. Works in Next.js and Vite.

## The pictures: read this first

**The shoes in the demos are not yours to keep, and not all of them are real.** Of the 17, seven are real photographs of physical shoes, under their own stock licences. Ten are AI-generated images (Grok and ChatGPT). `PHOTOS.md` lists every one. None of them is covered by this product's MIT licence. We have not verified those two tools' terms for shipping their images in your product: check them yourself, or replace the pictures. A shop should replace them all with its own in any case.

**The wall expects transparent, side-view pictures with the toe to the left**, and most shops do not have them. A normal product photo on a white card will not stand on a shelf. `scripts/photos/` takes your photographs through the same steps these went through: cut out, clean the edge, level the sole, match the size, export WebP and AVIF, and measure where the sole meets the shelf. See "Your own photographs" below.

## Add it to your project

```bash
npx shadcn@latest add https://upfork.dev/r/shoe-store-product-grid-react.json
```

It writes the component's files into your project. [Live preview](https://upfork.dev/products/shoe-store-product-grid-react).

## Use it

```tsx
import { ShoeWall, type Shoe } from "@/components/shoe-wall";

export function Shop({ shoes }: { shoes: Shoe[] }) {
  return (
    <ShoeWall
      shoes={shoes}
      stickyTop={64}
      detailTop={64}
      syncUrl
      onAddToBag={async (shoe, size) => {
        await addToCart(size.variantId); // A rejected promise shows "Couldn't add. Try again".
      }}
    />
  );
}
```

Set your fonts on the page's root, because the detail view and the bag are portals to `<body>`:

```css
:root {
  --pw-font-display: "Your Display Face", "Arial Narrow", Arial, sans-serif;
  --pw-font-text: "Your Text Face", system-ui, sans-serif;
}
```

The component loads no fonts itself. It looks its best with a display face that has a width axis.

## Exports

| Export | What it is |
|---|---|
| `ShoeWall` (default) | The wall, its toolbar, and the detail view it opens |
| `ShoeDetail` | The detail view on its own |
| `SizePicker` | Radio group of sizes, with EU, US and UK from your data |
| `AddToBagButton` | The fixed-size button and its states |
| `BagPeek` | A small bag drawer: image, name, size, quantity, remove, subtotal, checkout |
| `fromShopifyProducts` | Maps a Storefront API response to `Shoe[]`. No dependency, no network call |

`fromShopifyProducts` reads what you already fetched. It assumes the sole sits at the bottom of your picture unless you pass its `photo` option with the measures from `scripts/photos/`.

## Props of `ShoeWall`

| Prop | Default | What it does |
|---|---|---|
| `shoes` | required | The shoes. See `types.ts` |
| `density`, `defaultDensity`, `onDensityChange` | `"m"` | `"l"`, `"m"` or `"s"`. The shopper's choice is remembered if you leave it open |
| `sort`, `defaultSort`, `onSortChange` | `"featured"` | Also `newest`, `price-asc`, `price-desc`, `colour` |
| `openSlug`, `defaultOpenSlug`, `onOpenChange` | | The open shoe, controlled or not |
| `syncUrl` | off | Writes `?shoe=slug`. Back closes the view, a reload opens it. `{ param }` to rename it |
| `theme` | `"auto"` | `auto` follows the host's `dark` class. `light` and `dark` fix it |
| `shelf` | `"auto"` | `alloy`, `steel` or `line` |
| `filters` | `true` | `false` hides categories, your size and the phone's Filter button |
| `sound` | off | A soft tap on landing, made in WebAudio. Starts only after a gesture |
| `pointerLight` | on | One soft pool of light that follows a fine pointer |
| `moreHref`, `totalCount` | | The "See all 48 pairs" placard at the end of the wall |
| `stickyTop`, `detailTop` | `0` | The height of your own sticky header |
| `bagCount`, `bagAnchor` | | Give `bagAnchor` your bag icon, and a small copy of the shoe arcs to it |
| `onAddToBag`, `onViewBag`, `onSizeGuide` | | Your cart and your size guide |
| `labels`, `formatPrice` | English, `Intl.NumberFormat` | Every word and price |
| `dir` | | `"rtl"` mirrors the wall, its motion, and the shoes |
| `seed` | | Makes shuffles repeatable, for tests |
| `renderImage`, `renderLink` | plain `<img>`, `<a>` | For `next/image` or `next/link` |

## Your own photographs

You need Python 3.11 or later. Keep your source files in `photos-source/`. It is git-ignored.

```bash
python -m venv .venv-photos
.venv-photos/Scripts/pip install -r scripts/photos/requirements.txt
```

1. Add a shoe to `scripts/photos/shoes.json`: its `id`, its `source` file and a few settings. The top of `scripts/photos/pipeline.py` explains each one. For a plain studio backdrop, start with `"plain": { "light": 3, "dark": 14, "chroma": 5 }`.
2. Cut it out: `python scripts/photos/pipeline.py your-shoe-id`. It takes about half a minute per shoe on a laptop CPU, and needs no model download.
3. Look at the edges on three walls: `python scripts/photos/preview.py check.jpg your-shoe-id`. A white sole on a pale backdrop usually needs a hand seed; `scripts/photos/seeds.py` draws them over the source so you can check.
4. Export: `python scripts/photos/export.py your-shoe-id`. It writes `public/shoes/`, and `src/data/photos.ts` with each picture's measures.

It never upscales. A shoe from a small source gets fewer sizes. Views and zoom need pixels: a 2000 px picture gives Toe, Laces and Heel, and a 960 px one is shown at its size with little or no zoom.

## Run this project

```bash
pnpm install
pnpm dev                     # http://localhost:3000
pnpm build && pnpm start
```

Pages: `/` the full store, `/guest` the wall inside a plain page, `/small` a small shop.

## Licence

MIT for the code, "UpFork (upfork.dev)". The pictures are not covered: see `LICENSE` and `PHOTOS.md`.
