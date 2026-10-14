// Worklet helpers. Each one is defined before the helpers that call it: on the web a worklet's closure is taken
// where it is defined, so an earlier helper would see a later one as undefined.

export function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

/** 0 at `edge0`, 1 at `edge1`, eased at both ends. */
export function smoothstep(edge0: number, edge1: number, x: number) {
  'worklet';
  if (edge1 === edge0) return x < edge0 ? 0 : 1;
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Past `min` or `max` the value gives way less and less, like a rubber band (`span` is how far it can stretch). */
export function rubberBand(value: number, min: number, max: number, span: number) {
  'worklet';
  if (value >= min && value <= max) return value;
  const over = value < min ? min - value : value - max;
  const give = (1 - 1 / ((over * 0.55) / span + 1)) * span;
  return value < min ? min - give : max + give;
}

/** Where `position` sits among the items' centres, as a fractional index (2.5 is halfway from item 2 to item 3). */
export function fractionalIndex(position: number, centers: number[]) {
  'worklet';
  const count = centers.length;
  if (count === 0) return 0;
  if (position <= centers[0]) return 0;
  if (position >= centers[count - 1]) return count - 1;
  let low = 0;
  let high = count - 1;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (centers[middle] <= position) low = middle;
    else high = middle;
  }
  const span = centers[high] - centers[low];
  return span > 0 ? low + (position - centers[low]) / span : low;
}

/** The item whose centre is nearest to `position`, in pixels. */
export function nearestIndex(position: number, centers: number[]) {
  'worklet';
  const at = fractionalIndex(position, centers);
  const low = Math.floor(at);
  const high = Math.min(low + 1, centers.length - 1);
  return Math.abs(centers[low] - position) <= Math.abs(centers[high] - position) ? low : high;
}

/** The item under a point of the content (its top edge at `y`), or -1. */
export function indexAtY(y: number, offsets: number[], heights: number[]) {
  'worklet';
  let low = 0;
  let high = offsets.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (y < offsets[middle]) high = middle - 1;
    else if (y >= offsets[middle] + heights[middle]) low = middle + 1;
    else return middle;
  }
  return -1;
}
