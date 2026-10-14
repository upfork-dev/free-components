import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import type { Scheme } from '../../lib/use-scheme';

export type FilmItem = {
  key: string;
  /** The picture's own size (any unit): only its shape is used. */
  width: number;
  height: number;
  type?: 'image' | 'video';
  /** Seconds, for video items: shown as a badge on the thumbnail. */
  duration?: number;
  caption?: string;
  accessibilityLabel: string;
};

export type RenderImage<T extends FilmItem> = (info: {
  item: T;
  index: number;
  variant: 'viewer' | 'thumb';
}) => ReactNode;

export type FilmstripHandle = { scrollToIndex(index: number, animated?: boolean): void };

export type ViewerOptions = {
  /** Double-tap (double-click) to zoom 2×, then drag to look around. Default true. */
  zoom?: boolean;
  /** How much the picture lags its page while paging, 0–0.3. Default 0.12. */
  parallax?: number;
  /** `contain` (default) shows the whole picture; `cover` fills the viewer, cropped. */
  fit?: 'contain' | 'cover';
};

export type FilmstripProps<T extends FilmItem> = {
  data: readonly T[];
  /** Draws a picture filling its box (any image component). */
  renderImage: RenderImage<T>;
  /** Controlled index: the strip and viewer go there when it changes. */
  index?: number;
  defaultIndex?: number;
  /** Called when the strip or viewer settles on an item. */
  onIndexChange?: (index: number) => void;
  /** The live float index, if you want to drive other things with it. */
  position?: SharedValue<number>;
  thumbHeight?: number;
  sliverWidth?: number;
  gap?: number;
  showCounter?: boolean;
  renderCaption?: (item: T, index: number) => ReactNode;
  /** `false` for the strip alone. */
  viewer?: boolean | ViewerOptions;
  /** Turns on swipe-down-to-close on the viewer (for a gallery shown as a modal). */
  onRequestClose?: () => void;
  /** Called when the index comes within `endThreshold` items of the end (load more). */
  onEndReached?: () => void;
  endThreshold?: number;
  scheme?: Scheme;
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;
};
