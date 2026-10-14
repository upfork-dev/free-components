import * as Haptics from 'expo-haptics';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View, type AccessibilityActionEvent, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  interpolateColor,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { formatTime, nearestOpen } from './time';

/** The slots the wheel may land on: one flag per slot of the day, and the bounds (slot numbers) unless it wraps. */
export type WheelBounds = { lo: number; hi: number; wrap: boolean };

export type WheelColors = { center: string; edge: string; band: string; hairline: string; muted: string };

type TimeWheelProps = {
  /** The wheel's place, in minutes (fractional, unbounded when it wraps). */
  value: SharedValue<number>;
  step: number;
  cycle: 12 | 24;
  open: boolean[];
  bounds: WheelBounds;
  rows: number;
  rowHeight: number;
  colors: WheelColors;
  reduceMotion: boolean;
  haptics: boolean;
  inert: boolean;
  accessibilityLabel: string;
  accessibilityValue: string;
  /** A person started moving it (so the picker knows to follow). */
  onUserMove: () => void;
  /** It came to rest on a slot. */
  onSettle: (slot: number) => void;
};

const SNAP = { stiffness: 240, damping: 28, mass: 1 };
const QUICK = { duration: 160 };
const DECAY_TRAVEL = 0.995 / (1 - 0.995) / 1000;
const RUBBER = 0.35;
const TICK_GAP = 40;
const CAN_BUZZ = Platform.OS !== 'web';
const webGrab = Platform.OS === 'web' ? ({ cursor: 'grab', outlineStyle: 'none' } as unknown as ViewStyle) : null;

/**
 * A wheel of times, turned like a drum: rows recede on a cylinder and fade by their own opacity (no painted fade).
 * Its own scroller, so a finger, a mouse drag and the mouse wheel feel the same.
 */
