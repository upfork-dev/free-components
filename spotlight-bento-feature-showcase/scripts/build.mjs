// Builds index.html from src/: compiles the Tailwind utilities the page uses, pre-renders the feature list,
// the tiles and the JSON-LD from src/features.json (so the section works without JavaScript and is
// indexable), and inlines the component's CSS and JS. Run: npm run build
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

const src = (file) => fileURLToPath(new URL(`../src/${file}`, import.meta.url));
const read = (file) => readFile(src(file), "utf8");
const [page, componentCss, componentJs, tailwindEntry, dataText] = await Promise.all(
  ["page.html", "sfs.css", "sfs.js", "tailwind.css", "features.json"].map(read),
);
const data = JSON.parse(dataText);

// Reuse the component's own templates and JSON-LD, so build and runtime can never drift apart.
const fakeMedia = () => ({ matches: false, addEventListener() {} });
const sandbox = { window: { matchMedia: fakeMedia }, document: { querySelectorAll: () => [] } };
vm.runInNewContext(componentJs, sandbox);
const { stepHTML, tileHTML, schema } = sandbox.window.SpotlightFeatureShowcase;

const steps = data.features.map((f, i, all) => stepHTML(f, i, all)).join("\n");
const tiles = data.features.map((f, i) => tileHTML(f, i)).join("\n");
const json = JSON.stringify(data, null, 2).replace(/</g, "\\" + "u003c");
const { css } = await postcss([tailwind({ optimize: { minify: true } })]).process(tailwindEntry, {
  from: src("tailwind.css"),
});

const html = page
  .replace("{{TAILWIND}}", () => css)
  .replace("{{COMPONENT_CSS}}", () => componentCss.trim())
  .replace("{{STEPS}}", () => steps)
  .replace("{{TILES}}", () => tiles)
  .replaceAll("{{DATA}}", () => json)
  .replace("{{SCHEMA}}", () => schema(data))
  .replace("{{COMPONENT_JS}}", () => componentJs.trim());
await writeFile(fileURLToPath(new URL("../index.html", import.meta.url)), html);
console.log(`index.html: ${(html.length / 1024).toFixed(1)} KB (Tailwind ${(css.length / 1024).toFixed(1)} KB)`);
