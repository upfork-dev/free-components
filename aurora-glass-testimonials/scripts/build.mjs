// Builds index.html from src/: compiles the Tailwind utilities the page uses, pre-renders the cards and
// the JSON-LD from src/testimonials.json (so the section works without JavaScript and is indexable),
// and inlines the component's CSS and JS. Run: npm run build
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

const src = (file) => fileURLToPath(new URL(`../src/${file}`, import.meta.url));
const read = (file) => readFile(src(file), "utf8");
const [page, componentCss, componentJs, tailwindEntry, dataText] = await Promise.all(
  ["page.html", "agt.css", "agt.js", "tailwind.css", "testimonials.json"].map(read),
);
const data = JSON.parse(dataText);

// Reuse the component's own card template and JSON-LD, so build and runtime can never drift apart.
const fakeMedia = () => ({ matches: false, addEventListener() {} });
const sandbox = { window: { matchMedia: fakeMedia }, document: { querySelectorAll: () => [] } };
vm.runInNewContext(componentJs, sandbox);
const { cardHTML, schema } = sandbox.window.AuroraGlassTestimonials;

const cards = data.reviews.map((review, i) => cardHTML(review, i, data.reviews.length)).join("\n");
const json = JSON.stringify(data, null, 2).replace(/</g, "\\" + "u003c");
const { css } = await postcss([tailwind({ optimize: { minify: true } })]).process(tailwindEntry, {
  from: src("tailwind.css"),
});

const html = page
  .replace("{{TAILWIND}}", () => css)
  .replace("{{COMPONENT_CSS}}", () => componentCss.trim())
  .replace("{{CARDS}}", () => cards)
  .replaceAll("{{DATA}}", () => json)
  .replace("{{SCHEMA}}", () => schema(data))
  .replace("{{COMPONENT_JS}}", () => componentJs.trim());
await writeFile(fileURLToPath(new URL("../index.html", import.meta.url)), html);
console.log(`index.html: ${(html.length / 1024).toFixed(1)} KB (Tailwind ${(css.length / 1024).toFixed(1)} KB)`);