export function TimeWheel({
  value,
  step,
  cycle,
  open,
  bounds,
  rows,
  rowHeight,
  colors,
  reduceMotion,
  haptics,
  inert,
  accessibilityLabel,
  accessibilityValue,
  onUserMove,
  onSettle,
}: TimeWheelProps) {
  const height = rows * rowHeight;
  const angle = 0.44; // radians between rows on the drum
  const drum = rowHeight / angle;
  const n = open.length;
  // The angle at which a row reaches the wheel's edge: rows have faded out by then, never cut off.
  const edgeAngle = flatEdge(height, drum, reduceMotion, rowHeight, angle);

  // Rows round the centre: a window of slots, moved when the wheel has travelled two rows.
  const [center, setCenter] = useState(() => Math.round(value.value / step));
  useAnimatedReaction(
    () => Math.round(value.value / step),
    (now) => {
      if (Math.abs(now - center) >= 2) scheduleOnRN(setCenter, now);
    },
    [center, step],
  );

  // A tick per slot that passes, no closer than 40 ms.
  const lastTick = useRef(0);
  const tick = useCallback(() => {
    const now = Date.now();
    if (now - lastTick.current < TICK_GAP) return;
    lastTick.current = now;
    if (haptics && CAN_BUZZ) Haptics.selectionAsync().catch(() => undefined);
  }, [haptics]);
  const touched = useSharedValue(0);
  useAnimatedReaction(
    () => Math.round(value.value / step),
    (now, before) => {
      if (before !== null && now !== before && touched.value === 1) scheduleOnRN(tick);
    },
    [step, tick],
  );

  const refuse = useCallback(() => {
    if (haptics && CAN_BUZZ) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
  }, [haptics]);
  const settled = useCallback(
    (slot: number) => {
      if (haptics && CAN_BUZZ) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      onSettle(slot);
    },
    [haptics, onSettle],
  );

  /** Lands on a slot: the nearest open one to `slot`, telling the person (a bump) if it had to look further. */
  const land = (slot: number, prefer: number, velocity: number) => {
    'worklet';
    const b = bounds;
    let target = b.wrap ? slot : Math.min(Math.max(slot, b.lo), b.hi);
    const found = nearestOpen(target, open, b.wrap, b.lo, b.hi, prefer);
    if (found < 0) return;
    if (found !== target) scheduleOnRN(refuse);
    target = found;
    const done = (finished?: boolean) => {
      'worklet';
      if (finished) scheduleOnRN(settled, target);
    };
    value.value = reduceMotion ? withTiming(target * step, QUICK, done) : withSpring(target * step, { ...SNAP, velocity: velocity * step }, done);
  };

  const startY = useSharedValue(0);
  const startValue = useSharedValue(0);
  const lastMove = useSharedValue({ y: 0, t: 0 });
  const samples = useSharedValue<number[]>([]);
  const startTime = useSharedValue(0);

  const pan = Gesture.Pan()
    .enabled(!inert)
    .activeOffsetY([-5, 5])
    .failOffsetX([-24, 24])
    .onBegin((event) => {
      cancelAnimation(value);
      touched.value = 1;
      startY.value = event.absoluteY;
      startValue.value = value.value;
      startTime.value = Date.now();
      lastMove.value = { y: event.absoluteY, t: Date.now() };
      samples.value = [event.absoluteY, Date.now()];
      scheduleOnRN(onUserMove);
    })
    .onUpdate((event) => {
      if (event.absoluteY !== lastMove.value.y) {
        lastMove.value = { y: event.absoluteY, t: Date.now() };
        samples.value = [...samples.value.slice(-10), event.absoluteY, Date.now()];
      }
      const raw = startValue.value - ((event.absoluteY - startY.value) / rowHeight) * step;
      const b = bounds;
      if (b.wrap) value.value = raw;
      else {
        const lo = b.lo * step;
        const hi = b.hi * step;
        value.value = raw < lo ? lo + (raw - lo) * RUBBER : raw > hi ? hi + (raw - hi) * RUBBER : raw;
      }
    })
    .onEnd((event) => {
      const resting = Date.now() - lastMove.value.t > 80;
      const speed = Math.abs(event.velocityY) > 1 ? event.velocityY : trackedSpeed(samples.value);
      const velocity = resting ? 0 : -speed / rowHeight; // slots a second
      const projected = value.value / step + velocity * DECAY_TRAVEL;
      land(Math.round(projected), velocity === 0 ? 0 : Math.sign(velocity), velocity);
    })
    .onFinalize((event, success) => {
      if (success) return;
      // A short touch without moving: a tap on a row turns the wheel to it.
      const still = Math.abs(event.absoluteY - startY.value) < 8 && Date.now() - startTime.value < 400;
      const offset = event.y - height / 2;
      const rowsAway = reduceMotion
        ? Math.round(offset / rowHeight)
        : Math.round(Math.asin(Math.max(-0.99, Math.min(0.99, offset / drum))) / angle);
      land(Math.round(value.value / step) + (still ? rowsAway : 0), 0, 0);
    });

  // The wheel and the keyboard, on the web; increment and decrement for screen readers.
  const target = useRef<number | null>(null);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepBy = useCallback(
    (by: number) => {
      if (inert) return;
      const from = target.current ?? Math.round(value.value / step);
      const b = bounds;
      let next = from + by;
      if (!b.wrap) next = Math.min(Math.max(next, b.lo), b.hi);
      const found = nearestOpen(next, open, b.wrap, b.lo, b.hi, Math.sign(by));
      if (found < 0) return;
      target.current = found;
      touched.value = 1;
      onUserMove();
      cancelAnimation(value);
      value.value = reduceMotion
        ? withTiming(found * step, QUICK, (f) => f && scheduleOnRN(settled, found))
        : withSpring(found * step, SNAP, (f) => f && scheduleOnRN(settled, found));
      if (idle.current) clearTimeout(idle.current);
      idle.current = setTimeout(() => {
        target.current = null;
      }, 400);
    },
    [inert, value, step, bounds, open, onUserMove, reduceMotion, settled, touched],
  );
  useEffect(
    () => () => {
      if (idle.current) clearTimeout(idle.current);
    },
    [],
  );
  const wheelTotal = useRef(0);
  const onWheel = (event: { nativeEvent: { deltaY: number; deltaMode?: number } }) => {
    const delta = event.nativeEvent.deltaY * (event.nativeEvent.deltaMode === 1 ? 40 : 1);
    if (Math.abs(delta) >= 50) {
      wheelTotal.current = 0;
      stepBy(Math.sign(delta));
      return;
    }
    wheelTotal.current += delta;
    if (Math.abs(wheelTotal.current) >= 60) {
      stepBy(Math.sign(wheelTotal.current));
      wheelTotal.current = 0;
    }
  };
  const onKeyDown = (event: { nativeEvent: { key: string }; preventDefault?: () => void }) => {
    const hour = Math.max(1, Math.round(60 / step));
    const moves: Record<string, number> = { ArrowDown: 1, ArrowUp: -1, PageDown: hour, PageUp: -hour };
    const by = moves[event.nativeEvent.key];
    if (by === undefined) return;
    event.preventDefault?.();
    stepBy(by);
  };
  const webProps = Platform.OS === 'web' ? ({ onWheel, onKeyDown, focusable: !inert } as Record<string, unknown>) : {};
  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'increment') stepBy(1);
    else if (event.nativeEvent.actionName === 'decrement') stepBy(-1);
  };

  const slots: number[] = [];
  const reach = Math.ceil(rows / 2) + 3;
  for (let k = center - reach; k <= center + reach; k += 1) slots.push(k);

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        aria-valuetext={accessibilityValue}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={onAccessibilityAction}
        style={[{ height }, styles.wheel, webGrab]}
        {...webProps}>
        <View style={[styles.band, { top: height / 2 - rowHeight / 2, height: rowHeight, backgroundColor: colors.band }]}>
          <View style={[styles.hairline, { top: 0, backgroundColor: colors.hairline }]} />
          <View style={[styles.hairline, { bottom: 0, backgroundColor: colors.hairline }]} />
        </View>
        {inert ? (
          <View style={[StyleSheet.absoluteFill, styles.center]}>
            <Text style={[styles.empty, { color: colors.muted }]}>No times available</Text>
          </View>
        ) : (
          slots.map((k) => {
            const inDay = ((k % n) + n) % n;
            if (!bounds.wrap && (k < bounds.lo || k > bounds.hi)) return null;
            const label = formatTime(k * step, cycle);
            return (
              <Row
                key={k}
                slot={k}
                value={value}
                step={step}
                time={label.time}
                period={label.period}
                disabled={!open[inDay]}
                rowHeight={rowHeight}
                height={height}
                angle={angle}
                drum={drum}
                edgeAngle={edgeAngle}
                colors={colors}
                flat={reduceMotion}
              />
            );
          })
        )}
      </Animated.View>
    </GestureDetector>
  );
}

