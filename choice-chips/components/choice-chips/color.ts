// Small colour helpers, so the chips need no colour package.

export type RGB = [number, number, number];

export function parseColor(color: string): RGB | null {
  const hex = color.trim();
  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (long) return [parseInt(long[1], 16), parseInt(long[2], 16), parseInt(long[3], 16)];
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(hex);
  if (short) return [parseInt(short[1] + short[1], 16), parseInt(short[2] + short[2], 16), parseInt(short[3] + short[3], 16)];
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(hex);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return null;
}

export function rgba(color: string, alpha: number) {
  const c = parseColor(color);
  return c ? `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})` : color;
}

function channel(value: number) {
  const v = value / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function luminance(c: RGB) {
  return 0.2126 * channel(c[0]) + 0.7152 * channel(c[1]) + 0.0722 * channel(c[2]);
}

export function contrast(a: RGB, b: RGB) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
}

function hex(c: RGB) {
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * The accent, darkened (on light) or lightened (on dark) just enough to read at 4.5:1 on `background`, so selected
 * labels stay readable whatever accent you pick.
 */
export function readableOn(accent: string, background: string, ratio = 4.5) {
  const a = parseColor(accent);
  const bg = parseColor(background);
  if (!a || !bg) return accent;
  const target: RGB = luminance(bg) > 0.4 ? [0, 0, 0] : [255, 255, 255];
  let t = 0;
  let out = a;
  while (contrast(out, bg) < ratio && t < 1) {
    t += 0.05;
    out = mix(a, target, t);
  }
  return hex(out);
}

/** White or near-black, whichever reads better on `color`. */
export function onColor(color: string) {
  const c = parseColor(color);
  if (!c) return '#FFFFFF';
  return contrast(c, [255, 255, 255]) >= contrast(c, [17, 17, 20]) ? '#FFFFFF' : '#111114';
}

/** `top` laid over `bottom` at `alpha`, as an opaque colour. */
export function over(top: string, bottom: string, alpha: number) {
  const t = parseColor(top);
  const b = parseColor(bottom);
  if (!t || !b) return top;
  return hex(mix(b, t, alpha));
}
