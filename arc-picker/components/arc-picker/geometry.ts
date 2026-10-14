// Where things sit on the dial. Every function here is a worklet, so the UI thread places the items each frame.

/** The dial's shape for one layout: plain numbers, captured by the worklets that place the items. */
export type ArcGeometry = {
  /** The circle's centre, across. The ring sits straight above (bottom arc) or below (top arc) it. */
  cx: number;
  /** The ring's centre, down. */
  apexY: number;
  radius: number;
  /** Distance along the arc from one item to the next. */
  step: number;
  /** Extra room either side of the ring, so the item that grows into it never touches its neighbours. */
  push: number;
  /** 1 left to right, -1 right to left. */
  dir: number;
  /** 1 for a bottom arc (centre below: the ends fall away), -1 for a top arc (centre above: the ends rise). */
  sign: number;
  /** The angle (radians) by which items have faded and shrunk to their faintest. */
  fadeAngle: number;
  /** Where the span ends, if it ends on screen: items fade out there. Infinity when the screen's edge comes first. */
  spanAngle: number;
  /** Beyond this angle an item is gone. */
  hideAngle: number;
  tangent: boolean;
  /** Items each side of the ring that can be seen, plus one. */
  reach: number;
};

/** Distance along the arc of an item `d` places from the ring. */
export function arcOffset(d: number, g: ArcGeometry) {
  'worklet';
  return d * g.step + Math.max(-1, Math.min(1, d)) * g.push;
}

/** The inverse of arcOffset: how many places from the ring a distance along the arc is. */
export function placesAt(s: number, g: ArcGeometry) {
  'worklet';
  const edge = g.step + g.push;
  if (Math.abs(s) <= edge) return s / edge;
  return Math.sign(s) * (1 + (Math.abs(s) - edge) / g.step);
}

/** An item's centre and its angle on the circle. */
export function placeOnArc(d: number, g: ArcGeometry) {
  'worklet';
  const theta = arcOffset(d, g) / g.radius;
  return {
    x: g.cx + g.dir * g.radius * Math.sin(theta),
    y: g.apexY + g.sign * g.radius * (1 - Math.cos(theta)),
    theta,
  };
}

/** `x` wrapped into [-n/2, n/2): the shortest way round a loop of n. */
export function wrapPlaces(x: number, n: number) {
  'worklet';
  return x - n * Math.round(x / n);
}

/** `i` wrapped into [0, n). */
export function wrapIndex(i: number, n: number) {
  'worklet';
  return ((i % n) + n) % n;
}

export function smooth(t: number) {
  'worklet';
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

export type ArcLayoutInput = {
  width: number;
  itemSize: number;
  ringSize: number;
  spacing: number;
  radius: number;
  span: number;
  position: 'bottom' | 'top';
  orientation: 'upright' | 'tangent';
  rtl: boolean;
  labelHeight: number;
};

/** Room for the ring's glow and the selected item's shadow, around everything. */
export const GLOW_ROOM = 16;
const MAX_ANGLE = (80 * Math.PI) / 180;

/** The dial's geometry and its height for a width. Runs on the JS thread, once per layout. */
export function layoutArc(input: ArcLayoutInput): { geometry: ArcGeometry; height: number; labelTop: number } {
  const { width, itemSize, ringSize, spacing, radius, span, position, orientation, rtl, labelHeight } = input;
  const step = itemSize + spacing;
  const push = Math.max(0, ringSize / 2 - itemSize / 2) + spacing * 0.5;
  const spanHalf = Math.min(MAX_ANGLE, (span * Math.PI) / 360);
  const screenHalf = Math.asin(Math.min(1, (width / 2 + itemSize) / radius));
  const fadeAngle = Math.min(spanHalf, screenHalf);
  const stepAngle = step / radius;
  const spanAngle = spanHalf < screenHalf ? spanHalf : Infinity;
  const hideAngle = Math.min(spanHalf + stepAngle, Math.min(MAX_ANGLE, screenHalf + stepAngle));
  const reach = Math.max(1, Math.ceil((hideAngle * radius - push) / step)) + 1;
  // How far the ends of the visible arc fall (or rise) from the ring.
  const drop = radius * (1 - Math.cos(fadeAngle)) + itemSize / 2;
  const below = Math.max(ringSize / 2, position === 'bottom' ? drop : 0);
  const above = Math.max(ringSize / 2, position === 'top' ? drop : 0);
  const apexY = GLOW_ROOM + above;
  const labelTop = labelHeight > 0 ? apexY + ringSize / 2 + 12 : 0;
  const bottom = Math.max(apexY + below, labelTop + labelHeight);
  return {
    geometry: {
      cx: width / 2,
      apexY,
      radius,
      step,
      push,
      dir: rtl ? -1 : 1,
      sign: position === 'bottom' ? 1 : -1,
      fadeAngle,
      spanAngle,
      hideAngle,
      tangent: orientation === 'tangent',
      reach,
    },
    height: Math.ceil(bottom + GLOW_ROOM),
    labelTop,
  };
}
