// Colours mixed in OKLab, so red on its way to near-black stays a clean, darkening red (never a muddy brown) and
// green on its way to white stays green. Worklets: the button blends its fill every frame.

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
export function toLab(hex: string): Lab {
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

/**
 * OKLab to `rgba()`. `p3`: give the numbers in Display P3 instead of sRGB. React Native Skia's web canvas marks its
 * drawing buffer as Display P3 but draws the sRGB numbers it's given, so on the web every colour comes out more
 * saturated than asked for (a #D7343A red showed as #EA1431); in P3 numbers it shows as intended.
 */
export function fromLab(lab: Lab, alpha = 1, p3 = false) {
  'worklet';
  const l = Math.pow(lab[0] + 0.3963377774 * lab[1] + 0.2158037573 * lab[2], 3);
  const m = Math.pow(lab[0] - 0.1055613458 * lab[1] - 0.0638541728 * lab[2], 3);
  const s = Math.pow(lab[0] - 0.0894841775 * lab[1] - 1.291485548 * lab[2], 3);
  let lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  if (p3) {
    // Linear sRGB to linear Display P3 (same white, wider primaries).
    const pr = 0.8224621 * lr + 0.177538 * lg + 0.0000001 * lb;
    const pg = 0.0331941 * lr + 0.9668058 * lg + 0.0000001 * lb;
    const pb = 0.0170827 * lr + 0.0723974 * lg + 0.9105199 * lb;
    lr = pr;
    lg = pg;
    lb = pb;
  }
  const r = toGamma(lr);
  const g = toGamma(lg);
  const b = toGamma(lb);
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha})`;
}

/** A `#RRGGBB` colour as the Skia canvas wants it on this platform (see `fromLab`). */
export function canvasColor(hex: string, alpha = 1, p3 = false) {
  'worklet';
  return fromLab(toLab(hex), alpha, p3);
}

export function mixLab(a: Lab, b: Lab, t: number): Lab {
  'worklet';
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
