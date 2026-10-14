// How wide each piece is in a given text style, measured once by the platform itself: a hidden
// row of Text elements reports its widths through onLayout. Results are kept in a small cache
// shared by every MorphText, keyed by the style and the font scale.

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type TextStyle } from 'react-native';

import { isSpace } from './segment';

const LIMIT = 800;
const cache = new Map<string, number>();
const heights = new Map<string, number>();
const probes = new Map<string, number>();

function remember(key: string, width: number) {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, width);
  if (cache.size > LIMIT) cache.delete(cache.keys().next().value as string);
}

function recall(key: string): number | undefined {
  const width = cache.get(key);
  if (width !== undefined) {
    cache.delete(key);
    cache.set(key, width);
  }
  return width;
}

const TYPE_KEYS = [
  'fontSize',
  'fontFamily',
  'fontWeight',
  'fontStyle',
  'fontVariant',
  'letterSpacing',
  'lineHeight',
  'textTransform',
] as const;

/** The style props that change a piece's size: everything else (colour…) can't move a letter. */
export function typeKey(style: TextStyle, fontScale: number): string {
  const parts: unknown[] = [fontScale];
  for (const name of TYPE_KEYS) parts.push(style[name]);
  return JSON.stringify(parts);
}

// A space measured alone can come back as 0 wide; measured between two letters it can't.
const FENCE = 'H';
const fenced = (token: string) => `${FENCE}${token}${FENCE}`;
const PROBE = 'Hxgy0';

export type Metrics = {
  /** Every piece asked for has its width. */
  ready: boolean;
  width: (token: string) => number;
  /** One line's height in this style. */
  height: number;
  /** The key the widths belong to (changes when fonts finish loading or the font scale changes). */
  key: string;
  /** Render this somewhere inside the component: it's invisible and measures what's missing. */
  measurer: ReactNode;
};

const webPre = Platform.OS === 'web' ? ({ whiteSpace: 'pre' } as unknown as TextStyle) : null;

export function useTextMetrics(tokens: readonly string[], textStyle: StyleProp<TextStyle>, allowFontScaling = true): Metrics {
  const { fontScale } = useWindowDimensions();
  const flat = (StyleSheet.flatten(textStyle) ?? {}) as TextStyle;
  const base = typeKey(flat, allowFontScaling ? fontScale : 1);
  const [epoch, setEpoch] = useState(0);
  const [, setVersion] = useState(0);
  const key = `${base}#${probes.get(base) ?? 0}`;
  const pending = useRef(new Set<string>());

  // What to measure: each piece not in the cache yet (spaces as "H H" against "HH").
  const wanted = new Set<string>();
  for (const token of tokens) {
    if (isSpace(token)) {
      if (recall(`${key}\u0001${fenced(token)}`) === undefined) wanted.add(fenced(token));
      if (recall(`${key}\u0001${FENCE}${FENCE}`) === undefined) wanted.add(`${FENCE}${FENCE}`);
    } else if (recall(`${key}\u0001${token}`) === undefined) {
      wanted.add(token);
    }
  }
  const height = heights.get(key) ?? 0;
  const ready = wanted.size === 0 && height > 0;

  const width = useCallback(
    (token: string) => {
      if (isSpace(token)) {
        const outer = cache.get(`${key}\u0001${fenced(token)}`) ?? 0;
        const inner = cache.get(`${key}\u0001${FENCE}${FENCE}`) ?? 0;
        return Math.max(0, outer - inner);
      }
      return cache.get(`${key}\u0001${token}`) ?? 0;
    },
    [key],
  );

  const onProbe = (w: number, h: number) => {
    const known = probes.get(base);
    // A different probe width means the font changed under us (it finished loading): every
    // width under the old key is stale, so the key moves on and everything is measured again.
    if (known === undefined || Math.abs(known - w) > 0.25) probes.set(base, w);
    const current = `${base}#${probes.get(base)}`;
    if (!heights.has(current)) heights.set(current, h);
    if (current !== key || height === 0) setEpoch((e) => e + 1);
  };

  const onPiece = (piece: string, w: number) => {
    remember(`${key}\u0001${piece}`, w);
    pending.current.delete(piece);
    if (pending.current.size === 0) setVersion((v) => v + 1);
  };

  // Pieces wait for the probe: until it reports, the key isn't final.
  const pieces = probes.has(base) ? [...wanted] : [];
  pending.current = new Set(pieces);
  const measurer = (
    <View pointerEvents="none" style={styles.measurer} aria-hidden importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Text
        key={`probe${epoch}`}
        allowFontScaling={allowFontScaling}
        style={[flat, styles.piece, webPre]}
        onLayout={(e) => onProbe(e.nativeEvent.layout.width, e.nativeEvent.layout.height)}
      >
        {PROBE}
      </Text>
      {pieces.map((piece) => (
        <Text
          key={`${key}${piece}`}
          allowFontScaling={allowFontScaling}
          style={[flat, styles.piece, webPre]}
          onLayout={(e) => onPiece(piece, e.nativeEvent.layout.width)}
        >
          {piece}
        </Text>
      ))}
    </View>
  );

  return { ready, width, height, key, measurer };
}

const styles = StyleSheet.create({
  measurer: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 4096,
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'flex-start',
    opacity: 0,
  },
  piece: {
    flexShrink: 0,
    flexGrow: 0,
    margin: 0,
    padding: 0,
    position: 'relative',
    textAlign: 'left',
  },
});
