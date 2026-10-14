// The liquid shapes, as plain geometry: a neck between the bar's top edge and a bubble, a bridge between two bubbles,
// and the bar's edge with a smooth notch. Everything is computed per frame in worklets and drawn as one anti-aliased
// path, so it can take a real shadow and a hairline (a blur-and-threshold "goo" filter can't).
//
// Each helper is defined before the helpers that call it: on the web a worklet's closure is taken where it's
// defined, so an earlier helper would see a later one as undefined.

import { Skia, type SkPath } from '@shopify/react-native-skia';

export function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

export function smoothstep(edge0: number, edge1: number, x: number) {
  'worklet';
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function lerp(a: number, b: number, t: number) {
  'worklet';
  return a + (b - a) * t;
}

/** How far the neck may open, in radians from the bubble's lowest point. */
const NECK_ANGLE = 0.66;

/**
 * Adds the neck between the bar's top edge (the line y = `edge`) and a bubble centred at (bx, by), its feet centred
 * at `footX`. `strength` runs from 1 (a wide, settled neck) to 0 (pinched to nothing). The shape closes along the
 * bar's edge and through the bubble, so filled together with the bar and the bubble it leaves no gap.
 */
export function addNeck(
  path: SkPath,
  edge: number,
  footX: number,
  bx: number,
  by: number,
  rx: number,
  ry: number,
  strength: number,
) {
  'worklet';
  if (strength <= 0.002) return;
  const angle = NECK_ANGLE * Math.pow(strength, 0.8);
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const leftX = bx - rx * sin;
  const rightX = bx + rx * sin;
  const pointY = by + ry * cos;
  const spread = rx * (0.55 + 0.5 * strength);
  const gap = Math.max(edge - pointY, 1);
  const lift = Math.max(2, gap * 0.7) * (0.35 + 0.65 * strength);
  // The feet lean a little after a bubble that isn't straight above them, so the neck bends instead of kinking.
  const base = footX + (bx - footX) * 0.4;
  const footL = base - spread;
  const footR = base + spread;
  path.moveTo(footL, edge);
  path.cubicTo(footL + (leftX - footL) * 0.75, edge, leftX + cos * lift, pointY + sin * lift, leftX, pointY);
  path.lineTo(rightX, pointY);
  path.cubicTo(rightX - cos * lift, pointY + sin * lift, footR + (rightX - footR) * 0.75, edge, footR, edge);
  path.close();
}

/**
 * Adds the liquid bridge between two circles (a metaball), or nothing once they're too far apart. `spread` (0 to 1)
 * is how far round each circle the bridge reaches; the bridge thins as the circles part and snaps past
 * `r1 + r2 * reach`.
 */
export function addBridge(
  path: SkPath,
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number,
  spread = 0.5,
  reach = 2.1,
) {
  'worklet';
  const d = Math.hypot(x2 - x1, y2 - y1);
  if (r1 <= 0 || r2 <= 0 || d > r1 + r2 * reach || d <= Math.abs(r1 - r2) + 0.5) return;
  let u1 = 0;
  let u2 = 0;
  if (d < r1 + r2) {
    u1 = Math.acos(clamp((r1 * r1 + d * d - r2 * r2) / (2 * r1 * d), -1, 1));
    u2 = Math.acos(clamp((r2 * r2 + d * d - r1 * r1) / (2 * r2 * d), -1, 1));
  }
  const between = Math.atan2(y2 - y1, x2 - x1);
  const maxSpread = Math.acos(clamp((r1 - r2) / d, -1, 1));
  const a1 = between + u1 + (maxSpread - u1) * spread;
  const a2 = between - u1 - (maxSpread - u1) * spread;
  const a3 = between + Math.PI - u2 - (Math.PI - u2 - maxSpread) * spread;
  const a4 = between - Math.PI + u2 + (Math.PI - u2 - maxSpread) * spread;
  const p1x = x1 + Math.cos(a1) * r1;
  const p1y = y1 + Math.sin(a1) * r1;
  const p2x = x1 + Math.cos(a2) * r1;
  const p2y = y1 + Math.sin(a2) * r1;
  const p3x = x2 + Math.cos(a3) * r2;
  const p3y = y2 + Math.sin(a3) * r2;
  const p4x = x2 + Math.cos(a4) * r2;
  const p4y = y2 + Math.sin(a4) * r2;
  const total = r1 + r2;
  const handle = Math.min(spread * 2.4, Math.hypot(p3x - p1x, p3y - p1y) / total) * Math.min(1, (d * 2) / total);
  const h1 = r1 * handle;
  const h2 = r2 * handle;
  const half = Math.PI / 2;
  path.moveTo(p1x, p1y);
  path.cubicTo(
    p1x + Math.cos(a1 - half) * h1,
    p1y + Math.sin(a1 - half) * h1,
    p3x + Math.cos(a3 + half) * h2,
    p3y + Math.sin(a3 + half) * h2,
    p3x,
    p3y,
  );
  path.lineTo(p4x, p4y);
  path.cubicTo(
    p4x + Math.cos(a4 - half) * h2,
    p4y + Math.sin(a4 - half) * h2,
    p2x + Math.cos(a2 + half) * h1,
    p2y + Math.sin(a2 + half) * h1,
    p2x,
    p2y,
  );
  path.close();
}

export type Notch = { x: number; depth: number; half: number };

/**
 * The bar: its top edge at `edge`, with smooth bell-shaped notches dipping into it (sorted, not overlapping), down to
 * `bottom`. The sides reach past the canvas so the hairline never shows there.
 */
export function addBar(path: SkPath, width: number, edge: number, bottom: number, notches: Notch[]) {
  'worklet';
  path.moveTo(-4, bottom);
  path.lineTo(-4, edge);
  for (const notch of notches) {
    if (notch.depth < 0.25) continue;
    const { x, depth, half } = notch;
    path.lineTo(x - half, edge);
    path.cubicTo(x - half * 0.48, edge, x - half * 0.52, edge + depth, x, edge + depth);
    path.cubicTo(x + half * 0.52, edge + depth, x + half * 0.48, edge, x + half, edge);
  }
  path.lineTo(width + 4, edge);
  path.lineTo(width + 4, bottom);
  path.close();
}

export function addEllipse(path: SkPath, x: number, y: number, rx: number, ry: number) {
  'worklet';
  path.addOval(Skia.XYWHRect(x - rx, y - ry, rx * 2, ry * 2));
}
