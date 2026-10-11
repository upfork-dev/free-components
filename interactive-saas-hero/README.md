# Interactive SaaS Hero with Live Product Demo

A cinematic hero for a visual website builder. At the top are a badge, a headline, a subheading, two calls to
action and social proof, over an aurora. Below them sits a large app window that is not a picture: it runs a
small working demo of the product. Visitors can play with it, and it plays itself when left alone.

- **Background:** drifting aurora blobs, a dot grid that fades toward the edges, film grain, a cursor
  spotlight (mouse only) and a horizon light where the window begins.
- **Copy:**
  - A badge with a rotating border.
  - A headline whose words enter with a CSS-only blur and rise. It is in the server HTML, readable without
    JavaScript, and never holds back the largest paint.
  - A gradient highlight with a light sweep and speed lines.
  - The product's name, from one prop.
- **Calls to action:**
  - A gradient pill with an animated border, rising particles (seeded, so server and browser match), a
    growing glow and a magnetic pull.
  - A glass Watch demo button that opens an accessible video dialog.
- **Social proof:** avatars that lift and name themselves, a rating, and a team count that counts up once.
- **The demo window:**
  - **Outline:** layers with a shared-layout highlight, search with an empty state, and assets.
  - **Canvas:** breakpoints that resize the frame in proportion to the real width. The mini site reflows by
    container queries, so Mobile really is a mobile layout.
  - **Properties:** position, size mode, blur, glow and blend, all live, with undo and redo (buttons and
    Ctrl/Cmd+Z).
  - **Publish:** a progress line, "Live" and a toast.
  - **Share:** copies an invite link.
  - **Collaborators:** two drifting collaborator cursors.
  - **The tour:** an autoplay ghost-cursor tour that stops the moment a visitor touches anything.
- **Motion:** the window starts tilted back in 3D and flattens as it scrolls into view.
- **Themes:** light, dark, or auto (following your site), with sky, violet or emerald accents.
- **Fast and accessible:**
  - The demo hydrates only near the viewport, behind a same-size skeleton.
  - Every loop pauses off screen.
  - Reduced motion removes the tilt, particles, tour, drift and word reveal.
  - Keyboard operable throughout, with logical properties for right-to-left pages.

Built with Next.js 16 (App Router), React 19, Tailwind CSS 4, TypeScript, `motion` and `lucide-react`.

## Run the demo

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3000/demo/interactive-hero>. The switch in the top right corner moves the page between
light, dark and the system theme. `pnpm build && pnpm start` runs the production build; `pnpm lint` runs
ESLint. Leave the mouse off the demo for four seconds to see the tour.

## Add it to your project

1. Copy `components/sections/interactive-hero/` into your project, and `public/avatars/` and
   `public/videos/` (or point the props at your own files).
2. Install the two dependencies if you don't have them: `pnpm add motion lucide-react`.
3. Render it:

   ```tsx
   import { InteractiveHero } from "@/components/sections/interactive-hero/interactive-hero";
   import { interactiveHero } from "@/components/sections/interactive-hero/data";

   export default function Page() {
     return <InteractiveHero {...interactiveHero} />;
   }
   ```

The section imports its own stylesheet (`interactive-hero.css`: tokens and effects, every class and keyframe
prefixed `ih-`), so nothing needs to go into your global CSS. It needs Tailwind CSS 4.

## Props

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `title` | `string` | required | The headline. |
| `highlight` | `string` | last word | The word(s) of the title in the gradient. |
| `description` | `string` | – | The subheading. `{productName}` is replaced with `demo.productName`. |
| `badge` | `{ label, href? }` | – | The pill above the headline. |
| `primaryCta` | `{ label, href }` | required | The gradient button (a `next/link`). |
| `secondaryCta` | `{ label, videoSrc }` | – | The Watch demo button. YouTube and Vimeo links embed; anything else plays as a video file. |
| `socialProof` | `{ avatars, rating?, count?, label? }` | – | Up to five avatars (`{ src, name, role? }`), a rating and a count. `label` may contain `{count}`. |
| `demo.productName` | `string` | `"Nebula"` | The product's name, everywhere: the subheading and the window's title chip. |
| `demo.projectName` | `string` | `"Aurora"` | The project in the window, and the deployed domain in the toast. |
| `demo.enableTour` | `boolean` | `true` | The autoplay ghost-cursor tour. |
| `demo.enableCollaborators` | `boolean` | `true` | The two drifting collaborator cursors. |
| `accent` | `"sky" \| "violet" \| "emerald"` | `"sky"` | Badge icon, highlight, buttons, aurora. |
| `theme` | `"dark" \| "light" \| "auto"` | `"dark"` | `auto` follows a `.dark` class or `data-theme="dark"` on any ancestor. |
| `headingAs` | `"h1" \| "h2"` | `"h1"` | Use `h2` when the hero is not the page's main heading. |
| `className` | `string` | – | Extra classes for the section. |

