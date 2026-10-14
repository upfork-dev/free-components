// When each piece of a morph may start, so that no two pieces ever cover each other: the JS side
// plans it once per change; the UI thread only plays it.

import type { WithSpringConfig } from 'react-native-reanimated';

export const DEFAULT_SPRING = { stiffness: 300, damping: 30, mass: 1 } as const;

const STEP = 4; // ms
const HORIZON = 1200; // ms

const curves = new Map<string, Float32Array>();

/**
 * How far (0 → 1) a spring has gone after each 4 ms, from rest. Reanimated's springs solve the same
 * equation, so this predicts where a moving piece will be without asking the UI thread.
 */
export function springCurve(config: WithSpringConfig = DEFAULT_SPRING): Float32Array {
  const stiffness = config.stiffness ?? DEFAULT_SPRING.stiffness;
  const damping = config.damping ?? DEFAULT_SPRING.damping;
  const mass = config.mass ?? DEFAULT_SPRING.mass;
  const duration = (config as { duration?: number }).duration;
  const key = duration ? `d${duration}` : `${stiffness}/${damping}/${mass}`;
  let curve = curves.get(key);
  if (curve) return curve;
  curve = new Float32Array(HORIZON / STEP + 1);
  if (duration) {
    // A spring given by its duration: close enough to an ease-out of that length.
    for (let k = 0; k < curve.length; k++) {
      const t = Math.min(1, (k * STEP) / duration);
      curve[k] = 1 - (1 - t) ** 3;
    }
  } else {
    let x = 0;
    let v = 0;
    const dt = 0.001;
    for (let k = 0; k < curve.length; k++) {
      curve[k] = x;
      for (let s = 0; s < STEP; s++) {
        const a = (-stiffness * (x - 1) - damping * v) / mass;
        v += a * dt;
        x += v * dt;
      }
    }
  }
  curves.set(key, curve);
  return curve;
}

export type Span = { x: number; w: number };

/** Whether [a0, a1] covers more than `slack` px of [b0, b1]. */
const overlaps = (a0: number, a1: number, b0: number, b1: number, slack = 0.5) =>
  Math.min(a1, b1) - Math.max(a0, b0) > slack;

/**
 * The first moment (ms after the move starts) from which a piece travelling from `from` to `to`
 * never again covers more than `slack` of `spot` (a fraction of its width). 0 when it never does.
 */
export function clearTime(curve: Float32Array, from: Span, to: Span, spot: Span, slack = 0): number {
  let last = -1;
  for (let k = 0; k < curve.length; k++) {
    const f = curve[k];
    const x = from.x + (to.x - from.x) * f;
    const w = from.w + (to.w - from.w) * f;
    if (overlaps(x, x + w, spot.x, spot.x + spot.w, Math.max(0.5, spot.w * slack))) last = k;
  }
  return last < 0 ? 0 : (last + 1) * STEP;
}

/** The first moment a piece travelling from `from` to `to` covers more than `slack` of `spot`. */
export function reachTime(curve: Float32Array, from: Span, to: Span, spot: Span, slack = 0): number {
  for (let k = 0; k < curve.length; k++) {
    const f = curve[k];
    const x = from.x + (to.x - from.x) * f;
    const w = from.w + (to.w - from.w) * f;
    if (overlaps(x, x + w, spot.x, spot.x + spot.w, Math.max(0.5, spot.w * slack))) return k * STEP;
  }
  return Infinity;
}
