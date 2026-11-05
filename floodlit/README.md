# Floodlit

A 3D night showroom for sneaker and shoe stores, as a React component, in raw WebGL2 with no 3D library (no three.js). Pairs stand on clear acrylic shelves against a plaster wall. Point at a shelf and a strip of light in the acrylic comes up in the shoe's own colour, lighting its sole, the edge of the slab and the wall behind it. Click, and one camera walks up to the shoe, with the wall, the slab and the shoe moving against each other. Then choose a size and add the pair to the bag, in a panel that belongs to the room.

It is built for a small range, 6 to 12 pairs: a launch, a capsule, a small brand's whole range. It is not a catalogue.

## The pictures: read this first

**The shoes in the demo are not yours to keep, and not all of them are real.** Of the 10, five are real photographs of physical shoes, under their own stock licences. Five are AI-generated images made with Grok and ChatGPT: we have not verified those tools' terms for this use, so check them yourself, or replace the pictures. The wall is a real plaster scan from Poly Haven, under CC0. [PHOTOS.md](PHOTOS.md) lists each one, with its source and its edits. The code is MIT; the pictures are not.

**The room needs a transparent side view of each shoe**, about 2000 px wide, with smaller copies for the wall, all facing the same way. A normal product photo on a white card will not stand on a shelf. `scripts/photos/` is the pipeline that made the demo's set: cut-out, levelling, sizes, the blurred-alpha shadow atlas that soft shadows read, and each picture's `baseline`, `contact` and `ledColor`. Read it, and adapt it to your own pictures.

## Add it to your project

```bash
npx shadcn@latest add https://upfork.dev/r/3d-shoe-showroom-webgl-react.json
```

It writes the component's files into your project. Copy `public/wall/` too, or pass your own `wall`. [Live preview](https://upfork.dev/products/3d-shoe-showroom-webgl-react).

## Run the demo

```bash
pnpm install
pnpm dev
```

`/` is the full store, `/in-a-page` puts the room between ordinary content, and `/six-pairs` is a smaller range under one colour of light.

## Use it

```tsx
import { Floodlit } from "@/components/floodlit";

export function Shop({ shoes }) {
  return (
    <Floodlit
      shoes={shoes}
      theme="auto"
      syncUrl
      detailTop={64}
      onAddToBag={async (shoe, size) => {
        await addToCart(size.variantId); // A rejected promise shows its message and keeps the size.
      }}
      onCheckout={goToCheckout}
    />
  );
}
```

React 19 is the only dependency, and there is no CSS framework. The component loads no fonts: it reads `--font-floodlit-display` and `--font-floodlit-text`, and falls back to Archivo if the page has it, then the system font. Archivo has no Persian or Arabic, so a right-to-left store should pass its own.

## Props

| Prop | What it does |
|---|---|
| `shoes` | The range. Each has `id`, `slug`, `href`, `name`, `price`, `currency`, `photo`, `sizes`; optional `series`, `colourName`, `compareAtPrice`, `views`, `ledColor`, `ledInk`, `description`, `returnsNote` |
| `wall` | `{ albedo, normal, detail?, noise? }`. Defaults to `/wall/…` |
| `theme` | `"dark"` (default), `"light"`, or `"auto"`: your `dark` or `light` class on `<html>`, then the system |
| `ledMode`, `ledColor` | `"shoe"` lights each shelf in its shoe's colour. `"brand"` uses one colour for all |
| `openSlug`, `defaultOpenSlug`, `onOpenChange` | Which shoe is open, controlled or not |
| `syncUrl` | Keeps the open shoe in the address (`true` or `{ param }`), with back and deep links |
| `heading`, `eyebrow` | Over the wall |
| `detailTop` | Height of your site's header, so nothing goes under it |
| `bag`, `onBagChange`, `bagOpen`, `onBagOpenChange` | Control the bag from outside. Left out, it keeps its own |
| `onAddToBag` | May return a promise. A rejected one shows its message and keeps the size |
| `onCheckout` | The bag's checkout button |
| `labels`, `formatPrice`, `dir` | All words, all prices, and right to left |
| `worker` | `false` keeps the room on the page's own thread, for a host whose rules forbid workers |

Also exported: `SizeTiles`, `AddToBagPill`, `BagDrawer`, and `fromShopifyProducts`, a plain mapper from Shopify products to `Shoe` objects that makes no network calls. A shop's own product photos are usually not transparent side views, and it cannot know `baseline` or `contact`, so the room will not look right until the pictures are redone.

## How it behaves

- **Real links underneath.** The wall is a `<ul>` of real `<a href>`, in the server's markup, placed by CSS alone. Crawlers, middle-click and screen readers need no WebGL. The first paint is those pictures, and the canvas fades in over them within 1 px of the same place.
- **It draws only when something changes.** At rest: zero draw calls.
- **In a worker.** Context, shaders, pictures and frames run in a Web Worker where the browser allows, and on the page's own thread where it does not.
- **Without WebGL, or after a lost context:** the pictures stay, and buying works with a plain slide-in. The room comes back if the context does.
- **Without JavaScript:** the wall and its links work.
- **Reduced motion:** no walk and no torch. States crossfade. Light still answers hover.
- **Phones:** two columns, and ordinary page scrolling moves the camera down the wall. In focus, the shoe is above and the panel is a sheet below. Swipe sideways to walk, down to step back.
- **Keyboard:** everything is reachable. Arrow keys walk along. Esc takes off the zoom, then the bag, then the shoe.

## What was measured, and what was not

Checked on one laptop with an Intel Iris Plus, in installed Chrome, on a production build:

- No sideways scroll at ten sizes from 320 px to 3440×1440.
- Text measured against the lit pixels actually behind it, in 67 states and both themes: all at least 4.5:1. Controls at least 3:1. axe: no violations.
- Zero draw calls at rest, and none in a hidden tab. A walk up takes about 1.1 s.
- 26.5 KB of JavaScript, gzipped, without React. 863 KB of pictures for the first view at 1440×900. About 80 MB of GPU textures on a desktop, 30 MB at phone size.

**Frame times were not measured on a quiet machine**: the laptop was busy with other work throughout, so no frame-rate figure is given here. Not tested on a real phone, a real tablet, Safari or Firefox, or with a real screen reader. Phone results are Chrome's emulation, with real touch events.

## Shaders

The GLSL sources are in `gl/`. `pnpm glsl` builds them into `src/components/floodlit/gl/shaders.ts`, which is what the component imports.

## License

MIT for the code: see [LICENSE](LICENSE). The pictures are not covered by it: see [PHOTOS.md](PHOTOS.md).
