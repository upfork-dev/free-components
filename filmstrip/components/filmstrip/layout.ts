// Where every thumbnail sits and how wide it shows, as plain functions of one float index. Worklets:
// the strip calls them on the UI thread every frame, for the few items near the centre that differ.

/** 0 → 1 with zero slope at both ends. */
export function smoothstep(x: number) {
  'worklet';
  const t = x < 0 ? 0 : x > 1 ? 1 : x;
  return t * t * (3 - 2 * t);
}

/** How open item `i` is at `pos`: 1 in the centre, 0 one item or more away. */
export function openness(i: number, pos: number) {
  'worklet';
  return 1 - smoothstep(Math.abs(i - pos));
}

/** The width item `i` shows at `pos`: its open width in the centre, a sliver one item away. */
export function shownWidth(i: number, pos: number, opens: readonly number[], sliver: number) {
  'worklet';
  const o = opens[i] ?? sliver;
  return sliver + (o - sliver) * openness(i, pos);
}

/**
 * Item `i`'s centre, measured from the strip's focus (the point under the strip's middle), at `pos`.
 * Only the two items either side of `pos` are wider than a sliver, so every left edge is a multiple of
 * (sliver + gap) plus at most two corrections.
 */
export function centerOf(i: number, pos: number, opens: readonly number[], sliver: number, gap: number, count: number) {
  'worklet';
  const unit = sliver + gap;
  // Past either end the end item stays open and the strip slides on.
  let p = pos;
  let shift = 0;
  if (p < 0) {
    shift = p * unit;
    p = 0;
  } else if (p > count - 1) {
    shift = (p - (count - 1)) * unit;
    p = count - 1;
  }
  const k = Math.floor(p);
  const f = p - k;
  const k1 = Math.min(k + 1, count - 1);
  const wk = shownWidth(k, p, opens, sliver);
  const wk1 = k1 !== k ? shownWidth(k1, p, opens, sliver) : wk;
  const extraK = wk - sliver;
  const extraK1 = k1 !== k ? wk1 - sliver : 0;
  const leftOf = (j: number) => j * unit + (j > k ? extraK : 0) + (j > k1 ? extraK1 : 0);
  const ck = leftOf(k) + wk / 2;
  const ck1 = leftOf(k1) + wk1 / 2;
  const focus = ck + (ck1 - ck) * f;
  return leftOf(i) + shownWidth(i, p, opens, sliver) / 2 - focus - shift;
}

/** The open width of an item of this shape: its aspect at the thumb's height, kept within 0.75–2.2×. */
export function openWidth(width: number, height: number, thumb: number) {
  const aspect = width > 0 && height > 0 ? width / height : 1;
  return Math.round(Math.min(Math.max(thumb * aspect, thumb * 0.75), thumb * 2.2));
}

/** A pointer's speed (points a second) from samples [x, t, x, t, …]: Gesture Handler's is sometimes 0 on the web. */
export function trackedSpeed(samples: number[]) {
  'worklet';
  const n = samples.length;
  if (n < 4) return 0;
  const x1 = samples[n - 2];
  const t1 = samples[n - 1];
  let k = n - 4;
  while (k >= 2 && t1 - samples[k - 1] <= 100) k -= 2;
  const dt = t1 - samples[k + 1];
  return dt > 0 ? ((x1 - samples[k]) / dt) * 1000 : 0;
}

/** How far (in items) a decay with deceleration 0.994 travels from `velocity` items a second. */
export function decayTravel(velocity: number) {
  'worklet';
  // Reanimated's decay loses a factor of 0.994 per ms: it covers v / (-ln 0.994 × 1000).
  return velocity * 0.1662;
}

export const clamp = (v: number, lo: number, hi: number) => {
  'worklet';
  return v < lo ? lo : v > hi ? hi : v;
};
