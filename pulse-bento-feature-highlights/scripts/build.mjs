// Builds index.html from src/: compiles the Tailwind utilities the page uses, pre-renders every card's static
// state from src/config.json (so the section works without JavaScript and search engines read it), draws the
// dotted globe and the flags, inlines the Lucide icons, and inlines the component's CSS and JS.
// Run: npm run build
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

const src = (file) => fileURLToPath(new URL(`../src/${file}`, import.meta.url));
const read = (file) => readFile(src(file), "utf8");
const [page, section, css, js, twEntry, configText, iconsText] = await Promise.all(
  ["page.html", "section.html", "pbf.css", "pbf.js", "tailwind.css", "config.json", "icons.json"].map(read),
);
const config = JSON.parse(configText);
const icons = JSON.parse(iconsText);
const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// The component's own templates, so the build and the runtime can never drift apart.
const sandbox = { matchMedia: () => ({ matches: false }), document: { querySelectorAll: () => [] } };
sandbox.window = sandbox;
vm.runInNewContext(js, sandbox);
const { clientRow, memberRow } = sandbox.PulseBentoFeatures;

const icon = (name, cls = "pbf-icon") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;
const money = (v) => (v < 1e6 ? `$${(v / 1e3).toFixed(1)}k` : `$${(v / 1e6).toFixed(2)}M`); // as in pbf.js

// Simple flags drawn in SVG (emoji flags don't render on Windows).
const FLAGS = {
  US: '<rect width="18" height="13" fill="#fff"/><path d="M0 0h18v1H0zm0 2h18v1H0zm0 2h18v1H0zm0 2h18v1H0zm0 2h18v1H0zm0 2h18v1H0zm0 2h18v1H0z" fill="#d62f3c"/><rect width="8" height="7" fill="#24356b"/>',
  DE: '<rect width="18" height="4.34" fill="#111"/><rect y="4.33" width="18" height="4.34" fill="#dd2a2a"/><rect y="8.66" width="18" height="4.34" fill="#ffcd2e"/>',
  JP: '<rect width="18" height="13" fill="#fff"/><circle cx="9" cy="6.5" r="3.4" fill="#d33a3a"/>',
  BR: '<rect width="18" height="13" fill="#1f9a4c"/><path d="M9 1.6 16 6.5 9 11.4 2 6.5z" fill="#f7d33a"/><circle cx="9" cy="6.5" r="2.5" fill="#24356b"/>',
};
const flag = (code) => `<svg class="pbf-flag" viewBox="0 0 18 13" aria-hidden="true">${FLAGS[code] || '<rect width="18" height="13" fill="#888"/>'}</svg>`;

// The sparkline's first frame: the same formula the script starts from.
function spark(i) {
  const pts = Array.from({ length: 18 }, (_, k) => 11 + Math.sin(k * 0.7 + i * 1.9) * 5 + Math.cos(k * 1.3 + i) * 2);
  const d = pts.map((y, k) => `${k ? "L" : "M"}${k * 4} ${y.toFixed(1)}`).join("");
  return `<svg class="pbf-spark" viewBox="0 0 64 22" aria-hidden="true"><g><path class="pbf-spark-fill" d="${d}L68 22L0 22Z"/><path class="pbf-spark-line" d="${d}"/></g></svg>`;
}

function kpiRows() {
  const { rows, datasets } = config.cards.kpi;
  return rows
    .map((r, i) => {
      const v = datasets.today[i];
      return `<div class="pbf-row"><span class="pbf-country">${flag(r.code)}<b>${esc(r.name)}</b><span class="pbf-tag">${esc(r.tag)}</span></span>${spark(i)}<span class="pbf-value"><b>${money(v.value)}</b><span class="pbf-delta" aria-hidden="true"></span></span><span class="pbf-bar-track" aria-hidden="true"><span class="pbf-bar-fill" style="--v:${v.pct / 100}"></span></span><span class="pbf-pct">${v.pct}%</span></div>`;
    })
    .join("\n");
}
const kpiSummary = () =>
  "Revenue today by country: " +
  config.cards.kpi.rows.map((r, i) => `${r.name} ${money(config.cards.kpi.datasets.today[i].value)} (${config.cards.kpi.datasets.today[i].pct}%)`).join(", ") +
  ".";

/** A dotted globe (orthographic, tilted) with four pins: decoration behind the client list. */
function globe() {
  const R = 96;
  const tilt = (20 * Math.PI) / 180;
  const lon0 = (-30 * Math.PI) / 180;
  const project = (lat, lon) => {
    const phi = (lat * Math.PI) / 180;
    const lambda = (lon * Math.PI) / 180 - lon0;
    const x = Math.cos(phi) * Math.sin(lambda);
    const y = Math.sin(phi);
    const z = Math.cos(phi) * Math.cos(lambda);
    return { x: 100 + R * x, y: 100 - R * (y * Math.cos(tilt) - z * Math.sin(tilt)), z: y * Math.sin(tilt) + z * Math.cos(tilt) };
  };
  // Dots as round-capped specks, one path per depth shade (far fewer bytes than a circle each).
  const shades = new Map();
  for (let lat = -78; lat <= 78; lat += 9) {
    const step = 9 / Math.max(0.35, Math.cos((lat * Math.PI) / 180));
    for (let lon = -180; lon < 180; lon += step) {
      const p = project(lat, lon);
      if (p.z <= 0.08) continue;
      const shade = (0.2 + 0.8 * p.z).toFixed(1);
      shades.set(shade, (shades.get(shade) || "") + `M${p.x.toFixed(1)} ${p.y.toFixed(1)}h.01`);
    }
  }
  const dots = [...shades].map(([shade, d]) => `<path opacity="${shade}" d="${d}"/>`);
  const pins = [
    [40, -100],
    [-12, -50],
    [53, -2],
    [9, 8],
  ]
    .map(([lat, lon]) => {
      const p = project(lat, lon);
      return `<circle class="pbf-pin-ring" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4"/><circle class="pbf-pin" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.2"/>`;
    })
    .join("");
  return `<svg class="pbf-globe" viewBox="0 0 200 200" aria-hidden="true">${dots.join("")}${pins}</svg>`;
}

