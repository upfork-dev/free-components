# Pulse Bento Feature Highlights — Interactive Live-Demo Feature Cards

A SaaS feature-highlights section whose four cards are small working product demos rather than pictures of
them. Revenue ticks, clients scroll past a dotted globe, packets travel from your tools to a hub, and a team
workspace adds a member while you watch, all of it clickable. It has light and dark themes, works without
JavaScript, keeps its layout still (no layout shift), and is a single HTML file with no framework and no build
step.

- **Realtime KPI Monitor:** rows per country with a flag, a live sparkline (a new point every 1.5 s, sliding
  smoothly), a value, a bar and a share. The numbers count up when the card appears, then drift now and then
  with a green or red "+1.2%" chip and a shimmer across the bar. Today / 7d / 30d re-animate every row to
  another dataset, and the AI Insights pill opens a glass popover that types out a one-line insight.
- **Worldwide Clients:** an endless vertical list of clients (avatar, name, "GB • GBP", status) over a faint
  dotted globe. As each row crosses the middle its check draws in or its star fills, and a pin on the globe
  pulses. Weekly ⇄ Monthly swaps the list with a crossfade and the country and currency labels flip in; the
  footer's language label rotates EN → DE → JA → … every two seconds.
- **Connects with your tools:** four tiles (Email, Chat, Calendar, CRM) that tilt toward the cursor with a
  specular highlight. Lines with flowing dashes run from each tile to a hub; a packet travels each line in turn,
  the hub pulses on arrival, and a sync log types "Chat synced · just now" while older lines fade and age. Once
  all four arrive the avatar stack gets its green check, and the cycle rests before it starts again.
- **Team Workspace:** working Members / Tasks / Hub tabs with a sliding indicator, a task checklist with
  animated checkboxes and an activity feed. Add runs a real add-member demo: a spinner, a row that slides in and
  types its name and role, then an "Invitation sent" toast with Undo. It also plays itself every eight seconds
  while in view, and waits whenever the visitor is using the card.
- **One system:** a near-black backdrop with a glow, a dot grid and fine grain; cards with a 1px gradient border,
  an accent tint (teal, purple, green, violet) and a cursor spotlight along the border and surface, while the
  other cards step back slightly.
- **Accessibility:** semantic structure, the WAI-ARIA tabs pattern, live numbers kept quiet with a static summary
  for screen readers, the insight and the invitation announced once, real buttons with labels, visible focus
  rings, and reduced motion honoured throughout.
- **SEO:** the four features as a JSON-LD `ItemList`, and every card pre-rendered in the HTML.
- **Reusable:** any number of instances on one page, each with its own data, layout and theme.

## Run the demo

Open `index.html` in a browser. That's it: the demo needs no server and no build.

The demo page has a light / system / dark switch in the top right corner and a second instance further down in
the bento layout (on screens 1280px and wider, the KPI and workspace cards span two of three columns).

## Files

```
index.html           the demo: everything inlined (generated from src/ by npm run build)
avatars/             demo avatars (credits in PHOTOS.md)
fonts/               Geist, Latin subset (SIL OFL 1.1, fonts/OFL.txt)
ICONS-LICENSE.txt    the Lucide icons' licence (ISC)
src/pbf.css          the component's styles: tokens, card chrome, the four demos, motion
src/pbf.js           the component's script
src/config.json      the demo's content: header, features and every card's data
src/section.html     the section's markup template
src/icons.json       the Lucide icons the markup uses
src/page.html        the demo page template
src/tailwind.css     Tailwind entry for the section layout and demo page
scripts/build.mjs    builds index.html
```

## Use it on your site

1. **Markup:** copy a `<section class="pbf" data-pbf …>` block from `index.html`. It holds the backdrop, the
   header, the four cards in their starting state, and the data the demos need as JSON.
2. **Styles:** copy the component's `<style>` block (the one after the Tailwind block). It is plain CSS and works
   with or without Tailwind. The section's wrappers (padding, max width, centred header, `sr-only`) use a few
   Tailwind utilities: on a Tailwind site they are generated for you, and anywhere else, copy the Tailwind
   `<style>` block too, or restyle those wrappers.
