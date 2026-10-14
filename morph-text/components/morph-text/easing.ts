// Easing curves that hold still outside 0…1. On the web, an animation's first frame can come with a
// timestamp from just before the animation started, so its time is slightly negative; the stock
// curves extrapolate that into a jump the wrong way (a leaving "+" flashed at 1.45× for a frame).

const clamp = (t: number) => {
  'worklet';
  return t < 0 ? 0 : t > 1 ? 1 : t;
};

export const linear = (t: number) => {
  'worklet';
  return clamp(t);
};

export const outQuad = (t: number) => {
  'worklet';
  const c = clamp(t);
  return 1 - (1 - c) * (1 - c);
};

export const outCubic = (t: number) => {
  'worklet';
  const c = 1 - clamp(t);
  return 1 - c * c * c;
};

/** Quick start, long soft landing: a digit roll that arrives exactly and never lingers. */
export const outQuart = (t: number) => {
  'worklet';
  const c = 1 - clamp(t);
  return 1 - c * c * c * c;
};

export const inOutQuad = (t: number) => {
  'worklet';
  const c = clamp(t);
  return c < 0.5 ? 2 * c * c : 1 - ((-2 * c + 2) * (-2 * c + 2)) / 2;
};