const TILE_ICONS = { Email: "mail", Chat: "message-circle", Calendar: "calendar", CRM: "contact-round" };
const tiles = () =>
  config.cards.integrations.tiles
    .map((name) => `<div class="pbf-tile" tabindex="0" role="img" aria-label="${esc(name)} integration">${icon(TILE_ICONS[name] || "plug-zap")}<span>${esc(name)}</span></div>`)
    .join("\n");
/** The connection lines at a nominal 500px width; the script re-measures them in the browser. */
function wires() {
  const n = config.cards.integrations.tiles.length;
  const w = 500;
  const tileW = (w - 10 * (n - 1)) / n;
  const paths = Array.from({ length: n }, (_, i) => {
    const x = (tileW + 10) * i + tileW / 2;
    const d = `M${x.toFixed(1)} 0C${x.toFixed(1)} 44 250 30 250 74`;
    return `<path class="pbf-wire" data-wire="${i}" d="${d}"/><path class="pbf-flow" data-wire="${i}" d="${d}"/><path class="pbf-packet" data-wire="${i}" pathLength="100" d="${d}"/>`;
  }).join("");
  return `<svg class="pbf-wires" viewBox="0 0 ${w} 74" aria-hidden="true">${paths}</svg>`;
}
const stack = () =>
  ["stack-1", "stack-2", "stack-3"]
    .map((f) => `<span class="pbf-avatar"><img src="avatars/${f}.jpg" alt="" width="22" height="22" loading="lazy" decoding="async"></span>`)
    .join("");
const tasks = () =>
  config.cards.workspace.tasks
    .map((task) => `<li><label class="pbf-task"><input type="checkbox"${task.done ? " checked" : ""}><span>${esc(task.label)}</span></label></li>`)
    .join("");
const feed = () =>
  config.cards.workspace.feed.map((f) => `<li><span class="pbf-feed-dot" aria-hidden="true"></span><span>${esc(f.text)}</span><time>${esc(f.time)}</time></li>`).join("");

function schema() {
  const json = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: config.badge,
    itemListElement: config.features.map((f, i) => ({ "@type": "ListItem", position: i + 1, name: f.name, description: f.description })),
  });
  return json.replace(/</g, "\\" + "u003c");
}

const headline = esc(config.headline).replace(/\{(.+?)\}/, '<span class="pbf-gradient">$1</span>');
const { kpi, clients, integrations, workspace } = config.cards;
const runtime = {
  layout: config.layout,
  theme: config.theme,
  autoplay: config.autoplay,
  cards: {
    kpi: { datasets: kpi.datasets, insights: kpi.insights },
    clients,
    integrations,
    workspace: { invites: workspace.invites },
  },
};
const configJson = JSON.stringify(runtime, null, 2).replace(/</g, "\\" + "u003c");
const shared = {
  BADGE: esc(config.badge),
  HEADLINE: headline,
  SUB: esc(config.subheadline),
  KPI_ROWS: kpiRows(),
  KPI_SUMMARY: esc(kpiSummary()),
  KPI_TOTAL: money(config.cards.kpi.datasets.today.reduce((s, v) => s + v.value, 0)),
  GLOBE: globe(),
  CLIENTS: config.cards.clients.weekly.map(clientRow).join(""),
  TILES: tiles(),
  WIRES: wires(),
  STACK: stack(),
  MEMBERS: config.cards.workspace.members.map(memberRow).join(""),
  TASKS: tasks(),
  FEED: feed(),
  CONFIG: configJson,
};
config.features.forEach((f, i) => {
  shared[`F${i}_NAME`] = esc(f.name);
  shared[`F${i}_DESC`] = esc(f.description);
});

const fill = (template, values) =>
  template
    .replace(/\{\{icon:([\w-]+)(?::([^}]+))?\}\}/g, (_, name, cls) => icon(name, cls || "pbf-icon"))
    .replace(/\{\{(\w+)\}\}/g, (match, key) => (key in values ? values[key] : match));

const sectionHtml = (id, layout) =>
  fill(section, {
    ...shared,
    ID: id,
    CONFIG_ATTR: layout ? ` data-pbf-config='{"layout": "${layout}"}'` : "",
  });

const { css: tw } = await postcss([tailwind({ optimize: { minify: true } })]).process(twEntry, { from: src("tailwind.css") });
let html = page
  .replace(/\{\{SECTION:([\w-]+):(\w*)\}\}/g, (_, id, layout) => sectionHtml(id, layout))
  .replace("{{TAILWIND}}", () => tw)
  .replace("{{COMPONENT_CSS}}", () => css.trim())
  .replace("{{COMPONENT_JS}}", () => js.trim());
// One JSON-LD block for the page (the first section's features).
html = html.replace("</body>", () => `  <script type="application/ld+json">\n${schema()}\n    </script>\n  </body>`);
await writeFile(fileURLToPath(new URL("../index.html", import.meta.url)), html);
console.log(`index.html: ${(html.length / 1024).toFixed(1)} KB (Tailwind ${(tw.length / 1024).toFixed(1)} KB)`);
