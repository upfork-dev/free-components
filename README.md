# Free React + Tailwind CSS components by UpFork

Six free, MIT-licensed components from [UpFork](https://upfork.dev). Three are React components that you add to a
React + Tailwind project with the shadcn CLI, with no account, token or setup. The other three are sections in a single
HTML file each, with no framework. Every one has a live preview on upfork.dev, in light and dark, at phone, tablet
and desktop width.

| Component | What it is | Kind |
| --- | --- | --- |
| [Crowdwall](#crowdwall) | Community hero over an endless wall of portraits | React, shadcn CLI |
| [Border Beam Button](#border-beam-button) | Pill button with a comet of light running round its border | React, shadcn CLI |
| [Interactive SaaS Hero](#interactive-saas-hero) | Hero whose app window runs a working product demo | React, shadcn CLI |
| [Aurora Glass Testimonials](#aurora-glass-testimonials) | 3D stack of glass testimonial cards | HTML + Tailwind CSS |
| [Pulse Bento Feature Highlights](#pulse-bento-feature-highlights) | Feature cards that are small live demos | HTML + Tailwind CSS |
| [Spotlight Bento Feature Showcase](#spotlight-bento-feature-showcase) | Feature timeline linked to a bento grid of images | HTML + Tailwind CSS |

## React components

Add one to your project with the shadcn CLI. It writes the component's files into your project, with its packages.

### Crowdwall

<a href="https://upfork.dev/products/crowdwall">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/previews/crowdwall-dark.webp">
    <img alt="Crowdwall: a headline and call to action over rows of portrait photos sliding in alternating directions" src=".github/previews/crowdwall-light.webp" width="720">
  </picture>
</a>

A hero section for communities and social products: a badge, a headline and a call to action over an endless wall
of portraits whose rows slide in alternating directions. Pure CSS motion, light, dark or auto theme.

```bash
npx shadcn@latest add https://upfork.dev/r/crowdwall.json
```

[Live preview](https://upfork.dev/products/crowdwall) · [Source and docs](crowdwall)

### Border Beam Button

<a href="https://upfork.dev/products/border-beam-button">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/previews/border-beam-button-dark.webp">
    <img alt="Border Beam Button: two pill buttons with a beam of light on their borders" src=".github/previews/border-beam-button-light.webp" width="720">
  </picture>
</a>

A pill call to action with a comet of light that travels round its border. Unlike the usual rotating conic
gradient, the beam moves at a constant speed along the real rounded border, reacts to the cursor, and walks
through loading, success and error by itself when its action is async.

```bash
npx shadcn@latest add https://upfork.dev/r/border-beam-button.json
```

[Live preview](https://upfork.dev/products/border-beam-button) · [Source and docs](border-beam-button)

### Interactive SaaS Hero

<a href="https://upfork.dev/products/interactive-saas-hero">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/previews/interactive-saas-hero-dark.webp">
    <img alt="Interactive SaaS Hero: a headline over an aurora, above an app window running a demo" src=".github/previews/interactive-saas-hero-light.webp" width="720">
  </picture>
</a>

A hero for a SaaS product whose app window isn't a picture: it runs a small working demo that visitors can play
with, and that plays itself when left alone. Aurora background, animated calls to action, social proof.

```bash
npx shadcn@latest add https://upfork.dev/r/interactive-saas-hero.json
```

[Live preview](https://upfork.dev/products/interactive-saas-hero) · [Source and docs](interactive-saas-hero)

## HTML sections

Each is one HTML file with Tailwind CSS and a little vanilla JavaScript: no framework and no build step. Copy the
section into your page (each folder's README shows how), or open its `index.html` to try it.

### Aurora Glass Testimonials

<a href="https://upfork.dev/products/aurora-glass-3d-card">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/previews/aurora-glass-3d-card-dark.webp">
    <img alt="Aurora Glass Testimonials: a stack of glass review cards over an aurora" src=".github/previews/aurora-glass-3d-card-light.webp" width="720">
  </picture>
</a>

A 3D stack of glass testimonial cards over a drifting aurora. Drag or swipe the front card to the back, use the
buttons or the arrow keys, or let it play. Accessible, and it works without JavaScript.

[Live preview](https://upfork.dev/products/aurora-glass-3d-card) · [Source and docs](aurora-glass-testimonials)

### Pulse Bento Feature Highlights

<a href="https://upfork.dev/products/pulse-bento-feature-cards">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/previews/pulse-bento-feature-cards-dark.webp">
    <img alt="Pulse Bento Feature Highlights: four feature cards with live charts and a globe" src=".github/previews/pulse-bento-feature-cards-light.webp" width="720">
  </picture>
</a>

A SaaS feature section whose four cards are small working demos rather than pictures of them: revenue ticks,
clients scroll past a dotted globe, packets travel to a hub, and a team adds a member while you watch.

[Live preview](https://upfork.dev/products/pulse-bento-feature-cards) · [Source and docs](pulse-bento-feature-highlights)

### Spotlight Bento Feature Showcase

<a href="https://upfork.dev/products/spotlight-bento-grid-feature-section">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/previews/spotlight-bento-grid-feature-section-dark.webp">
    <img alt="Spotlight Bento Feature Showcase: a feature timeline beside a bento grid of images" src=".github/previews/spotlight-bento-grid-feature-section-light.webp" width="720">
  </picture>
</a>

A feature section whose two columns talk to each other: a feature timeline on the left, a bento grid of images on
the right. Point at either, or let autoplay run, and that feature takes the spotlight on both sides.

[Live preview](https://upfork.dev/products/spotlight-bento-grid-feature-section) · [Source and docs](spotlight-bento-feature-showcase)

## Running a demo

The React components come with a small Next.js demo:

```bash
cd crowdwall
pnpm install
pnpm dev
```

Then open the address in its README (for Crowdwall, <http://localhost:3000/demo/community-hero>). The HTML
sections need nothing: open `index.html` in a browser. `pnpm build` in their folder rebuilds it from `src/`.

## More from UpFork

[upfork.dev](https://upfork.dev) has more: 3D and WebGL heroes, carousels and complete landing pages, each with a
live preview. Most of them come with the Pro plan. AI assistants (Claude, Cursor, VS Code) can search UpFork and
install components through its [MCP server](https://upfork.dev/docs/mcp).

Found a bug in one of these? [Open an issue](../../issues).

## License

The code is [MIT](LICENSE). The demo photos are from Unsplash, under the Unsplash License (credited in each folder's
`PHOTOS.md` or README); the Geist font is under the SIL Open Font License; Lucide icons are under the ISC License. Replace the
demo photos with your own before you launch: the people pictured don't endorse your product.
