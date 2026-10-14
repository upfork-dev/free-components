// The demos' pictures: fourteen landscapes painted by our own shader (art/scenes.sksl), rendered once
// into WebP files by art/render.mjs. Nothing here is a photo.

import type { ImageSourcePropType } from 'react-native';

export type Scene = {
  id: number;
  name: string;
  /** The picture's size in pixels. */
  w: number;
  h: number;
  /** Top and bottom colours, shown for the moment before the picture has loaded. */
  wash: [string, string];
  source: ImageSourcePropType;
};

export const SCENES: Scene[] = [
  { id: 0, name: 'Dunes at dusk', w: 1200, h: 800, wash: ['#3A3366', '#B8573A'], source: require('../assets/scenes/dunes.webp') },
  { id: 1, name: 'Alpine lake', w: 1200, h: 900, wash: ['#86BCE8', '#2E5D6E'], source: require('../assets/scenes/alpine-lake.webp') },
  { id: 2, name: 'Foggy forest', w: 900, h: 1200, wash: ['#CBD5D0', '#3A4B44'], source: require('../assets/scenes/foggy-forest.webp') },
  { id: 3, name: 'Sea cliffs', w: 1200, h: 675, wash: ['#43518F', '#233A5C'], source: require('../assets/scenes/sea-cliffs.webp') },
  { id: 4, name: 'City at dusk', w: 1200, h: 675, wash: ['#222E5C', '#262A4A'], source: require('../assets/scenes/city-at-dusk.webp') },
  { id: 5, name: 'Aurora', w: 960, h: 1200, wash: ['#06091B', '#1B2A40'], source: require('../assets/scenes/aurora.webp') },
  { id: 6, name: 'Desert road', w: 800, h: 1200, wash: ['#24306A', '#6B3A2C'], source: require('../assets/scenes/desert-road.webp') },
  { id: 7, name: 'Rice terraces', w: 1200, h: 900, wash: ['#E6ECE3', '#5E8C33'], source: require('../assets/scenes/rice-terraces.webp') },
  { id: 8, name: 'Lavender field', w: 1200, h: 675, wash: ['#5D4089', '#5B4A82'], source: require('../assets/scenes/lavender.webp') },
  { id: 9, name: 'Peaks at dawn', w: 800, h: 1200, wash: ['#283768', '#1F2A3F'], source: require('../assets/scenes/peaks-at-dawn.webp') },
  { id: 10, name: 'Lagoon', w: 675, h: 1200, wash: ['#55B6EC', '#2CC0C6'], source: require('../assets/scenes/lagoon.webp') },
  { id: 11, name: 'Canyon', w: 900, h: 1200, wash: ['#A8D0EA', '#8E3B22'], source: require('../assets/scenes/canyon.webp') },
  { id: 12, name: 'Harbour', w: 1200, h: 800, wash: ['#F6AE68', '#33516C'], source: require('../assets/scenes/harbour.webp') },
  { id: 13, name: 'Autumn hills', w: 1200, h: 675, wash: ['#F1E1C3', '#6A2E1E'], source: require('../assets/scenes/autumn-hills.webp') },
];
