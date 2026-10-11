# Crowdwall

A community hero section for Next.js: a centered badge, headline, text and call to action over an endless
wall of portrait photos. The photos run in rows, and every other row slides the opposite way, so the wall
keeps moving against itself. Light and dark themes are included, and by default it follows your site's
theme.

- **Rows in alternating directions:** set one direction for the whole wall, alternate it (the default), or
  give each row its own.
- **Light, dark or auto:** `theme="auto"` follows your site's `dark:` variant (a `.dark` class or the system
  setting); `"light"` and `"dark"` fix the look.
- **Pure CSS motion:** a transform-only keyframe animation, with no animation library, `requestAnimationFrame`
  or timers. Both components are Server Components.
- **A seamless loop:** each row holds its photos twice and slides by exactly one copy, so it never jumps.
- **No repeated faces:** photos are dealt out to the rows, so the same face is never on two rows at once,
  and with 16 photos per row it never shows twice even on a 2560px screen.
- **Soft edges in any theme:** the side and bottom fades are masks rather than colored overlays, so they melt
  into whatever background sits behind them.
- **Accessible:** meaningful alt text announced once per photo, duplicate copies hidden from screen readers,
  a visible focus ring, and a still wall for visitors who prefer reduced motion.
- **Responsive:** from 360px to 2560px, with fixed card sizes (no layout shift) and no horizontal scrolling.

Built with Next.js 16 (App Router), React 19, Tailwind CSS 4, TypeScript and `lucide-react`.

## Run the demo

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3000/demo/community-hero> (the home page redirects there). The switch in the top
right corner moves the page between light, dark and the system theme. For a production check, run
`pnpm build` and then `pnpm start`; `pnpm lint` runs ESLint.

## Files

```
components/sections/community-hero/
  community-hero.tsx   the section: badge, headline, text, call to action and the photo wall
  photo-marquee.tsx    the photo wall on its own, reusable anywhere
  data.ts              the demo content and the 48 photos
app/globals.css        the marquee keyframes (and, for the demo, the class-based dark variant)
app/demo/community-hero/page.tsx
components/demo/theme-switch.tsx   demo only: the light, system and dark switch
public/images/community/01.jpg … 48.jpg
PHOTOS.md              credits and license of the demo photos
```

## Add it to your project

1. Copy `components/sections/community-hero/` into your project (adjust the `@/` import path in `data.ts`
   if your alias differs).
2. Install the icons if you don't have them: `pnpm add lucide-react`.
3. Add the animation to your global CSS.

   **Tailwind CSS 4** (inside the `@theme` block of your `globals.css`):

   ```css
   @theme {
     --animate-marquee: marquee 60s linear infinite;

     @keyframes marquee {
       from {
         transform: translate3d(0, 0, 0);
       }
       to {
         transform: translate3d(-50%, 0, 0);
       }
     }
   }
   ```

   **Tailwind CSS 3.4** (in `tailwind.config`):

   ```js
   theme: {
     extend: {
       keyframes: {
         marquee: { from: { transform: "translate3d(0, 0, 0)" }, to: { transform: "translate3d(-50%, 0, 0)" } },
       },
       animation: { marquee: "marquee 60s linear infinite" },
     },
   },
   ```

4. Put your photos in `public/images/community/` and list them in `data.ts`.
5. Render it:

   ```tsx
   import { CommunityHero } from "@/components/sections/community-hero/community-hero";
   import { communityHero } from "@/components/sections/community-hero/data";

   export default function Page() {
     return <CommunityHero {...communityHero} />;
   }
   ```

The 60s in the CSS is only a fallback: each row sets its own duration and direction from the props.

## Props

