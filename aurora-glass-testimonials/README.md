# Aurora Glass Testimonials — Interactive 3D Card Stack

A premium testimonials section: a 3D stack of glassmorphic review cards over a slowly drifting aurora. Drag or
swipe the front card to send it to the back, use the buttons or the arrow keys, or let it play on its own. It is
fully accessible, works without JavaScript, has light and dark themes, and is a single HTML file with no
framework and no build step.

- **The stack:** the front card is flat and sharp. The cards behind it are smaller, higher, farther away,
  slightly rotated, and they fade and soften with depth. Click one to bring it forward.
- **The glass:** backdrop blur with saturation, a 1px gradient border (bright top-left, fading bottom-right), an
  inner top highlight, two-layer shadows, a fine grain, and a specular sheen that follows the cursor.
- **The motion:** swipe with mouse or touch, and the card flies to the side, then behind the stack. The front
  card tilts toward the cursor, and its quote mark and avatar move a little more (parallax). Autoplay shows a
  progress line and pauses on hover, focus, drag, a hidden tab or the pause button. When the section scrolls
  into view, the header rises, the cards fan in one by one, the stars fill and the numbers count up.
- **The trust bar:** stacked avatars, the aggregate rating and review count, and monochrome client logos.
- **Accessibility:** a labelled carousel region with slides as `<figure>`/`<blockquote>`/`<figcaption>`, a
  polite live region, labelled buttons, visible focus, and ratings read as "Rated 5 out of 5". Reduced motion
  turns off autoplay, tilt and drift. Without JavaScript the cards are a plain responsive grid.
- **SEO:** JSON-LD (`Product` with `AggregateRating` and each `Review`) generated from the same data.
- **Themes:** light and dark from `prefers-color-scheme`, overridable with `data-theme`. Every color, radius,
  blur and timing is a CSS custom property.
- **Reusable:** any number of instances on one page, with no global ids needed.

## Run the demo

Open `index.html` in a browser. That's it: the demo needs no server and no build.

The demo page has a light / system / dark switch in the top right corner and a second instance further down
(forced dark, a rose accent, no autoplay, cards rendered from JSON).

## Files

```
index.html           the demo: everything inlined (generated from src/ by npm run build)
avatars/             demo avatars (credits in PHOTOS.md)
fonts/               Geist, Latin subset (SIL OFL 1.1, fonts/OFL.txt)
src/agt.css          the component's styles: tokens, glass, stack, aurora, motion
src/agt.js           the component's script
src/testimonials.json   the demo reviews
src/page.html        the demo page template
src/tailwind.css     Tailwind entry for the section layout and demo page
scripts/build.mjs    builds index.html
```

## Use it on your site

1. **Markup:** copy the `<section class="agt" data-agt …>` block from `index.html`. It holds the aurora,
   header, stage, controls, trust bar and the reviews as JSON.
2. **Styles:** copy the component's `<style>` block (the one after the Tailwind block). It is plain CSS and
   works with or without Tailwind. The section's layout (header, controls row, trust bar) uses a few Tailwind
   utilities: on a Tailwind site they are generated for you, and anywhere else, copy the Tailwind `<style>`
   block too, or restyle those wrappers.
3. **Script:** copy the component's `<script>` block, or save it as `agt.js` and load it at the end of the page.
4. Add `agt-js` to `<html>` as early as possible (the demo does it in `<head>`) so the stack, not the no-JS
   grid, shows from the first paint:

   ```html
   <script>document.documentElement.classList.add("agt-js")</script>
   ```

Every `[data-agt]` section on the page mounts itself. For a section added later:

```js
AuroraGlassTestimonials.mount(element, { interval: 8000 });
```

### Data

The reviews live in one JSON block inside the section:

```html
<script type="application/json" data-agt-data>
  {
    "product": "Your product",
    "aggregate": { "rating": 4.9, "count": 1240 },
    "reviews": [
      {
        "id": "maya-okafor",
        "quote": "We replaced three tools with one…",
        "name": "Maya Okafor",
        "role": "Head of Product",
        "company": "Fieldnote",
        "avatar": "avatars/maya-okafor.jpg",
        "rating": 5,
        "verified": true,
        "source": "Customer survey",
        "date": "2026-09-14"
      }
    ]
  }
</script>
```

