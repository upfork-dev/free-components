# Spotlight Bento Feature Showcase — Scroll-Synced Image Grid & CTA

A landing-page feature section in which the two columns talk to each other. On the left, a feature list
drawn as a timeline. On the right, a bento grid of image tiles. Point at a feature, a tile, or let autoplay
run, and that feature takes the spotlight on both sides. It has light and dark themes, is fully accessible
and works without JavaScript, all in a single HTML file with no framework and no build step.

- **The timeline:** each feature has a ring marker. The active one fills with the feature's accent and
  glows, the connector line draws down to it from the previous marker, and a thin progress line shows
  autoplay.
- **The spotlight:** the active tile comes forward (full color, 1.02 scale, an accent-tinted gradient border
  and glow), its caption rises and shows a one-line description, and the other tiles step back (darker, less
  saturated, 0.98). The page's accent (the headline gradient, the backdrop glow, the button's hover glow
  and its live dot) fades to the active feature's color.
- **The tiles:** a slow Ken Burns zoom and pointer parallax on the active tile, a cursor-tracking sheen,
  glass pills (icon and category), two-layer scrims so captions read on any image, and an "open" arrow on
  hover. Each tile is a link (with `href`) or a button. A tile can hold a muted looping video that plays only
  while it is active and in view.
- **The motion:** on scroll into view, the eyebrow, then the headline word by word, then the list, then the
  tiles. The headline's gradient slowly shifts hue and the eyebrow dot pulses. The call to action has a
  shimmer, a magnetic pull and a nudging arrow.
- **Layouts:** a bento grid on desktop (one tall tile, one wide) or a plain 2 × 2 grid with `layout: "grid"`,
  a 2 × 2 grid on tablets, and a horizontal snap strip on phones, where the snapped tile is the active
  feature and tapping a feature scrolls to its tile.
- **Accessibility and SEO:** the list is a tablist that controls the tiles (tabpanels), with arrow-key
  navigation, a polite live region and visible focus. JSON-LD `ItemList` of the features. Reduced motion
  keeps only fades.

## Run the demo

Open `index.html` in a browser; no server or build is needed. The demo has a light / system / dark switch in
the top right corner and a second instance further down (forced light, the 2 × 2 grid, no autoplay,
rendered from JSON).

## Files

```
index.html           the demo: everything inlined (generated from src/ by npm run build)
images/              demo tile photos (credits in PHOTOS.md)
fonts/               Geist, Latin subset (SIL OFL 1.1, fonts/OFL.txt)
src/sfs.css          the component's styles: tokens, timeline, tiles, layouts, motion
src/sfs.js           the component's script
src/features.json    the demo features
src/page.html        the demo page template
src/tailwind.css     Tailwind entry for the section layout and demo page
scripts/build.mjs    builds index.html
```

## Use it on your site

1. **Markup:** copy the `<section class="sfs" data-sfs …>` block from `index.html`.
2. **Styles:** copy the component's `<style>` block (the one after the Tailwind block). It is plain CSS and
   needs nothing else. The section uses only a couple of Tailwind utilities (its padding and the container):
   keep them on a Tailwind site, or replace them with your own.
3. **Script:** copy the component's `<script>` block, or save it as `sfs.js` and load it at the end of the page.
4. Add `sfs-js` to `<html>` as early as possible (the demo does it in `<head>`), so the reveal and spotlight
   take over from the first paint:

   ```html
   <script>document.documentElement.classList.add("sfs-js")</script>
   ```

Every `[data-sfs]` section mounts itself. For a section added later:
`SpotlightFeatureShowcase.mount(element, { interval: 6000 })`.

### Data

The features live in one JSON block inside the section:

```json
{
  "name": "Editor features",
  "features": [
    {
      "id": "snapping-timeline",
      "title": "Snapping timeline",
      "description": "Clips snap into place and close their own gaps…",
      "short": "Clips snap into place and gaps close themselves as you edit.",
      "accent": "#34d399",
      "category": "Editing",
      "icon": "<svg …></svg>",
      "image": "images/snapping-timeline.jpg",
      "alt": "An editor in headphones working at a desk…",
      "href": "#snapping-timeline"
    }
  ]
}
```

- **`description`** is shown in the list. **`short`** is the one-line caption on the tile (it falls back to
  `description`).
