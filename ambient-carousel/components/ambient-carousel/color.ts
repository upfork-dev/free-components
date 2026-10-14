// Colours in OKLab: blends from one palette to the next pass through clean colours, never grey or mud. Worklets.

export type Lab = [number, number, number];

function toLinear(c: number) {
  'worklet';
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function toGamma(c: number) {
  'worklet';
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.min(1, Math.max(0, v));
}

/** `#RRGGBB` to OKLab. */
export function hexToLab(hex: string): Lab {
  'worklet';
  const v = parseInt(hex.replace('#', '').slice(0, 6), 16);
  const r = toLinear(((v >> 16) & 255) / 255);
  const g = toLinear(((v >> 8) & 255) / 255);
  const b = toLinear((v & 255) / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** OKLab to `rgba()`, at an alpha. */
export function labToRgba(lab: Lab, alpha = 1) {
  'worklet';
  const l = Math.pow(lab[0] + 0.3963377774 * lab[1] + 0.2158037573 * lab[2], 3);
  const m = Math.pow(lab[0] - 0.1055613458 * lab[1] - 0.0638541728 * lab[2], 3);
  const s = Math.pow(lab[0] - 0.0894841775 * lab[1] - 1.291485548 * lab[2], 3);
  const r = toGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const g = toGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const b = toGamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha})`;
}

export function mixLab(a: Lab, b: Lab, t: number): Lab {
  'worklet';
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Two colours (`#RRGGBB`) mixed in OKLab: `oklabMix('#14B8A6', '#FB7185', 0.5)`. */
export function oklabMix(a: string, b: string, t: number) {
  'worklet';
  return labToRgba(mixLab(hexToLab(a), hexToLab(b), t));
}

/** A pastel of a colour: lighter and quieter, for the light stage. */
export function pastel(lab: Lab): Lab {
  'worklet';
  return [0.86 + (lab[0] - 0.86) * 0.25, lab[1] * 0.55, lab[2] * 0.55];
}

/** A colour for light on a dark stage: never paler than a glow should be, and a touch richer. */
export function glowing(lab: Lab): Lab {
  'worklet';
  return [Math.min(lab[0], 0.74), lab[1] * 1.18, lab[2] * 1.18];
}

/** Each item's palette as three OKLab colours (two-colour palettes repeat their first). */
export function paletteLabs(colors: readonly string[]): [Lab, Lab, Lab] {
  const labs = colors.map((c) => hexToLab(c));
  return [labs[0], labs[1] ?? labs[0], labs[2] ?? labs[0]];
}