`CommunityHero`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `title` | `string` | required | The headline. |
| `images` | `{ src, alt, blurDataURL? }[]` | required | The photos. `src` is a path, a URL or a static import. |
| `badge` | `string` | – | The pill above the headline. |
| `description` | `string` | – | The text under the headline. |
| `cta` | `{ label, href }` | – | The button, rendered with `next/link`. |
| `rows` | `number` | `3` | Number of photo rows. |
| `durationSeconds` | `number` | `60` | Seconds the longest row takes to slide by one copy of its photos. The other rows keep the same speed. |
| `direction` | `"left" \| "right"` | `"left"` | Direction of the first row. |
| `alternate` | `boolean` | `true` | Every other row runs the opposite way. `false` moves all rows in `direction`. |
| `rowDirections` | `("left" \| "right")[]` | – | One direction per row, repeated if shorter than `rows`. Overrides `direction` and `alternate`. |
| `pauseOnHover` | `boolean` | `false` | Hovering the photos pauses them. |
| `theme` | `"auto" \| "light" \| "dark"` | `"auto"` | `auto` follows your site's `dark:` variant; the others fix the look. |
| `headingAs` | `"h1" \| "h2"` | `"h1"` | Use `h2` when the hero is not the page's main heading. |
| `className` | `string` | – | Extra classes for the section. |

`PhotoMarquee` takes `images`, `rows`, `durationSeconds`, `direction`, `alternate`, `rowDirections`,
`pauseOnHover`, `theme` and `className`, and works on its own under any heading or on any background:

```tsx
<PhotoMarquee images={photos} rows={2} rowDirections={["right", "left"]} pauseOnHover />
```

### Directions

```tsx
<CommunityHero {...props} />                                     // left, right, left (the default)
<CommunityHero {...props} direction="right" />                   // right, left, right
<CommunityHero {...props} alternate={false} />                   // every row to the left
<CommunityHero {...props} rowDirections={["left", "left", "right"]} />
```

## Themes

`theme="auto"` uses Tailwind's `dark:` variant, so it follows whatever dark mode your project uses. This demo
switches a `dark` class on `<html>` (see `@custom-variant dark` in `app/globals.css` and the small script in
`app/layout.tsx` that applies the saved theme before the first paint). Without that line, Tailwind 4 follows
the system setting. On Tailwind 3, set `darkMode: "class"` (or leave the default `"media"`).

| | Light | Dark |
| --- | --- | --- |
| Background | white | black |
| Headline | zinc-950 | white |
| Text | zinc-600 | zinc-300 |
| Badge | violet-700 on violet-500/10 | violet-300 on violet-500/10 |
| Button | violet-600, hover violet-700 | violet-500, hover violet-400 |
| Cards | zinc-950/10 border, zinc-950/5 placeholder | white/10 border, white/5 placeholder |

The section's colors live in the `themes` map at the top of `community-hero.tsx`; the cards' colors live in
`cardTheme` in `photo-marquee.tsx`. Because the fades are masks, a new background color needs no other
change.

## Photos

The demo uses 48 portraits from Unsplash (credits and license in [PHOTOS.md](PHOTOS.md)). Replace them with
your own community before you launch: the people pictured do not endorse your product.

- **How many:** photos are dealt out to the rows in turn (with three rows, photos 1, 4, 7… make the first
  row). 16 photos per row (48 for three rows) means no face ever shows twice on screen. With fewer, each row
  repeats its own photos, and any count works.
- **Size:** cards are 4:3 and at most 160px wide, so 4:3 crops of at least 640 × 480 look sharp on every
  screen. `next/image` serves each card a resized WebP.
- **Blurred previews:** `data.ts` uses static imports, which give each photo a blurred preview while it loads.
  Plain paths (`"/images/community/01.jpg"`) work too, without the preview unless you pass a `blurDataURL`.
- **From a CDN:** add the host to `images.remotePatterns` in `next.config.ts`. The demo only allows local
  photos under `/images/` (`images.localPatterns`).

## Accessibility

- The photo wall is ordinary content: every photo has alt text, and each photo is announced only once. Repeats
  get an empty `alt`, and each row's second copy, which exists only for the loop, is `aria-hidden`.
- The call to action has a visible focus ring in both themes.
- With `prefers-reduced-motion: reduce` the rows stand still, and the button's arrow nudge is not animated.
- The wall is `dir="ltr"`, so it behaves the same on right-to-left pages.

## Browser support

All current browsers. The fades use CSS masks with the `-webkit-` prefix included, and the animation is a
plain CSS keyframe animation on `transform`, which runs on the GPU.