3. **Script:** copy the component's `<script>` block, or save it as `pbf.js` and load it at the end of the page.
4. Add `pbf-js` to `<html>` as early as possible (the demo does it in `<head>`), so the section can fade in on
   scroll without first flashing in its final state:

   ```html
   <script>document.documentElement.classList.add("pbf-js")</script>
   ```

Every `[data-pbf]` section on the page mounts itself. For a section added later:

```js
PulseBentoFeatures.mount(element, { layout: "bento", autoplay: false });
```

### Data

All the content lives in `src/config.json`. `npm run build` renders it into the section's markup (so every card
works without JavaScript and search engines read it) and copies the part the script needs at runtime into a JSON
block at the end of the section:

```html
<script type="application/json" data-pbf-config>
  {
    "layout": "grid",
    "theme": "auto",
    "autoplay": true,
    "cards": {
      "kpi": { "datasets": { "today": [{ "value": 48200, "pct": 72 }], "d7": […], "d30": […] }, "insights": { "today": "…", "d7": "…", "d30": "…" } },
      "clients": { "languages": ["EN", "DE", "JA"], "weekly": […], "monthly": […] },
      "integrations": { "tiles": ["Email", "Chat", "Calendar", "CRM"] },
      "workspace": { "invites": [{ "name": "Noah Kim", "role": "Sales Engineer", "avatar": "avatars/noah.jpg", "kind": "clock", "action": "Follow-ups" }] }
    }
  }
</script>
```

What each part of `src/config.json` does:

| Key | What it holds |
| --- | --- |
| `badge`, `headline`, `subheadline` | The header. Wrap the phrase to highlight in braces: `"Feature highlights to {accelerate your sales}"`. |
| `features` | The four cards' titles and descriptions, in order (also the JSON-LD). |
| `cards.kpi.rows` | One row per country: `code` (flag; US, DE, JP and BR are drawn, add others to `FLAGS` in the build), `name`, `tag`. |
| `cards.kpi.datasets` | `today`, `d7` and `d30`, one `{ value, pct }` per row: the value in dollars ($48.2k, $1.18M) and the bar's fill, 0 to 100. |
| `cards.kpi.insights` | The AI insight for each range. |
| `cards.clients` | `weekly` and `monthly` lists of `{ name, avatar?, country, currency, status: "check" or "star" }`, and the footer's `languages`. Without an avatar the initials show. |
| `cards.integrations.tiles` | The four tools. Email, Chat, Calendar and CRM have icons; other names get a plug. |
| `cards.workspace` | `members` (up to three: `{ name, role, avatar?, kind: "bell", "clock" or "chart", action }`), `invites` (who Add invites, in turn), `tasks` (`{ label, done }`) and `feed` (`{ text, time }`). |

### Options

Set them in `data-pbf-config` on the section (JSON), in the JSON block, or as the second argument to `mount()`:

| Option | Default | What it does |
| --- | --- | --- |
| `layout` | `"grid"` | `"grid"` is 2 × 2 from 1024px up; `"bento"` makes the KPI and workspace cards span two of three columns from 1280px up. One column on phones either way. |
| `theme` | `"auto"` | `"light"` or `"dark"` fixes the section's theme. |
| `autoplay` | `true` | Repeat the add-member demo every eight seconds while the workspace card is in view. |

```html
<section class="pbf" data-pbf data-pbf-config='{"layout": "bento", "theme": "dark"}'>
```

### API and events

Each section element gets `start()`, `stop()`, `setTheme(theme)` and, per card, `cards.kpi`, `cards.clients`,
`cards.integrations` and `cards.workspace` with `run()` and `reset()`. It fires `pbf:cardActive` when a card is
hovered or focused:

```js
const section = document.querySelector("[data-pbf]");
section.addEventListener("pbf:cardActive", (event) => console.log("looking at", event.detail.card));
section.cards.workspace.run(); // play the add-member demo now
section.stop(); // freeze every demo, for example while a dialog is open; start() resumes
```

`run()` replays a card's demo from the top; `reset()` puts it back to its starting state.

