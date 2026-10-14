// Camera filters as colour matrices: 20 numbers each, four rows of five (R, G, B, A, offset), offsets from 0 to 1.

export type ColorMatrix = number[];

export type CameraFilter = { key: string; name: string; matrix: ColorMatrix };

const LR = 0.2126;
const LG = 0.7152;
const LB = 0.0722;

const IDENTITY: ColorMatrix = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];

/** `b` applied after `a`. */
function then(a: ColorMatrix, b: ColorMatrix): ColorMatrix {
  const out: number[] = new Array(20).fill(0);
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      let sum = col === 4 ? b[row * 5 + 4] : 0;
      for (let k = 0; k < 4; k += 1) sum += b[row * 5 + k] * a[k * 5 + col];
      out[row * 5 + col] = sum;
    }
  }
  return out;
}

function saturation(s: number): ColorMatrix {
  const r = LR * (1 - s);
  const g = LG * (1 - s);
  const b = LB * (1 - s);
  return [r + s, g, b, 0, 0, r, g + s, b, 0, 0, r, g, b + s, 0, 0, 0, 0, 0, 1, 0];
}

function contrast(c: number, pivot = 0.5): ColorMatrix {
  const t = (1 - c) * pivot;
  return [c, 0, 0, 0, t, 0, c, 0, 0, t, 0, 0, c, 0, t, 0, 0, 0, 1, 0];
}

function gains(r: number, g: number, b: number): ColorMatrix {
  return [r, 0, 0, 0, 0, 0, g, 0, 0, 0, 0, 0, b, 0, 0, 0, 0, 0, 1, 0];
}

function lift(r: number, g: number, b: number): ColorMatrix {
  return [1, 0, 0, 0, r, 0, 1, 0, 0, g, 0, 0, 1, 0, b, 0, 0, 0, 1, 0];
}

function sepia(amount: number): ColorMatrix {
  const s: ColorMatrix = [0.393, 0.769, 0.189, 0, 0, 0.349, 0.686, 0.168, 0, 0, 0.272, 0.534, 0.131, 0, 0, 0, 0, 0, 1, 0];
  return IDENTITY.map((v, i) => v + (s[i] - v) * amount);
}

function chain(...steps: ColorMatrix[]): ColorMatrix {
  return steps.reduce((acc, step) => then(acc, step), IDENTITY);
}

export const FILTERS: CameraFilter[] = [
  { key: 'natural', name: 'Natural', matrix: IDENTITY },
  { key: 'vivid', name: 'Vivid', matrix: chain(saturation(1.4), contrast(1.12), gains(1.03, 1, 0.98)) },
  { key: 'warm', name: 'Warm', matrix: chain(gains(1.08, 1.0, 0.84), lift(0.025, 0.012, 0), saturation(1.08)) },
  { key: 'cool', name: 'Cool', matrix: chain(gains(0.88, 0.99, 1.1), lift(0, 0.012, 0.035), saturation(0.94)) },
  { key: 'noir', name: 'Noir', matrix: chain(saturation(0), contrast(1.38, 0.42), gains(0.96, 0.96, 0.96)) },
  { key: 'fade', name: 'Fade', matrix: chain(contrast(0.76), saturation(0.68), lift(0.07, 0.065, 0.06), gains(1.02, 1, 0.97)) },
  { key: 'dusk', name: 'Dusk', matrix: chain(gains(1.03, 0.84, 1.1), lift(0.045, 0, 0.07), contrast(1.06), saturation(1.12)) },
  { key: 'mint', name: 'Mint', matrix: chain(gains(0.86, 1.06, 1.0), lift(0, 0.035, 0.025), saturation(0.86), contrast(0.94)) },
  { key: 'retro', name: 'Retro', matrix: chain(sepia(0.62), contrast(0.88), lift(0.05, 0.035, 0.01), gains(1.06, 0.98, 0.86)) },
];

/** The matrices alone, for worklets. */
export const FILTER_MATRICES: number[][] = FILTERS.map((filter) => filter.matrix);

/** The filters' matrices blended at a fractional index (wrapping round the list), as the dial turns. */
export function blendFilters(matrices: number[][], at: number) {
  'worklet';
  const n = matrices.length;
  const base = Math.floor(at);
  const t = at - base;
  const a = matrices[((base % n) + n) % n];
  const b = matrices[(((base + 1) % n) + n) % n];
  const out: number[] = [];
  for (let i = 0; i < 20; i += 1) out.push(a[i] + (b[i] - a[i]) * t);
  return out;
}
