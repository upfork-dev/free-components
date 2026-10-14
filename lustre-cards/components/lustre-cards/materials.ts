/** A card material: what the shader needs, plus the colours of the print on it. */
export type MaterialParams = {
  /** The light and deep tones of the metal, as [r, g, b] from 0 to 1. */
  toneA: [number, number, number];
  toneB: [number, number, number];
  /** The colour of the reflection. */
  specular: [number, number, number];
  /** 0.15 is almost a mirror, 0.6 is satin. */
  roughness: number;
  /** How strongly brushed, 0 to 1. */
  brush: number;
  /** The direction of the brushing, in radians (0 runs across the card). */
  brushAngle: number;
  /** The clear coat's glint, 0 to 1. */
  coat: number;
  /** A thin film whose hue shifts with the angle, 0 to 1. */
  holo: number;
  /** Frosted glass, 0 to 1. */
  frost: number;
  /** The print: engraved text and marks. */
  ink: string;
  /** The print's lit edge, for the embossed number. */
  inkLight: string;
  /** The print's shaded edge. */
  inkShade: string;
};

export type MaterialName = 'steel' | 'gold' | 'titanium' | 'rose' | 'holo' | 'frost';

/** The six materials. Copy one and change it to make your own. */
export const MATERIALS: Record<MaterialName, MaterialParams> = {
  steel: {
    toneA: [0.69, 0.71, 0.74],
    toneB: [0.44, 0.46, 0.5],
    specular: [1, 1, 1],
    roughness: 0.32,
    brush: 0.85,
    brushAngle: 0,
    coat: 0.25,
    holo: 0,
    frost: 0,
    ink: 'rgba(22, 24, 28, 0.78)',
    inkLight: 'rgba(255, 255, 255, 0.55)',
    inkShade: 'rgba(0, 0, 0, 0.35)',
  },
  gold: {
    toneA: [0.86, 0.73, 0.5],
    toneB: [0.6, 0.45, 0.25],
    specular: [1, 0.94, 0.8],
    roughness: 0.3,
    brush: 0.6,
    brushAngle: 0,
    coat: 0.3,
    holo: 0,
    frost: 0,
    ink: 'rgba(60, 40, 14, 0.78)',
    inkLight: 'rgba(255, 246, 220, 0.6)',
    inkShade: 'rgba(70, 40, 0, 0.35)',
  },
  titanium: {
    toneA: [0.2, 0.21, 0.23],
    toneB: [0.08, 0.085, 0.095],
    specular: [0.82, 0.86, 0.94],
    roughness: 0.4,
    brush: 0.9,
    brushAngle: 0,
    coat: 0.35,
    holo: 0,
    frost: 0,
    ink: 'rgba(232, 236, 244, 0.86)',
    inkLight: 'rgba(255, 255, 255, 0.35)',
    inkShade: 'rgba(0, 0, 0, 0.6)',
  },
  rose: {
    toneA: [0.88, 0.68, 0.62],
    toneB: [0.63, 0.42, 0.39],
    specular: [1, 0.92, 0.88],
    roughness: 0.3,
    brush: 0.55,
    brushAngle: 0,
    coat: 0.3,
    holo: 0,
    frost: 0,
    ink: 'rgba(70, 30, 28, 0.75)',
    inkLight: 'rgba(255, 238, 232, 0.6)',
    inkShade: 'rgba(80, 20, 20, 0.35)',
  },
  holo: {
    toneA: [0.76, 0.78, 0.82],
    toneB: [0.52, 0.54, 0.6],
    specular: [1, 1, 1],
    roughness: 0.28,
    brush: 0.35,
    brushAngle: 0.5,
    coat: 0.4,
    holo: 1,
    frost: 0,
    ink: 'rgba(28, 26, 40, 0.78)',
    inkLight: 'rgba(255, 255, 255, 0.6)',
    inkShade: 'rgba(0, 0, 0, 0.3)',
  },
  frost: {
    toneA: [0.85, 0.89, 0.94],
    toneB: [0.72, 0.78, 0.86],
    specular: [1, 1, 1],
    roughness: 0.45,
    brush: 0.1,
    brushAngle: 0,
    coat: 0.2,
    holo: 0,
    frost: 1,
    ink: 'rgba(24, 40, 64, 0.72)',
    inkLight: 'rgba(255, 255, 255, 0.7)',
    inkShade: 'rgba(20, 40, 80, 0.25)',
  },
};

export function resolveMaterial(material: MaterialName | MaterialParams | string): MaterialParams {
  if (typeof material === 'object') return material;
  const found = MATERIALS[material as MaterialName];
  if (!found && __DEV__) console.warn(`Lustre Cards: unknown material "${material}", using steel.`);
  return found ?? MATERIALS.steel;
}
