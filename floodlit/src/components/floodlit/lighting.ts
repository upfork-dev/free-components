// The room's light as numbers. Night and day are the same geometry with these values moved.

export type Vec3 = readonly [number, number, number];

function lin(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function hexToLinear(hex: string): Vec3 {
  const n = parseInt(hex.replace("#", ""), 16);
  return [lin((n >> 16) & 255), lin((n >> 8) & 255), lin(n & 255)];
}

/** Pill text on a fill of this colour: whichever of ink or paper reads better. */
export function contrastInk(hex: string): string {
  const [r, g, b] = hexToLinear(hex);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const onDark = (lum + 0.05) / (0.0091 + 0.05);
  const onLight = (0.88 + 0.05) / (lum + 0.05);
  return onDark >= onLight ? "#17161A" : "#F3F1EC";
}

export type Lighting = {
  wallBase: Vec3;
  ambient: Vec3;
  keyColor: Vec3;
  keyPower: number;
  keyHeightShare: number; // key light position: above the wall's top, as a share of the view height
  keyXShare: number;
  keyZ: number;
  keyShadow: number;
  torchPower: number;
  torchZ: number;
  slabShadow: number;
  contrast: number;
  chroma: number;
  relief: number;
  detailRelief: number;
  stripPower: number;
  soleCatch: number;
  bodyTint: Vec3;
  bodyAlpha: number;
  rimGain: number;
  stripGain: number;
  stripIdle: number;
  contactGain: number;
  reflectGain: number;
  steel: Vec3;
  shoeExposure: number;
};

/** A wall of real plaster reflecting little light: the lamps set its brightness, not its colour. */
const PLASTER: Vec3 = [0.42, 0.405, 0.44];

export const NIGHT: Lighting = {
  wallBase: PLASTER,
  // Before any lamp, this reads as about #141316.
  ambient: [0.0168, 0.016, 0.0182],
  keyColor: [1.0, 0.95, 0.88],
  keyPower: 62000,
  keyHeightShare: -0.1,
  keyXShare: 0.24,
  keyZ: 760,
  keyShadow: 0.86,
  torchPower: 7200,
  torchZ: 560,
  slabShadow: 0.34,
  contrast: 1.2,
  chroma: 0.7,
  relief: 0.34,
  detailRelief: 0.1,
  stripPower: 24,
  soleCatch: 0.18,
  bodyTint: [0.86, 0.93, 1.0],
  bodyAlpha: 0.03,
  rimGain: 1.5,
  stripGain: 3.4,
  stripIdle: 0.01,
  contactGain: 0.72,
  reflectGain: 0.2,
  steel: [0.42, 0.42, 0.45],
  shoeExposure: 0.78,
};

export const DAY: Lighting = {
  wallBase: [0.73, 0.701, 0.637],
  ambient: [0.5, 0.5, 0.5],
  keyColor: [1.0, 0.985, 0.95],
  keyPower: 1600000,
  keyHeightShare: -0.5,
  keyXShare: 0.22,
  keyZ: 1500,
  keyShadow: 0.78,
  torchPower: 26000,
  torchZ: 560,
  slabShadow: 0.34,
  contrast: 0.7,
  chroma: 0.22,
  relief: 0.2,
  detailRelief: 0.06,
  stripPower: 3.6,
  soleCatch: 0.1,
  bodyTint: [0.7, 0.8, 0.8],
  bodyAlpha: 0.07,
  rimGain: 0.62,
  stripGain: 1.5,
  stripIdle: 0.02,
  contactGain: 0.5,
  reflectGain: 0.14,
  steel: [0.5, 0.5, 0.5],
  shoeExposure: 1.0,
};

function mixN(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function mixV(a: Vec3, b: Vec3, t: number): Vec3 {
  return [mixN(a[0], b[0], t), mixN(a[1], b[1], t), mixN(a[2], b[2], t)];
}

/** Night to day is the lights coming up: the same room with these values moving. */
export function lightingAt(day: number): Lighting {
  const out = {} as Record<keyof Lighting, unknown>;
  for (const key of Object.keys(NIGHT) as (keyof Lighting)[]) {
    const a = NIGHT[key];
    const b = DAY[key];
    out[key] = typeof a === "number" ? mixN(a, b as number, day) : mixV(a, b as Vec3, day);
  }
  return out as Lighting;
}