Keyboard: every control is reachable with Tab. The workspace tabs follow the WAI-ARIA tabs pattern (← / →,
Home, End), and Esc closes the AI Insights popover.

## Theming

Override any `--pbf-*` property on the section, in your CSS or inline:

```css
.pbf {
  --pbf-accent-1: #38bdf8;
  --pbf-radius: 20px;
  --pbf-bg: light-dark(#ffffff, #0b0d12);
}
```

Colors are written with `light-dark()`, so one declaration covers both themes. The tokens are `--pbf-bg`,
`--pbf-text`, `--pbf-text-2`, `--pbf-text-3`, `--pbf-card`, `--pbf-border`, `--pbf-edge-hi` (the bright end of the
gradient border), `--pbf-panel` and `--pbf-panel-ring` (the mini-app surfaces), `--pbf-line`, `--pbf-control`,
`--pbf-control-on`, `--pbf-glass` (popover and toast), `--pbf-dot` (the dot grid), `--pbf-up` and `--pbf-down`
(green and red), `--pbf-accent-1` to `--pbf-accent-4` (the cards' tints: KPI, clients, integrations, workspace),
`--pbf-glow` (the headline's glow and gradient), `--pbf-radius` and `--pbf-ease`.

The theme follows the visitor's setting. `data-theme="light"` or `"dark"` on the section, or on any ancestor
such as `<html>`, overrides it.

## Accessibility

- `<section aria-labelledby>` with an `<h2>`, and each card an `<article>` with an `<h3>`. Decorative SVG is
  `aria-hidden`.
- KPI: the live numbers sit in an `aria-live="off"` region with a static summary for screen readers. The range
  buttons are toggle buttons in a labelled group. The AI Insights pill is a real button with `aria-expanded`;
  the insight is announced once, whole, through a polite live region (the typing is only for the eye).
- Clients: the marquee's duplicate list is `aria-hidden`, the list is labelled with the view it shows, and the
  Weekly / Monthly button says what is showing.
- Integrations: the tiles are focusable and labelled.
- Workspace: the WAI-ARIA tabs pattern (one tab stop, arrows, Home and End, labelled panels). Add reports
  `aria-busy` while it works, "Invitation sent to …" is announced through a status region, the toast stays while
  it is hovered or focused, and Undo hands focus back to Add.
- Focus rings in each card's accent; text contrast is 4.5:1 or better in both themes (the fading log lines and
  the marquee's faded edges are decoration).
- With `prefers-reduced-motion: reduce` there is no marquee, tilt, typing, count-up or spotlight: every demo
  shows its final state and changes are simple fades.
- Without JavaScript every card shows its starting state, rendered by the build.

## Performance

- The demos start only after the section has revealed, run only while their card is at least a quarter in view,
  and stop in a hidden tab. Every timer and animation frame a card started stops with it.
- Only transform and opacity animate. Pointer effects run in `requestAnimationFrame` and are written as CSS
  variables. Avatars load lazily and decode asynchronously.
- Nothing moves the layout: the mini-apps reserve their height, members joining or leaving glide by transform,
  the log changes text rather than lines, and counting numbers keep their width. Chrome measures a layout shift
  score of 0.
- The script is 11.7 KB minified (5.6 KB gzipped); the component's CSS is about 34 KB unminified.

## Rebuilding

```bash
pnpm install
pnpm build
```

The build compiles the Tailwind utilities the page uses, renders every card's starting state from
`src/config.json` with the component's own row templates, draws the globe and the flags, inlines the Lucide
icons, the CSS and the JS, and writes `index.html`.

## Browser support

The latest Chrome, Edge, Safari, Firefox and iOS Safari (CSS `light-dark()` needs Safari 17.5 or newer).
`-webkit-backdrop-filter` and `-webkit-mask` are included; where `backdrop-filter` is missing the popover and
toast turn opaque, and where `mask-composite` is missing the gradient border becomes a plain 1px ring.

## Before you publish

The companies, people and figures are placeholders, and the portraits are Unsplash photos (see PHOTOS.md):
replace them with your own data. The people pictured do not endorse your product, so do not present them as your
customers or team.
