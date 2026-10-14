import type { Scheme } from '../../lib/use-scheme';

export type DrawerTheme = {
  /** The stage behind a moved screen, and the menu's ground. */
  stage: string;
  /** A faint light near the menu's header. */
  glow: string;
  text: string;
  /** Inactive items' text and icons. */
  muted: string;
  faint: string;
  pill: string;
  accent: string;
  badge: string;
  badgeText: string;
  hairline: string;
  shadow: string;
  shadowOpacity: number;
  ghost: [string, string];
  /** The floating menu card (`float`). */
  card: string;
  cardBorder: string;
  scrim: string;
  switchTrack: string;
  switchThumb: string;
};

export const DRAWER_THEMES: Record<Scheme, DrawerTheme> = {
  dark: {
    stage: '#0E0E12',
    glow: 'rgba(160, 170, 255, 0.10)',
    text: 'rgba(237, 237, 242, 0.92)',
    muted: 'rgba(237, 237, 242, 0.62)',
    faint: 'rgba(237, 237, 242, 0.42)',
    pill: 'rgba(255, 255, 255, 0.08)',
    accent: '#8B9CFF',
    badge: '#8B9CFF',
    badgeText: '#0E0E12',
    hairline: 'rgba(255, 255, 255, 0.08)',
    shadow: '#000000',
    shadowOpacity: 0.35,
    ghost: ['rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.02)'],
    card: '#17171C',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
    scrim: 'rgba(0, 0, 0, 0.35)',
    switchTrack: 'rgba(255, 255, 255, 0.08)',
    switchThumb: 'rgba(255, 255, 255, 0.14)',
  },
  light: {
    stage: '#F1EFEA',
    glow: 'rgba(255, 255, 255, 0.75)',
    text: '#1A1A20',
    muted: 'rgba(26, 26, 32, 0.6)',
    faint: 'rgba(26, 26, 32, 0.45)',
    pill: 'rgba(0, 0, 0, 0.06)',
    accent: '#4353E0',
    badge: '#1A1A20',
    badgeText: '#FFFFFF',
    hairline: 'rgba(0, 0, 0, 0.08)',
    shadow: '#000000',
    shadowOpacity: 0.18,
    ghost: ['rgba(0, 0, 0, 0.04)', 'rgba(0, 0, 0, 0.02)'],
    card: '#FFFFFF',
    cardBorder: 'rgba(0, 0, 0, 0.07)',
    scrim: 'rgba(0, 0, 0, 0.35)',
    switchTrack: 'rgba(0, 0, 0, 0.06)',
    switchThumb: '#FFFFFF',
  },
};
