# Border Beam Button

A premium pill call to action for Next.js with a comet of light that travels around its border. Unlike the
usual rotating conic gradient, the beam moves at a **constant speed along the real rounded border**, reacts
to the cursor, and walks through **loading, success and error** on its own when its action is async.

- **The beam:** a measured SVG `rect` with `pathLength="100"`. The comet is one continuous fade, from a
  bright head back to nothing, with no bands of color. It is built from thin layers whose opacities are solved
  so their overlaps follow a smooth curve, and they share one leading edge and one animation. A blurred copy
  gives the glow, and an optional second beam runs half a lap behind.
- **Hover:** the beam eases up to 2.5× speed and grows longer (`updatePlaybackRate`, no restart). The button
  gets an accent glow, a spotlight follows the cursor and brightens the dots under it, and the stretch of
  border nearest the cursor lights up. The label rolls letter by letter and the arrow loops out and back in.
  An optional magnetic pull leans the button up to 4px toward the cursor.
- **Press:** a 0.97 squeeze, a shockwave from the point you pressed, and one accent flash around the border.
- **States:** loading turns the beam into a perimeter spinner (one lap per second) with a spinner and
  "Building…". Success flashes the border green and draws a check, and error shakes and flashes red. Every
  state is announced to screen readers, and the button never changes width.
- **Surfaces:** dark (default), light, or `auto`, which follows your site's theme. Accents are ember,
  violet, aurora, mono or any two colors.
- **Light on the page:** only transform, opacity, stroke-dashoffset and filter animate, and pointer tracking
  writes CSS variables once per frame, never React state. The beam stops while the button is off screen.

Built with Next.js 16 (App Router), React 19, Tailwind CSS 4, TypeScript and `lucide-react`. No animation
library.

## Run the demo

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3000/demo/beam-button>. The switch in the top right corner moves the page between
light, dark and the system theme. `pnpm build && pnpm start` runs the production build; `pnpm lint` runs
ESLint.

## Files

```
components/ui/beam-button/
  beam-button.tsx      the button: surface, label, states, hover and press
  beam-svg.tsx         the measured SVG layer: beam, focus ring, flashes
  use-pointer-vars.ts  pointer position and magnetic offset as CSS variables, once per frame
app/globals.css        the bb-* keyframes (and, for the demo, the class-based dark variant)
app/demo/beam-button/page.tsx, components/demo/   the demo page
```

## Add it to your project

1. Copy `components/ui/beam-button/` into your project.
2. Install the icons if you don't have them: `pnpm add lucide-react`.
3. Copy the `@property --bb-offset` rule (the beam's position) from `app/globals.css` into your global CSS.
   Then copy the `--animate-bb-*` lines and the `@keyframes bb-*` blocks into the `@theme` block (Tailwind
   CSS 4). On Tailwind CSS 3.4, add the same keyframes and animations to `theme.extend.keyframes` and
   `theme.extend.animation` in `tailwind.config`.
4. Use it:

   ```tsx
   import { BeamButton } from "@/components/ui/beam-button/beam-button";

   <BeamButton onClick={() => createProject()}>Start building</BeamButton>;
   ```

The button is a Client Component. Pages that use it can stay Server Components: pass it a `href`, or put
it in a client component (or a form) when it needs an `onClick`.

## Props

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactNode` | required | The label. A plain string gets the letter roll. |
| `href` | `string` | – | Renders a `next/link` instead of a `<button>`. |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | 44, 52 or 60px tall. |
| `accent` | `"ember" \| "violet" \| "aurora" \| "mono" \| { from, to }` | `"ember"` | The beam's colors. |
| `surface` | `"dark" \| "light" \| "auto"` | `"dark"` | `auto` is light, and dark under your site's `dark:` variant. |
| `icon` | `ReactNode \| false` | arrow | The trailing icon. |
| `state` | `"idle" \| "loading" \| "success" \| "error"` | – | Controlled state. Leave it out to let `onClick` drive the states. |
| `onClick` | `(event) => void \| Promise<unknown>` | – | Return a Promise for automatic loading → success or error → idle. |
| `loadingText` / `successText` / `errorText` | `string` | `"Building…"` / `"Ready"` / `"Try again"` | The labels for each state. |
| `beamDuration` | `number` | `3` | Seconds per lap. |
| `dualBeam` | `boolean` | `false` | A second beam half a lap behind. |
| `magnetic` | `boolean` | `false` | Lean up to 4px toward the cursor. |
| `uppercase` | `boolean` | `true` | Uppercase, widely tracked label. |
| `fullWidth` | `boolean` | `false` | Stretch to the container. |
| `disabled` | `boolean` | `false` | Dimmed, beam stopped, no hover, `aria-disabled`. |
| `ref` | `Ref<HTMLButtonElement \| HTMLAnchorElement>` | – | The button or link element. |

Any other `<button>` attribute (`type`, `name`, `form`, `aria-*`, `data-*` …) is passed through.

### Async and forms

```tsx
// Automatic: loading while the Promise runs, then success (2s) or error (2.5s), then back to idle.
<BeamButton onClick={() => fetch("/api/deploy", { method: "POST" })} successText="Deployed">
  Deploy
</BeamButton>

// In a form: a submit button shows loading while the form's action is pending (useFormStatus).
<form action={subscribe}>
  <input name="email" type="email" required />
  <BeamButton type="submit" loadingText="Joining…">Join</BeamButton>
</form>

// Controlled: you decide the state.
<BeamButton state={status}>Publish</BeamButton>
```

While loading, clicks are ignored and the button carries `aria-busy="true"`.

## Theming

Each accent defines a gradient (`from`, `to`) and a head color for each surface: a near-white head on
the dark surface and a deep one on the light surface, so the beam stays clear on both. Edit the `accents`
map in `beam-button.tsx` to change the presets, or pass `accent={{ from: "#6ee7b7", to: "#10b981" }}`.
The surfaces' gradients, borders and shadows are in the `surfaces` map in the same file.

`surface="auto"` uses Tailwind's `dark:` variant, so it follows whatever dark mode your project uses. The
demo toggles a `dark` class on `<html>` (see `@custom-variant dark` in `app/globals.css`).

## Accessibility

- A real `<button>` (or `<a>` with `href`), keyboard operable, with a visible focus state: the beam fills the
  whole border and an offset ring appears.
- The label's animated letters are `aria-hidden`; a visually hidden copy carries the current label. State
  changes are announced in a polite live region placed next to the button.
- Disabled uses `aria-disabled` and blocks activation, so the button stays discoverable.
- With `prefers-reduced-motion: reduce`, the beam becomes a still gradient border, and there is no letter
  roll, shockwave, magnetic pull or shake. The states still change, with a simple crossfade.
- Text contrast meets WCAG AA on both surfaces.
- Server rendering gives a complete, correctly sized button; the beam fades in once its SVG is measured, so
  nothing shifts.

## Browser support

All current browsers. Hover effects only run with a fine pointer (a mouse), so touch screens never get stuck
in a hover state. The border glow uses CSS mask compositing with the `-webkit-` form included.
