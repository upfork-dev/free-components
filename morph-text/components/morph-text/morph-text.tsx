import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
  type WithSpringConfig,
} from 'react-native-reanimated';

import { inOutQuad } from './easing';
import { matchTokens } from './diff';
import { useTextMetrics } from './measure';
import { PieceView, type PieceTiming } from './piece';
import { planCrossfade, planMorph, planStill, placeTokens, type Layout, type Piece } from './plan';
import { isSpace, textDirection, tokenize, type Granularity } from './segment';
import { DEFAULT_SPRING } from './timeline';

export type MorphTextProps = {
  text: string;
  /** Text style. Its colour animates when it changes; a new size or weight cross-fades. */
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  /** What stays put while the width changes. `start` is the left in left-to-right text. */
  align?: 'start' | 'center' | 'end';
  /** `auto`: words for joined scripts (Persian, Arabic…) and long text, graphemes otherwise. */
  granularity?: Granularity;
  /** ms between two arriving letters (all of them within 200 ms). */
  stagger?: number;
  spring?: WithSpringConfig;
  /** How long a letter takes to leave, ms. */
  duration?: number;
  /** Always one line; there for clarity. */
  numberOfLines?: 1;
  /** Read by screen readers instead of the text. */
  accessibilityLabel?: string;
  /** Screen readers announce changes (counters, statuses). */
  live?: boolean;
  allowFontScaling?: boolean;
  /** Called with the row's width each time the text settles on a new layout. */
  onWidth?: (width: number) => void;
};

// Style props that belong to the letters; the rest (margins, flex…) goes on the row.
const TEXT_KEYS = new Set([
  'color',
  'fontSize',
  'fontFamily',
  'fontWeight',
  'fontStyle',
  'fontVariant',
  'letterSpacing',
  'lineHeight',
  'textTransform',
  'textShadowColor',
  'textShadowOffset',
  'textShadowRadius',
  'textDecorationLine',
  'textDecorationColor',
  'textDecorationStyle',
  'includeFontPadding',
  'writingDirection',
]);

export function splitStyle(style: StyleProp<TextStyle>): { text: TextStyle; box: ViewStyle } {
  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;
  const text: Record<string, unknown> = {};
  const box: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(flat)) {
    if (TEXT_KEYS.has(k)) text[k] = v;
    else if (k !== 'textAlign' && k !== 'opacity') box[k] = v;
  }
  return { text: text as TextStyle, box: box as ViewStyle };
}

const webPre = Platform.OS === 'web' ? ({ whiteSpace: 'pre' } as unknown as TextStyle) : null;

export type ColorState = { from: SharedValue<string>; to: SharedValue<string>; progress: SharedValue<number> };

/** A colour that animates whenever `color` changes; undefined when there's none to animate. */
export function useAnimatedColor(color: string | undefined, duration = 220): ColorState {
  const from = useSharedValue(color ?? '#000000');
  const to = useSharedValue(color ?? '#000000');
  const progress = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (color === undefined) return;
    if (first.current) {
      first.current = false;
      from.value = color;
      to.value = color;
      progress.value = 1;
      return;
    }
    if (color === to.value && progress.value === 1) return;
    // From the colour on screen right now (a change mid-change starts where it is).
    from.value = interpolateColor(progress.value, [0, 1], [from.value, to.value]) as string;
    to.value = color;
    progress.value = 0;
    progress.value = withTiming(1, { duration, easing: inOutQuad });
  }, [color, duration, from, to, progress]);
  return { from, to, progress };
}

let lastId = 0;
const nextId = () => ++lastId;

/**
 * Text that changes beautifully: letters both strings share glide to their new places, removed
 * ones leave, new ones arrive in a stagger, and the width springs to fit. One line.
 */