- **`video` and `poster`** (optional) put a muted, looping video in the tile instead of the image.
- **Without `href`**, the tile is a button that selects its feature.
- **Leave the list and the grid empty** and the script renders them (and their JSON-LD) from this JSON.
- **Edit `src/features.json` and run `npm run build`** to pre-render them into the HTML, so they work without
  JavaScript and search engines read them directly.

Four features fill the bento exactly. With `layout: "grid"`, any even number makes a neat grid.

### Options

Set them in `data-sfs-config` on the section, in a `"config"` object in the data, or as the second argument
to `mount()`:

| Option | Default | What it does |
| --- | --- | --- |
| `autoplay` | `true` | Move to the next feature on its own, with a progress line in the active item. |
| `interval` | `5000` | Milliseconds per feature. |
| `layout` | `"bento"` | `"grid"` for a plain 2 × 2 grid on desktop. |
| `parallax` | `true` | The active tile's image follows the pointer (mouse only). |
| `kenBurns` | `true` | The active tile's image slowly zooms in. |
| `theme` | `"auto"` | `"light"` or `"dark"` fixes the section's theme. |
| `schema` | `true` | Add JSON-LD when the section is rendered from JSON. |

Autoplay pauses while the pointer is over the list or the tiles, while anything in the section has focus,
in a hidden tab and off screen. Reduced motion turns it off.

### API and events

The section element gets `next()`, `prev()`, `goTo(idOrIndex)`, `pause()` and `play()`, and fires
`sfs:change` with `{ index, id }`:

```js
const section = document.querySelector("[data-sfs]");
section.addEventListener("sfs:change", (event) => console.log(event.detail.id));
section.goTo("realtime-scopes");
```

Keyboard: in the list, ↑/↓ (or ←/→) move between features, and Home/End jump to the first or last.

## Theming

Override any `--sfs-*` property on the section:

```css
.sfs {
  --sfs-card-radius: 20px;
  --sfs-pill-blur: 16px;
  --sfs-interval: 6000ms;
}
```

The main tokens are `--sfs-bg`, `--sfs-text`, `--sfs-text-2`, `--sfs-text-3`, `--sfs-line`, `--sfs-dot` (the
backdrop grid), `--sfs-gradient-end`, `--sfs-cta-bg`, `--sfs-cta-text`, `--sfs-tile-bg`, `--sfs-veil-color` and
`--sfs-veil-dim` (how the tiles outside the spotlight dim), `--sfs-card-radius`, `--sfs-pill-blur` and
`--sfs-interval`. Colors use `light-dark()`, so one declaration covers both themes. Each feature's accent comes
from its `accent` field, and `--sfs-active-accent` follows the active feature with a smooth fade.

The theme follows the visitor's setting. `data-theme="light"` or `"dark"` on the section, or on any ancestor,
overrides it. Tiles keep their dark scrims and white captions in both themes.

## Accessibility

- With the script, the list becomes `role="tablist"` (vertical), each feature a `role="tab"` with
  `aria-selected` and `aria-controls`, and each tile a `role="tabpanel"`. Ids are generated per instance, so any
  number of sections can share a page. Without the script it stays a plain list and grid.
- Changes are announced in a polite live region, except during autoplay.
- Focus rings everywhere, keyboard navigation in the list, a link or button on every tile, decorative icons
  hidden from screen readers, and descriptive `alt` text on every image.
- Text is 4.5:1 or better in both themes. Glass pills turn opaque where `backdrop-filter` is unsupported.
- `prefers-reduced-motion: reduce` removes autoplay, Ken Burns, parallax, the magnetic pull and the shimmer,
  and keeps simple fades.

## Performance

Only transform and opacity animate (plus a hue filter on the headline gradient). Pointer effects are eased
in `requestAnimationFrame` and written as CSS variables. The first tile image loads with
`fetchpriority="high"` and the rest lazily, with `decoding="async"`. Tiles reserve their aspect ratio, so
nothing shifts. The script is about 9.2 KB minified (3.6 KB gzipped), including the optional JSON renderer,
JSON-LD generator and video support.

## Rebuilding

```bash
pnpm install
pnpm build
```

## Browser support

The latest Chrome, Edge, Safari, Firefox and iOS Safari (`light-dark()` needs Safari 17.5 or newer). Mask
compositing and backdrop blur include their `-webkit-` forms, with fallbacks.