- **Leave the stage empty:** the script renders the cards (and their JSON-LD) from this JSON.
- **Run `npm run build` after editing `src/testimonials.json`:** the cards are pre-rendered into the HTML, so
  they work without JavaScript and search engines read them without running scripts.
- **Avatars:** `avatar` is optional. Without it, or if the image fails to load, the initials show instead.
  Keep quotes to about three lines.

### Options

Set them in `data-agt-config` on the section (JSON), in a `"config"` object in the data, or as the second
argument to `mount()`:

| Option | Default | What it does |
| --- | --- | --- |
| `autoplay` | `true` | Advance on its own, with a progress line on the front card. |
| `interval` | `6000` | Milliseconds per card. |
| `loop` | `true` | `false` stops at the first and last card. |
| `tilt` | `true` | Tilt and parallax toward the cursor (mouse only). |
| `maxVisible` | `4` | Cards visible in the stack. Phones show 2: the front card and a peek of the next. |
| `theme` | `"auto"` | `"light"` or `"dark"` fixes the section's theme. |
| `schema` | `true` | Add JSON-LD when the cards are rendered from JSON. |

```html
<section class="agt" data-agt data-agt-config='{"autoplay": false, "maxVisible": 3}'>
```

### API and events

Each section element gets `next()`, `prev()`, `goTo(index)`, `pause()` and `play()`, and fires `agt:change`:

```js
const section = document.querySelector("[data-agt]");
section.addEventListener("agt:change", (event) => console.log("now showing", event.detail.index));
section.goTo(2);
```

Keyboard, with the stage focused: ← / → move, Home / End jump to the first or last card.

## Theming

Override any `--agt-*` property on the section, in your CSS or inline:

```css
.agt {
  --agt-accent: #f97316;
  --agt-radius: 20px;
  --agt-blur: 18px;
  --agt-interval: 8000ms;
}
```

Colors are written with `light-dark()`, so one declaration covers both themes: `--agt-accent:
light-dark(#c2410c, #fb923c)`. The main tokens are `--agt-accent`, `--agt-accent-2`, `--agt-blob-1/2/3` (the
aurora), `--agt-bg`, `--agt-text`, `--agt-text-2`, `--agt-text-3`, `--agt-glass-bg`, `--agt-edge-1/2/3` (the
gradient border), `--agt-radius`, `--agt-blur`, `--agt-card-w`, `--agt-card-h`, `--agt-lift`, `--agt-depth` and
`--agt-shrink`.

The theme follows the visitor's setting. `data-theme="light"` or `"dark"` on the section, or on any ancestor
such as `<html>`, overrides it.

## Accessibility

- `<section aria-labelledby>` (the script names the section after its heading when you don't), a stage with
  `role="region"` and `aria-roledescription="carousel"`, and slides as `role="group"` with
  `aria-label="Testimonial 2 of 6"`. Cards behind the front one are `aria-hidden`.
- Changes are announced in a polite live region, but not while autoplay is running, following the WAI
  carousel pattern. The pause button stops autoplay for good; hover and focus pause it too.
- Real buttons with labels, keyboard control, and focus rings in both themes.
- Text on the glass is 4.5:1 or better in both themes. Where `backdrop-filter` is unsupported, the cards turn
  more opaque.
- With `prefers-reduced-motion: reduce` there is no autoplay, tilt, drift or flight, and changes are simple
  fades.

## Performance

Only transform, opacity and (on a few elements) filter animate. Pointer effects are eased in
`requestAnimationFrame` and written as CSS variables. Avatars load lazily and decode asynchronously. The stage
reserves its height, so nothing shifts. The script is about 8.8 KB minified (3.7 KB gzipped), including the
optional JSON renderer and JSON-LD generator; the CSS for the component is about 20 KB unminified.

## Rebuilding

```bash
pnpm install
pnpm build
```

The build compiles the Tailwind utilities the page uses, pre-renders the cards and the JSON-LD from
`src/testimonials.json` with the component's own template, and inlines everything into `index.html`.

## Browser support

The latest Chrome, Edge, Safari, Firefox and iOS Safari (CSS `light-dark()` needs Safari 17.5 or newer).
`-webkit-backdrop-filter` and `-webkit-mask` are included.

## Before you publish

The demo reviews, names, companies and numbers are placeholders. Replace them with real reviews, from people
who agreed to be quoted. Search engines treat review markup (the JSON-LD) for invented reviews as spam: set
`"schema": false` until the reviews are real.
