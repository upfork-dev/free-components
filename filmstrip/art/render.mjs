// Renders art/scenes.sksl into the demos' pictures, on the CPU with CanvasKit (Skia's WebAssembly build):
//   node art/render.mjs [out-dir] [long-side] [only, e.g. 1,5]
// CanvasKit comes with @shopify/react-native-skia; without it, `npm install --no-save canvaskit-wasm` first.
// Writes <out>/<n>-<name>.png; art/webp.py turns them into assets/scenes/*.webp of at most 120 KB.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
// Resolved from the product's folder: in UpFork's kit that finds the kit's packages, in a standalone app its own.
const require = createRequire(join(here, '../package.json'));
const CanvasKitInit = require('canvaskit-wasm/bin/full/canvaskit.js');
const wasmDir = dirname(require.resolve('canvaskit-wasm/bin/full/canvaskit.wasm'));

export const SCENES = [
  ['dunes', 3, 2],
  ['alpine-lake', 4, 3],
  ['foggy-forest', 3, 4],
  ['sea-cliffs', 16, 9],
  ['city-at-dusk', 16, 9],
  ['aurora', 4, 5],
  ['desert-road', 2, 3],
  ['rice-terraces', 4, 3],
  ['lavender', 16, 9],
  ['peaks-at-dawn', 2, 3],
  ['lagoon', 9, 16],
  ['canyon', 3, 4],
  ['harbour', 3, 2],
  ['autumn-hills', 16, 9],
];

const out = process.argv[2] ?? join(here, 'out');
const long = Number(process.argv[3] ?? 1200);
const only = process.argv[4] ? process.argv[4].split(',').map(Number) : null;
mkdirSync(out, { recursive: true });

const CK = await CanvasKitInit({ locateFile: (file) => join(wasmDir, file) });
const effect = CK.RuntimeEffect.Make(readFileSync(join(here, 'scenes.sksl'), 'utf8'), (error) => console.error(error));
if (!effect) process.exit(1);

for (const [i, [name, w, h]] of SCENES.entries()) {
  if (only && !only.includes(i)) continue;
  const width = w >= h ? long : Math.round((long * w) / h);
  const height = w >= h ? Math.round((long * h) / w) : long;
  const started = Date.now();
  const surface = CK.MakeSurface(width, height);
  const paint = new CK.Paint();
  paint.setShader(effect.makeShader([width, height, i]));
  surface.getCanvas().drawRect(CK.XYWHRect(0, 0, width, height), paint);
  const image = surface.makeImageSnapshot();
  const png = image.encodeToBytes(CK.ImageFormat.PNG, 100);
  const file = join(out, `${String(i).padStart(2, '0')}-${name}.png`);
  writeFileSync(file, png);
  console.log(`${file} ${width}×${height} ${Date.now() - started} ms`);
  image.delete();
  paint.delete();
  surface.delete();
}