type RowProps = {
  slot: number;
  value: SharedValue<number>;
  step: number;
  time: string;
  period: string;
  disabled: boolean;
  rowHeight: number;
  height: number;
  angle: number;
  drum: number;
  edgeAngle: number;
  colors: WheelColors;
  flat: boolean;
};

function flatEdge(height: number, drum: number, flat: boolean, rowHeight: number, angle: number) {
  if (flat) return (height / 2 / rowHeight) * angle;
  return height / 2 >= drum ? 1.45 : Math.asin(height / 2 / drum);
}

/**
 * The pointer's speed (points a second) over its last moves. Gesture Handler's own is sometimes 0 for a quick flick on
 * the web; this one is measured from the samples kept as [position, time, position, time, …].
 */
function trackedSpeed(samples: number[]) {
  'worklet';
  const n = samples.length;
  if (n < 4) return 0;
  const x1 = samples[n - 2];
  const t1 = samples[n - 1];
  let k = n - 4;
  while (k >= 2 && t1 - samples[k - 1] <= 100) k -= 2;
  const dt = t1 - samples[k + 1];
  return dt > 0 ? ((x1 - samples[k]) / dt) * 1000 : 0;
}

function smooth(t: number) {
  'worklet';
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

/** One time on the drum: it turns away and fades by its distance from the centre, 22 pt there and 17 at the edges. */
const Row = memo(function Row({ slot, value, step, time, period, disabled, rowHeight, height, angle, drum, edgeAngle, colors, flat }: RowProps) {
  const place = useAnimatedStyle(() => {
    const d = slot - value.value / step;
    const theta = d * angle;
    const away = Math.abs(theta);
    const shown = away < edgeAngle ? 1 - Math.pow(smooth(away / edgeAngle), 1.6) : 0;
    const y = flat ? d * rowHeight : drum * Math.sin(Math.max(-1.5, Math.min(1.5, theta)));
    const scale = 1 - 0.227 * smooth(Math.abs(d) / 2.2);
    return {
      opacity: shown * (disabled ? 0.35 : 1),
      transform: flat
        ? [{ translateY: y }, { scale }]
        : [{ perspective: 520 }, { translateY: y }, { rotateX: `${-theta}rad` }, { scale }],
    };
  });
  const ink = useAnimatedStyle(() => ({
    color: interpolateColor(Math.abs(slot - value.value / step), [0, 2.4], [colors.center, colors.edge]),
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.row, { top: height / 2 - rowHeight / 2, height: rowHeight }, place]}>
      <Animated.Text style={[styles.time, disabled ? styles.struck : null, ink]}>{time}</Animated.Text>
      {period ? <Animated.Text style={[styles.period, disabled ? styles.struck : null, ink]}>{period}</Animated.Text> : null}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wheel: { overflow: 'hidden' },
  band: { position: 'absolute', left: 0, right: 0, borderRadius: 12 },
  hairline: { position: 'absolute', left: 12, right: 12, height: StyleSheet.hairlineWidth },
  row: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 5, paddingTop: 7 },
  time: { fontSize: 22, fontWeight: '600', fontVariant: ['tabular-nums'], letterSpacing: -0.2 },
  period: { fontSize: 13, fontWeight: '600' },
  struck: { textDecorationLine: 'line-through' },
  center: { alignItems: 'center', justifyContent: 'center' },
  empty: { fontSize: 15, fontWeight: '600' },
});