## How the demo works

- **State:** `product-demo/use-demo-store.tsx` holds the demo's state in a `useReducer` behind a context:
  the selected layer, breakpoint, caption position and size, blur, glow, blend, hero visual and publish state.
  - **Undo history:** each finished change is one entry. A slider drag previews live and records once, on
    release. Publishing is never undone.
  - **Keyboard:** Ctrl/Cmd+Z and Shift+Ctrl/Cmd+Z work while focus is inside the demo, but never while typing
    in the layer search.
- **The tour:** `product-demo/tour-script.ts` holds the tour as data (select Hero → Center → drag Glow from 20
  to 50 → Mobile → Publish → wait for Live → Desktop → reset). `ghost-cursor.tsx` runs it.
  - **When it runs:** medium screens and up, with a mouse, without reduced motion, after four seconds in view
    and idle.
  - **Targets:** found by `data-tour-id` and measured at every step, so resizing never breaks it.
  - **History:** its changes are never recorded in undo history.
  - **Stopping:** any real pointer, key, touch or wheel inside the demo stops it and keeps the state. It may
    come back after ten idle seconds.
- **Loading:** `product-demo/demo-loader.tsx` loads the window with `next/dynamic` once it is within 600px of
  the viewport. Until then, and while its code loads, a static window of exactly the same size holds the
  place. The scroll tilt wraps both, so the hand-over is seamless.

Set any of the timings in `tour-script.ts`. The canvas content (the mini site) lives in `canvas.tsx`, and the
ring, orb and prism in `hero-visual.tsx` and `interactive-hero.css`.

## Themes and accents

The section's colors are `--ih-*` custom properties defined in `interactive-hero.css`: a light set, a dark
set under `[data-ih-theme="dark"]` (and under a `.dark` or `[data-theme="dark"]` ancestor for `theme="auto"`),
and an accent set per `data-ih-accent`. Change a token there and every part follows. Examples are the page
background `--ih-bg`, the window `--ih-win` and `--ih-panel`, the canvas `--ih-canvas`, the selection blue
`--ih-selection`, and the call to action's gradient `--ih-cta-from` and `--ih-cta-to`.

## Accessibility

- Decorative layers (aurora, grain, speed lines, cursors) are `aria-hidden`. The demo is a labelled region,
  "Interactive product demo".
- Every control is a real button, radio group or range input with a label. Radio groups are one tab stop with
  arrow keys, and layers are toggle buttons. Focus rings are visible in both themes.
- Publishing and copying are announced in a polite live region.
- The video dialog is a native modal `<dialog>`: focus is trapped while it is open and returns to the button.
  Escape or a click on the backdrop closes it, and the video loads only when it opens.
- With `prefers-reduced-motion: reduce` there is no tilt (a CSS override, correct from the first paint),
  particles, tour, aurora drift, collaborator drift or word reveal.
- Text meets WCAG AA in both themes. The section uses logical properties, and the demo's own inner layout is
  `dir="ltr"`.

## Performance

Only transform, opacity and filter animate. Pointer effects (spotlight, magnet) are eased in
`requestAnimationFrame` and written as CSS variables, never React state. Every loop pauses off screen or in a
hidden tab: the aurora, particles, borders, shine, collaborators and tour. The demo hydrates only near the
viewport. The window has a fixed size (16:10 on large screens, 560px below), so there is no layout shift.

## Files

```
components/sections/interactive-hero/
  interactive-hero.tsx      the section (Server Component)
  interactive-hero.css      tokens (light, dark, accents) and effects, every class prefixed ih-
  headline.tsx              word-by-word CSS entrance, gradient highlight, speed lines
  announcement-badge.tsx, social-proof.tsx, count-up.tsx, cursor-spotlight.tsx, section-pause.tsx
  primary-cta.tsx           gradient pill, seeded particles, magnetic pull
  secondary-cta.tsx, demo-video-dialog.tsx
  data.ts, types.ts
  product-demo/
    demo-loader.tsx         near-viewport loading, the skeleton and the scroll tilt
    app-window.tsx          the window, publish flow, toast, sheets, keyboard shortcuts
    title-bar.tsx, outline-panel.tsx, canvas.tsx, properties-panel.tsx, publish-button.tsx
    hero-visual.tsx         the ring, orb and prism, CSS gradients only
    use-demo-store.tsx      state, history and context
    ghost-cursor.tsx        the tour runner and its cursor
    tour-script.ts          the tour's steps, as data
    collaborator-cursors.tsx, collaborators.ts, demo-types.ts, radio-keys.ts
public/avatars/             demo avatars (Unsplash License)
public/videos/demo.mp4      the Watch demo video: one loop of the demo's own tour, H.264, no sound
```

The product (Nebula), the project (Aurora), the mini site (Orion) and the people in the social proof are
fictional. The avatars are portraits from Unsplash, used under the Unsplash License.
