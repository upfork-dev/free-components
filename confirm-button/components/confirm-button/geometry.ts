// The liquid between the pill and the cancel bubble: a neck of two cubic curves, each leaving one circle and
// arriving at the other along their tangents, so the joins are smooth. Worklets, run every frame.

import type { SkPathBuilder } from '@shopify/react-native-skia';

function clamp(v: number, lo: number, hi: number) {
  'worklet';
  return v < lo ? lo : v > hi ? hi : v;
}

export function smoothstep(edge0: number, edge1: number, x: number) {
  'worklet';
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Adds the neck between circle 1 (the pill's end cap) and circle 2 (the bubble). `waist` runs from 1 (a full,
 * settled join) to 0 (pinched to a thread): how far round each circle the neck takes hold, and how deep its curves
 * sag. Nothing is added while the circles still overlap enough to need none.
 */
export function addNeck(path: SkPathBuilder, x1: number, y1: number, r1: number, x2: number, y2: number, r2: number, waist: number) {
  'worklet';
  const d = Math.hypot(x2 - x1, y2 - y1);
  if (r1 <= 0 || r2 <= 0 || d <= Math.abs(r1 - r2) + 0.5 || d < 1e-3) return;
  // Where the circles cross, if they do: the neck starts at least there.
  let u1 = 0;
  let u2 = 0;
  if (d < r1 + r2) {
    u1 = Math.acos(clamp((r1 * r1 + d * d - r2 * r2) / (2 * r1 * d), -1, 1));
    u2 = Math.acos(clamp((r2 * r2 + d * d - r1 * r1) / (2 * r2 * d), -1, 1));
  }
  const toward = Math.atan2(y2 - y1, x2 - x1);
  // The widest the neck could hold on: the outer tangent's angle.
  const widest = Math.acos(clamp((r1 - r2) / d, -1, 1));
  const spread = 0.12 + 0.5 * waist;
  const a1 = toward + u1 + (widest - u1) * spread;
  const a2 = toward - u1 - (widest - u1) * spread;
  const a3 = toward + Math.PI - u2 - (Math.PI - u2 - widest) * spread;
  const a4 = toward - Math.PI + u2 + (Math.PI - u2 - widest) * spread;
  const p1x = x1 + Math.cos(a1) * r1;
  const p1y = y1 + Math.sin(a1) * r1;
  const p2x = x1 + Math.cos(a2) * r1;
  const p2y = y1 + Math.sin(a2) * r1;
  const p3x = x2 + Math.cos(a3) * r2;
  const p3y = y2 + Math.sin(a3) * r2;
  const p4x = x2 + Math.cos(a4) * r2;
  const p4y = y2 + Math.sin(a4) * r2;
  // Handle lengths: long enough to sag into a waist, never so long the curves cross.
  const span = Math.hypot(p3x - p1x, p3y - p1y);
  const handle = clamp(span / (r1 + r2), 0, 1) * (0.55 + 0.45 * (1 - waist)) * Math.min(1, (d * 2) / (r1 + r2));
  const h1 = r1 * handle;
  const h2 = r2 * handle;
  const q = Math.PI / 2;
  path.moveTo(p1x, p1y);
  path.cubicTo(p1x + Math.cos(a1 - q) * h1, p1y + Math.sin(a1 - q) * h1, p3x + Math.cos(a3 + q) * h2, p3y + Math.sin(a3 + q) * h2, p3x, p3y);
  path.lineTo(p4x, p4y);
  path.cubicTo(p4x + Math.cos(a4 - q) * h2, p4y + Math.sin(a4 - q) * h2, p2x + Math.cos(a2 + q) * h1, p2y + Math.sin(a2 + q) * h1, p2x, p2y);
  path.close();
}

/**
 * A fill from the pill's leading edge to `front`, its front edge a gentle wave (not a hard line) that moves with
 * `phase`. `dir` is 1 for left to right, −1 for right to left.
 */
export function addWaveFill(path: SkPathBuilder, left: number, top: number, width: number, height: number, front: number, phase: number, amplitude: number, dir: number) {
  'worklet';
  const steps = 14;
  const start = dir > 0 ? left - 2 : left + width + 2;
  path.moveTo(start, top - 2);
  for (let i = 0; i <= steps; i++) {
    const y = top - 2 + ((height + 4) * i) / steps;
    const wave = Math.sin((i / steps) * Math.PI * 2.2 + phase) * amplitude;
    path.lineTo(front + wave * dir, y);
  }
  path.lineTo(start, top + height + 2);
  path.close();
}
