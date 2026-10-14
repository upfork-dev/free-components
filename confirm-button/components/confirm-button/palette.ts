import type { Scheme } from '../../lib/use-scheme';

export type Tone = 'danger' | 'primary' | 'neutral';
export type Paint = { fill: string; text: string };
export type Palette = {
  idle: Paint;
  armed: Paint;
  done: Paint;
  error: Paint;
  /** The countdown ring round the cancel bubble, on the page. */
  ring: string;
  /** How dark the shadow is, and whether it takes the fill's colour (light) or is black with a faint glow (dark). */
  shadow: { alpha: number; tinted: boolean; glow: number };
};

// Every text and fill pair reads at 4.5:1 or better (some fills are a shade deeper than a design brief's swatch,
// where white text would have fallen short).
const LIGHT_ARMED: Paint = { fill: '#18181B', text: '#FFFFFF' };
const DARK_ARMED: Paint = { fill: '#F4F4F5', text: '#0B0B0E' };

export const PALETTES: Record<Scheme, Record<Tone, Palette>> = {
  light: {
    danger: {
      idle: { fill: '#D7343A', text: '#FFFFFF' },
      armed: LIGHT_ARMED,
      done: { fill: '#15803D', text: '#FFFFFF' },
      error: { fill: '#B4232A', text: '#FFFFFF' },
      ring: 'rgba(24, 24, 27, 0.7)',
      shadow: { alpha: 0.22, tinted: true, glow: 0 },
    },
    primary: {
      idle: { fill: '#4F46E5', text: '#FFFFFF' },
      armed: { fill: '#111111', text: '#FFFFFF' },
      done: { fill: '#15803D', text: '#FFFFFF' },
      error: { fill: '#D7343A', text: '#FFFFFF' },
      ring: 'rgba(17, 17, 17, 0.7)',
      shadow: { alpha: 0.22, tinted: true, glow: 0 },
    },
    neutral: {
      idle: { fill: '#EDEDF0', text: '#18181B' },
      armed: LIGHT_ARMED,
      done: { fill: '#15803D', text: '#FFFFFF' },
      error: { fill: '#D7343A', text: '#FFFFFF' },
      ring: 'rgba(24, 24, 27, 0.7)',
      shadow: { alpha: 0.14, tinted: false, glow: 0 },
    },
  },
  dark: {
    danger: {
      idle: { fill: '#F2555A', text: '#170405' },
      armed: DARK_ARMED,
      done: { fill: '#4ADE80', text: '#052E16' },
      error: { fill: '#E5484D', text: '#120203' },
      ring: 'rgba(255, 255, 255, 0.7)',
      shadow: { alpha: 0.5, tinted: false, glow: 0.18 },
    },
    primary: {
      idle: { fill: '#7C74FF', text: '#0B0A1F' },
      armed: DARK_ARMED,
      done: { fill: '#4ADE80', text: '#052E16' },
      error: { fill: '#FF6B70', text: '#170405' },
      ring: 'rgba(255, 255, 255, 0.7)',
      shadow: { alpha: 0.5, tinted: false, glow: 0.18 },
    },
    neutral: {
      idle: { fill: '#2A2A30', text: '#F4F4F5' },
      armed: DARK_ARMED,
      done: { fill: '#4ADE80', text: '#052E16' },
      error: { fill: '#FF6B70', text: '#170405' },
      ring: 'rgba(255, 255, 255, 0.7)',
      shadow: { alpha: 0.5, tinted: false, glow: 0 },
    },
  },
};

export const SIZES = {
  sm: { height: 36, pad: 14, font: 13, icon: 16, gap: 6 },
  md: { height: 48, pad: 20, font: 15, icon: 18, gap: 8 },
  lg: { height: 56, pad: 24, font: 16, icon: 20, gap: 9 },
} as const;

export type Size = keyof typeof SIZES;