export function MorphText({
  text,
  style,
  containerStyle,
  align = 'start',
  granularity = 'auto',
  stagger = 18,
  spring = DEFAULT_SPRING,
  duration = 160,
  accessibilityLabel,
  live = false,
  allowFontScaling = true,
  onWidth,
}: MorphTextProps) {
  const reduceMotion = useReducedMotion();
  const { text: textStyle, box } = useMemo(() => splitStyle(style), [style]);
  const { tokens, unit } = useMemo(() => tokenize(text, granularity), [text, granularity]);
  const metrics = useTextMetrics(tokens, textStyle, allowFontScaling);
  const color = typeof textStyle.color === 'string' ? textStyle.color : undefined;
  const colors = useAnimatedColor(color);

  const width = useSharedValue(0);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const piecesRef = useRef(pieces);
  piecesRef.current = pieces;
  const layoutRef = useRef<(Layout & { typeKey: string; unit: string }) | null>(null);
  const planRef = useRef(0);
  const [laidOut, setLaidOut] = useState(false);

  const direction = textDirection(text);
  const physical = align === 'center' ? 'center' : (align === 'start') === (direction === 'ltr') ? 'left' : 'right';
  const anchor = physical === 'left' ? 0 : physical === 'right' ? 1 : 0.5;

  // Without the measured style's key in it, a font that finishes loading wouldn't re-lay out.
  const { ready, key: typeKey, width: measure } = metrics;

  useEffect(() => {
    if (!ready) return;
    const widths = tokens.map(measure);
    const { xs, total } = placeTokens(widths, direction, anchor);
    const next = { keys: tokens, tokens, xs, ws: widths, anchor };
    const prev = layoutRef.current;
    const plan = ++planRef.current;
    const ghosts = piecesRef.current.filter((p) => p.phase === 'exit');
    const common = { nextId, invisible: isSpace, plan };

    let planned;
    if (!prev) {
      planned = planStill(next, common);
      width.value = total;
    } else if (reduceMotion || prev.typeKey !== typeKey || prev.unit !== unit) {
      // A new size or weight (or the other unit) can't move letter by letter: cross-fade.
      planned = planCrossfade(prev, next, ghosts, common);
      width.value = withTiming(total, { duration: reduceMotion ? 120 : 200, easing: inOutQuad });
    } else {
      const pairs = matchTokens(prev.tokens, tokens, prev.xs, xs);
      planned = planMorph(prev, next, pairs, ghosts, {
        ...common,
        spring,
        exitDuration: duration,
        stagger,
        maxStagger: 200,
        rise: 1,
      });
      width.value = withDelay(planned.moveDelay, withSpring(total, spring));
    }
    layoutRef.current = { ...planned.layout, typeKey, unit };
    setPieces(planned.pieces);
    setLaidOut(true);
    onWidth?.(total);
    // The layout depends on the text, its measured widths and where it's anchored.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, typeKey, text, unit, anchor, direction]);

  const onGone = useCallback((id: number) => {
    setPieces((list) => list.filter((p) => p.id !== id || p.phase !== 'exit'));
  }, []);

  const timing = useMemo<PieceTiming>(
    () => ({ spring, exitDuration: duration, fadeDuration: reduceMotion ? 120 : 200 }),
    [spring, duration, reduceMotion],
  );

  const rowStyle = useAnimatedStyle(() => ({ width: width.value }));
  const height = metrics.height;
  const label = accessibilityLabel ?? text;

  return (
    <View
      style={[box, containerStyle]}
      accessible={Platform.OS !== 'web'}
      accessibilityRole="text"
      accessibilityLabel={label}
      accessibilityLiveRegion={live ? 'polite' : 'none'}
    >
      {laidOut ? (
        <Animated.View
          style={[styles.row, { height }, rowStyle]}
          aria-hidden
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          {pieces.map((piece) => (
            <PieceView key={piece.id} piece={piece} width={width} height={height} timing={timing} onGone={onGone}>
              <Glyph token={piece.token} style={textStyle} colors={color ? colors : null} allowFontScaling={allowFontScaling} />
            </PieceView>
          ))}
        </Animated.View>
      ) : (
        // Until the first measurement: the plain text, so nothing pops in.
        <Text style={[textStyle, webPre]} allowFontScaling={allowFontScaling} aria-hidden>
          {text}
        </Text>
      )}
      {Platform.OS === 'web' ? (
        <Text style={styles.reader} aria-live={live ? 'polite' : undefined}>
          {label}
        </Text>
      ) : null}
      {metrics.measurer}
    </View>
  );
}

function Glyph({
  token,
  style,
  colors,
  allowFontScaling,
}: {
  token: string;
  style: TextStyle;
  colors: ColorState | null;
  allowFontScaling: boolean;
}) {
  const animated = useAnimatedStyle(() => {
    if (!colors) return {};
    return { color: interpolateColor(colors.progress.value, [0, 1], [colors.from.value, colors.to.value]) };
  });
  return (
    <Animated.Text allowFontScaling={allowFontScaling} style={[style, styles.glyph, webPre, animated]}>
      {token}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  // Pieces are placed by their left edges: left to right whatever the app's direction (CSS `left`
  // is already physical on the web).
  row: Platform.OS === 'web' ? { overflow: 'visible' } : { direction: 'ltr', overflow: 'visible' },
  glyph: { position: 'absolute', left: 0, top: 0, margin: 0, padding: 0 },
  reader: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
});
