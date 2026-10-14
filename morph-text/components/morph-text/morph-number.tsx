import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  I18nManager,
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
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
  type WithSpringConfig,
} from 'react-native-reanimated';

import { useScheme, type Scheme } from '../../lib/use-scheme';
import { inOutQuad, linear, outQuad, outQuart } from './easing';
import { digitSet, digitValue, numberSlots, type NumberFormat } from './format';
import { useTextMetrics } from './measure';
import { splitStyle, useAnimatedColor, type ColorState } from './morph-text';
import { PieceView, type PieceTiming } from './piece';
import { planCrossfade, planMorph, planStill, placeTokens, type Layout, type Piece } from './plan';
import { isSpace } from './segment';
import { DEFAULT_SPRING } from './timeline';

export type MorphNumberProps = {
  value: number;
  /** Intl.NumberFormat options, plus the locale: currency, compact, percent, decimals, grouping. */
  format?: NumberFormat;
  prefix?: string;
  suffix?: string;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  /** Flash green when the value goes up and red when it goes down, or your own two colours. */
  trend?: boolean | { up: string; down: string };
  /** `trend`: every digit rolls the way the value went. `shortest`: each digit takes the short way round. */
  direction?: 'shortest' | 'trend';
  /** What stays put while the width changes. Numbers that grow at the front look best with `end`. */
  align?: 'start' | 'center' | 'end';
  spring?: WithSpringConfig;
  scheme?: Scheme;
  /** Screen readers announce changes. */
  live?: boolean;
  accessibilityLabel?: string;
  allowFontScaling?: boolean;
};

const TREND = {
  light: { up: '#16A34A', down: '#E5484D', ink: '#111114' },
  dark: { up: '#4ADE80', down: '#FF7A7F', ink: '#F4F4F6' },
} as const;

// A roll lands on time and exactly: longer the more digits it passes, never a lingering tail.
/** Rows of a digit's strip, as a fraction of the line's height. */
const ROW_SPACING = 0.8;
const rollDuration = (steps: number) => Math.min(720, 360 + 45 * Math.abs(steps));
const ROLL_EASING = outQuart;
// On the web the window fades its edges (a CSS mask); phones dim the column between two digits.
const webMask =
  Platform.OS === 'web'
    ? ({
        maskImage: 'linear-gradient(to bottom, transparent 0%, #000 22%, #000 78%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 22%, #000 78%, transparent 100%)',
      } as unknown as ViewStyle)
    : null;
const FLASH_FADE = 600;

type Ink = ColorState & { flash: SharedValue<number>; flashColor: SharedValue<string>; colored: boolean };

let lastId = 0;
const nextId = () => ++lastId;

