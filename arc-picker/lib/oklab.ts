// Colours mixed in OKLab, so a blend from one colour to the next passes through clean colours, not grey. Worklets.

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
  const v = parseInt(hex.slice(1, 7), 16);
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

/** OKLab to an `rgb()` string. */
export function labToRgb(lab: Lab) {
  'worklet';
  const l = Math.pow(lab[0] + 0.3963377774 * lab[1] + 0.2158037573 * lab[2], 3);
  const m = Math.pow(lab[0] - 0.1055613458 * lab[1] - 0.0638541728 * lab[2], 3);
  const s = Math.pow(lab[0] - 0.0894841775 * lab[1] - 1.291485548 * lab[2], 3);
  const r = toGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const g = toGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const b = toGamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
}

/** Colours (in OKLab) blended at a fractional index; `wrap` joins the last to the first. */
export function mixLabs(labs: Lab[], at: number, wrap: boolean) {
  'worklet';
  const n = labs.length;
  const clamped = wrap ? at : Math.min(Math.max(at, 0), n - 1);
  const base = Math.floor(clamped);
  const t = clamped - base;
  const a = labs[((base % n) + n) % n];
  const b = labs[wrap ? (((base + 1) % n) + n) % n : Math.min(base + 1, n - 1)];
  return labToRgb([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
}