/** A number whose digits roll like an odometer: prices, counters, balances. Formatted by Intl. */
export function MorphNumber({
  value,
  format,
  prefix,
  suffix,
  style,
  containerStyle,
  trend = false,
  direction = 'trend',
  align = 'start',
  spring = DEFAULT_SPRING,
  scheme: schemeProp,
  live = false,
  accessibilityLabel,
  allowFontScaling = true,
}: MorphNumberProps) {
  const scheme = useScheme(schemeProp);
  const reduceMotion = useReducedMotion();
  const formatKey = JSON.stringify(format ?? {});
  const { slots, text } = useMemo(
    () => numberSlots(value, format ?? {}, prefix, suffix),
    // The format is compared by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value, formatKey, prefix, suffix],
  );
  const { text: baseText, box } = useMemo(() => splitStyle(style), [style]);
  const textStyle = useMemo<TextStyle>(() => {
    const variant = new Set([...(baseText.fontVariant ?? []), 'tabular-nums']);
    return { ...baseText, fontVariant: [...variant] as TextStyle['fontVariant'] };
  }, [baseText]);

  const firstDigit = slots.find((s) => s.digit !== null)?.text ?? '0';
  const digits = useMemo(() => digitSet(firstDigit), [firstDigit]);
  const tokens = useMemo(() => [...digits, ...slots.filter((s) => s.digit === null).map((s) => s.text)], [digits, slots]);
  const metrics = useTextMetrics(tokens, textStyle, allowFontScaling);

  const colors = TREND[scheme];
  const trendColors = typeof trend === 'object' ? trend : colors;
  const baseColor = typeof textStyle.color === 'string' ? textStyle.color : trend ? colors.ink : undefined;
  const color = useAnimatedColor(baseColor);
  const flash = useSharedValue(0);
  const flashColor = useSharedValue<string>(trendColors.up);
  const ink: Ink = { ...color, flash, flashColor, colored: baseColor !== undefined };

  const width = useSharedValue(0);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const piecesRef = useRef(pieces);
  piecesRef.current = pieces;
  const layoutRef = useRef<(Layout & { typeKey: string }) | null>(null);
  const valueRef = useRef(value);
  const planRef = useRef(0);
  const [laidOut, setLaidOut] = useState(false);
  const [rise, setRise] = useState(1);

  const physical = align === 'center' ? 'center' : (align === 'start') !== I18nManager.isRTL ? 'left' : 'right';
  const anchor = physical === 'left' ? 0 : physical === 'right' ? 1 : 0.5;
  const { ready, key: typeKey, width: measure } = metrics;

  useEffect(() => {
    if (!ready) return;
    const digitWidth = Math.max(...digits.map(measure));
    const widths = slots.map((s) => (s.digit !== null ? digitWidth : measure(s.text)));
    const { xs, total } = placeTokens(widths, 'ltr', anchor);
    const next = { keys: slots.map((s) => s.key), tokens: slots.map((s) => s.text), xs, ws: widths, anchor };
    const prev = layoutRef.current;
    const up = value >= valueRef.current;
    const changed = value !== valueRef.current;
    valueRef.current = value;
    const plan = ++planRef.current;
    const ghosts = piecesRef.current.filter((p) => p.phase === 'exit');
    const common = { nextId, invisible: isSpace, plan };

    let planned;
    if (!prev) {
      planned = planStill(next, common);
      width.value = total;
    } else if (prev.typeKey !== typeKey) {
      planned = planCrossfade(prev, next, ghosts, common);
      width.value = withTiming(total, { duration: 200, easing: inOutQuad });
    } else {
      const at = new Map(prev.keys.map((k, i) => [k, i]));
      const pairs: Array<[number, number]> = [];
      next.keys.forEach((k, j) => {
        const i = at.get(k);
        if (i !== undefined) pairs.push([i, j]);
      });
      planned = reduceMotion
        ? planCrossfadeChanged(prev, next, pairs, ghosts, common)
        : planMorph(prev, next, pairs, ghosts, {
            ...common,
            spring,
            exitDuration: 160,
            stagger: 18,
            maxStagger: 200,
            rise: up ? 1 : -1,
          });
      width.value = reduceMotion ? withTiming(total, { duration: 100, easing: inOutQuad }) : withDelay(planned.moveDelay, withSpring(total, spring));
    }
    layoutRef.current = { ...planned.layout, typeKey };
    setRise(up ? 1 : -1);
    setPieces(planned.pieces);
    setLaidOut(true);

    if (changed && trend && prev) {
      flashColor.value = up ? trendColors.up : trendColors.down;
      flash.value = withSequence(withTiming(1, { duration: 90, easing: outQuad }), withTiming(0, { duration: FLASH_FADE, easing: inOutQuad }));
    }
    // The layout depends on the value's slots, their measured widths and the anchor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, typeKey, text, anchor]);

  const onGone = useCallback((id: number) => {
    setPieces((list) => list.filter((p) => p.id !== id || p.phase !== 'exit'));
  }, []);

  const timing = useMemo<PieceTiming>(
    () => ({ spring, exitDuration: 160, fadeDuration: reduceMotion ? 100 : 200 }),
    [spring, reduceMotion],
  );

  const rowStyle = useAnimatedStyle(() => ({ width: width.value }));
  const height = metrics.height;
  const digitWidth = ready ? Math.max(...digits.map(measure)) : 0;
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
          {pieces.map((piece) => {
            const digit = digitValue(piece.token);
            const isDigit = digit !== null && Array.from(piece.token).length === 1 && /^[if]\d+$/.test(piece.key);
            return (
              <PieceView key={piece.id} piece={piece} width={width} height={height} timing={timing} onGone={onGone}>
                {isDigit ? (
                  <DigitStrip
                    digit={digit}
                    digits={digits}
                    width={digitWidth}
                    height={height}
                    style={textStyle}
                    ink={ink}
                    rise={rise}
                    direction={direction}
                    reduced={reduceMotion}
                    allowFontScaling={allowFontScaling}
                  />
                ) : (
                  <InkText token={piece.token} style={textStyle} ink={ink} allowFontScaling={allowFontScaling} />
                )}
              </PieceView>
            );
          })}
        </Animated.View>
      ) : (
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

/** Reduced motion: places that stay keep still and swap their digit with a fade; the rest fades. */
function planCrossfadeChanged(
  prev: Layout,
  next: Omit<Layout, 'ids'>,
  pairs: Array<[number, number]>,
  ghosts: readonly Piece[],
  common: { nextId: () => number; invisible: (t: string) => boolean; plan: number },
) {
  const sameShape = prev.keys.length === next.keys.length && pairs.length === next.keys.length;
  if (!sameShape) return planCrossfade(prev, next, ghosts, common);
  const pieces: Piece[] = [...ghosts];
  const ids: number[] = [];
  next.keys.forEach((key, j) => {
    const id = prev.ids[j];
    ids.push(id);
    if (common.invisible(next.tokens[j])) return;
    pieces.push({ id, token: next.tokens[j], key, x: next.xs[j], w: next.ws[j], anchor: next.anchor, phase: 'stay', delay: 0, rise: 1, plan: common.plan });
  });
  return { pieces, layout: { ...next, ids }, moveDelay: 0 };
}

const webPre = Platform.OS === 'web' ? ({ whiteSpace: 'pre' } as unknown as TextStyle) : null;

function useInkStyle(ink: Ink) {
  return useAnimatedStyle(() => {
    if (!ink.colored) return {};
    const base = interpolateColor(ink.progress.value, [0, 1], [ink.from.value, ink.to.value]);
    return { color: interpolateColor(ink.flash.value, [0, 1], [base, ink.flashColor.value]) };
  });
}

function InkText({ token, style, ink, allowFontScaling }: { token: string; style: TextStyle; ink: Ink; allowFontScaling: boolean }) {
  const color = useInkStyle(ink);
  return (
    <Animated.Text allowFontScaling={allowFontScaling} style={[style, styles.glyph, webPre, color]}>
      {token}
    </Animated.Text>
  );
}

type StripProps = {
  digit: number;
  digits: string[];
  width: number;
  height: number;
  style: TextStyle;
  ink: Ink;
  rise: number;
  direction: 'shortest' | 'trend';
  reduced: boolean;
  allowFontScaling: boolean;
};

/** One digit's place: a column 0–9 (and 0 again, so 9 → 0 rolls on) seen through a window. */
function DigitStrip({ digit, digits, width, height, style, ink, rise, direction, reduced, allowFontScaling }: StripProps) {
  const roll = useSharedValue(digit);
  const from = useSharedValue(digit);
  const to = useSharedValue(digit);
  const fade = useSharedValue(1);
  const target = useRef(digit);

  useEffect(() => {
    const current = target.current;
    const shown = ((current % 10) + 10) % 10;
    if (digit === shown) return;
    let steps = (digit - shown + 10) % 10; // forwards
    if (direction === 'trend') {
      if (rise < 0) steps -= 10;
    } else if (steps > 5 || (steps === 5 && rise < 0)) {
      steps -= 10;
    }
    const next = current + steps;
    target.current = next;
    if (reduced) {
      fade.value = withSequence(withTiming(0, { duration: 50, easing: linear }), withTiming(1, { duration: 50, easing: linear }));
      roll.value = withDelay(50, withTiming(next, { duration: 0 }));
      from.value = next;
      to.value = next;
      return;
    }
    from.value = roll.value;
    to.value = next;
    roll.value = withTiming(next, { duration: rollDuration(next - roll.value), easing: ROLL_EASING });
    // A new digit is the only order.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digit]);

  // Rows sit closer than a line apart (digits are shorter than their line), so a rolling digit
  // stays inside the line instead of riding high above it. One Text per row: exact on every platform.
  const spacing = Math.round(height * ROW_SPACING);
  const rows = useMemo(() => [...digits, digits[0]], [digits]);
  const strip = useAnimatedStyle(() => {
    const pos = ((roll.value % 10) + 10) % 10;
    return { transform: [{ translateY: -pos * spacing }] };
  });
  // At speed, the digits stretch a little, as if blurred by the motion, and dim between two
  // places so a passing digit never reads as a wrong value.
  const stretch = useAnimatedStyle(() => {
    const travelled = Math.min(Math.abs(roll.value - from.value), Math.abs(to.value - roll.value));
    const between = Math.sin(Math.PI * (((roll.value % 1) + 1) % 1));
    return {
      opacity: fade.value * (1 - (Platform.OS === 'web' ? 0.2 : 0.45) * between),
      transform: [{ scaleY: 1 + 0.08 * Math.min(1, travelled * 1.2) }],
    };
  });
  const color = useInkStyle(ink);

  return (
    <View style={[styles.window, { width, height }, webMask]}>
      <Animated.View style={[{ width, height }, stretch]}>
        <Animated.View style={[styles.strip, { width, height: height + 10 * spacing }, strip]}>
          {rows.map((d, k) => (
            <Animated.Text
              key={k}
              allowFontScaling={allowFontScaling}
              style={[style, styles.digit, { width, height, top: k * spacing }, color]}
            >
              {d}
            </Animated.Text>
          ))}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Pieces are placed by their left edges: left to right whatever the app's direction (CSS `left`
  // is already physical on the web).
  row: Platform.OS === 'web' ? { overflow: 'visible' } : { direction: 'ltr', overflow: 'visible' },
  glyph: { position: 'absolute', left: 0, top: 0, margin: 0, padding: 0 },
  window: { overflow: 'hidden' },
  strip: { position: 'absolute', left: 0, top: 0 },
  digit: { position: 'absolute', left: 0, textAlign: 'center', margin: 0, padding: 0 },
  reader: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
});
