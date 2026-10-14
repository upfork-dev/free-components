import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  I18nManager,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeInDown,
  FadeOutUp,
  cancelAnimation,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useScheme, type Scheme } from '../../lib/use-scheme';
import { AnalogClock } from './analog-clock';
import {
  DAY,
  formatDuration,
  formatTime,
  fromMinutes,
  localeHourCycle,
  nearestOpen,
  spokenDuration,
  spokenTime,
  toMinutes,
  type TimeRange,
  type TimeValue,
} from './time';
import { TimeWheel, type WheelBounds } from './wheel';

export type ClockfaceValue = TimeValue | TimeRange;

export type ClockfaceProps = {
  mode?: 'time' | 'range';
  value?: ClockfaceValue;
  defaultValue?: ClockfaceValue;
  /** Once the picker has settled. */
  onChange?: (value: ClockfaceValue) => void;
  /** Minutes since 00:00, fractional, while it moves. */
  liveValue?: SharedValue<number>;
  step?: 1 | 5 | 10 | 15 | 30;
  hourCycle?: 12 | 24;
  min?: TimeValue;
  max?: TimeValue;
  isDisabled?: (t: TimeValue) => boolean;
  /** Range mode, in minutes. */
  minDuration?: number;
  maxDuration?: number;
  /** The clock beside the wheel, or above it. */
  layout?: 'side' | 'stacked';
  clockSize?: number;
  showNumerals?: 'none' | 'quarters' | 'all';
  dayNight?: boolean;
  accent?: string;
  /** What the wheel picks, for screen readers ("Alarm time"). */
  accessibilityLabel?: string;
  scheme?: Scheme;
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;
};

const COLORS = {
  light: {
    card: '#FFFFFF',
    line: 'rgba(20, 20, 30, 0.08)',
    center: '#1A1A22',
    edge: '#9A9AA6',
    band: 'rgba(20, 20, 30, 0.05)',
    hairline: 'rgba(20, 20, 30, 0.08)',
    muted: '#6C6C78',
    tabs: 'rgba(20, 20, 30, 0.05)',
    tabOn: '#FFFFFF',
    tabShadow: '0px 1px 3px rgba(20, 20, 30, 0.12)',
    label: '#1A1A22',
  },
  dark: {
    card: '#121216',
    line: 'rgba(255, 255, 255, 0.07)',
    center: '#F3F3F7',
    edge: '#5C5C68',
    band: 'rgba(255, 255, 255, 0.06)',
    hairline: 'rgba(255, 255, 255, 0.07)',
    muted: '#9A9AA6',
    tabs: 'rgba(255, 255, 255, 0.06)',
    tabOn: '#2A2A32',
    tabShadow: '0px 1px 3px rgba(0, 0, 0, 0.4)',
    label: '#F3F3F7',
  },
} as const;

const SPIN = { stiffness: 240, damping: 28, mass: 1 };
const ROW = 44;
const CAN_BUZZ = Platform.OS !== 'web';
const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;

function isRange(v: ClockfaceValue | undefined): v is TimeRange {
  return !!v && 'start' in v;
}

function wrapAngle(a: number) {
  'worklet';
  let x = a;
  while (x > Math.PI) x -= Math.PI * 2;
  while (x < -Math.PI) x += Math.PI * 2;
  return x;
}

/**
 * A time picker where a wheel of times and a live analog clock move as one: winding the wheel sweeps the hands. Single
 * times or ranges (the booked arc on the face), unavailable slots skipped, and a minute hand you can drag.
 */
export function Clockface({
  mode = 'time',
  value,
  defaultValue,
  onChange,
  liveValue,
  step = 15,
  hourCycle,
  min,
  max,
  isDisabled,
  minDuration = 0,
  maxDuration,
  layout = 'side',
  clockSize,
  showNumerals = 'quarters',
  dayNight = false,
  accent = '#FF7A1A',
  accessibilityLabel,
  scheme: schemeProp,
  haptics = true,
  style,
}: ClockfaceProps) {
  const scheme = useScheme(schemeProp);
  const colors = COLORS[scheme];
  const reduce = useReducedMotion();
  const cycle = useMemo(() => hourCycle ?? localeHourCycle(), [hourCycle]);
  const size = clockSize ?? (layout === 'stacked' ? 220 : 120);
  const rtl = I18nManager.isRTL;

  // The day's slots, which are open, and the bounds.
  const slotsInDay = Math.round(DAY / step);
  const open = useMemo(
    () => Array.from({ length: slotsInDay }, (_, k) => !(isDisabled?.(fromMinutes(k * step)) ?? false)),
    [slotsInDay, step, isDisabled],
  );
  const minM = min ? toMinutes(min) : null;
  const maxM = max ? toMinutes(max) : null;
  const wrap = minM === null && maxM === null;
  const lo = minM === null ? 0 : Math.ceil(minM / step);
  const hi = maxM === null ? slotsInDay - 1 : Math.floor(maxM / step);
  const inert = !open.some((ok, k) => ok && (wrap || (k >= lo && k <= hi)));
  const minDur = Math.max(step, Math.ceil(minDuration / step) * step);
  const maxDur = Math.min(DAY - step, maxDuration ?? DAY - step);

  /** A minutes value snapped to the step and kept inside min and max. */
  const tidy = useCallback(
    (m: number) => {
      let slot = Math.round(m / step);
      if (!wrap) {
        const clamped = Math.min(Math.max(slot, lo), hi);
        if (clamped !== slot && __DEV__) console.warn('Clockface: a value outside min/max was clamped.');
        slot = clamped;
      }
      return slot * step;
    },
    [step, wrap, lo, hi],
  );

  // The values, in minutes. A range's end is always after its start (past midnight it's more than 1440).
  const initial = value ?? defaultValue;
  const firstStart = tidy(initial ? toMinutes(isRange(initial) ? initial.start : initial) : 9 * 60);
  const firstEnd = (() => {
    if (!isRange(initial)) return firstStart + Math.max(minDur, 60);
    let e = tidy(toMinutes(initial.end));
    while (e <= firstStart) e += DAY;
    return Math.min(Math.max(e, firstStart + minDur), firstStart + maxDur);
  })();
  const [start, setStart] = useState(firstStart);
  const [end, setEnd] = useState(firstEnd);
  const startM = useSharedValue(firstStart);
  const endM = useSharedValue(firstEnd);
  const [active, setActive] = useState<'start' | 'end'>('start');
  const editingEnd = mode === 'range' && active === 'end';
  const wheel = useSharedValue(firstStart);
  const following = useSharedValue(0); // 1 while a person turns the wheel or the hand
  const span = useSharedValue(firstEnd - firstStart);
  const editEnd = useSharedValue(editingEnd ? 1 : 0);
  useEffect(() => {
    editEnd.value = editingEnd ? 1 : 0;
  }, [editingEnd, editEnd]);

  // The wheel drives the handle being edited; moving the start carries the end with it.
  useAnimatedReaction(
    () => wheel.value,
    (w) => {
      if (liveValue) liveValue.value = ((w % DAY) + DAY) % DAY;
      if (following.value !== 1) return;
      if (mode === 'time') startM.value = w;
      else if (editEnd.value === 1) endM.value = w;
      else {
        startM.value = w;
        endM.value = w + span.value;
      }
    },
    [mode, liveValue],
  );

  // The duration label, live while it moves.
  const [liveDuration, setLiveDuration] = useState(firstEnd - firstStart);
  useAnimatedReaction(
    () => Math.round((endM.value - startM.value) / step),
    (now, before) => {
      if (mode === 'range' && now !== before) scheduleOnRN(setLiveDuration, now * step);
    },
    [mode, step],
  );

  // What the wheel may land on, for the handle being edited.
  const bounds: WheelBounds = useMemo(() => {
    if (mode === 'time') return { lo, hi, wrap };
    if (!editingEnd) {
      const lengthSlots = Math.round((end - start) / step);
      return wrap ? { lo, hi, wrap } : { lo, hi: Math.max(lo, hi - lengthSlots), wrap };
    }
    const startSlot = Math.round(start / step);
    const top = startSlot + Math.round(maxDur / step);
    return {
      lo: startSlot + Math.round(minDur / step),
      hi: wrap ? top : Math.min(top, hi),
      wrap: false,
    };
  }, [mode, editingEnd, lo, hi, wrap, start, end, step, minDur, maxDur, slotsInDay]);

  const report = useCallback(
    (s: number, e: number) => {
      if (mode === 'time') onChange?.(fromMinutes(s));
      else onChange?.({ start: fromMinutes(s), end: fromMinutes(e) });
    },
    [mode, onChange],
  );

  const onSettle = useCallback(
    (slot: number) => {
      const m = slot * step;
      following.value = 0;
      if (mode === 'time') {
        setStart(m);
        startM.value = m;
        report(m, m);
        return;
      }
      if (editingEnd) {
        setEnd(m);
        endM.value = m;
        span.value = m - start;
        report(start, m);
        AccessibilityInfo.announceForAccessibility(`Duration ${spokenDuration(m - start)}`);
      } else {
        const e = m + (end - start);
        setStart(m);
        setEnd(e);
        startM.value = m;
        endM.value = e;
        report(m, e);
      }
    },
    [step, mode, editingEnd, start, end, report, following, startM, endM, span],
  );

  const onUserMove = useCallback(() => {
    span.value = end - start;
    following.value = 1;
  }, [span, end, start, following]);

  // Start and End: switching spins the wheel (and the hands) to that handle.
  const switchTo = (next: 'start' | 'end') => {
    if (next === active) return;
    setActive(next);
    following.value = 0;
    cancelAnimation(wheel);
    const target = next === 'start' ? start : end;
    wheel.value = reduce ? withTiming(target, { duration: 160 }) : withSpring(target, SPIN);
  };

  // A value from outside (controlled): the arc and the wheel move to it.
  const valueKey = value ? JSON.stringify(value) : '';
  useEffect(() => {
    if (!value) return;
    const s = tidy(toMinutes(isRange(value) ? value.start : value));
    let e = isRange(value) ? tidy(toMinutes(value.end)) : s;
    if (isRange(value)) {
      while (e <= s) e += DAY;
      e = Math.min(Math.max(e, s + minDur), s + maxDur);
    }
    if (s === start && e === end) return;
    const move = (to: number) => (reduce ? withTiming(to, { duration: 160 }) : withSpring(to, SPIN));
    following.value = 0;
    setStart(s);
    setEnd(e);
    startM.value = move(s);
    endM.value = move(e);
    span.value = e - s;
    wheel.value = move(mode === 'range' && active === 'end' ? e : s);
    // Only when the value itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueKey]);

  // A changing step keeps the nearest time.
  const lastStep = useRef(step);
  useEffect(() => {
    if (lastStep.current === step) return;
    lastStep.current = step;
    const s = tidy(start);
    const e = mode === 'range' ? Math.max(tidy(end), s + minDur) : s;
    setStart(s);
    setEnd(e);
    startM.value = s;
    endM.value = e;
    wheel.value = mode === 'range' && active === 'end' ? e : s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Dragging the minute hand (or anywhere on the face's outer ring): 1:1 with the pointer, a turn is an hour.
  const ticks = useRef(0);
  const tick = useCallback(() => {
    const now = Date.now();
    if (now - ticks.current < 40) return;
    ticks.current = now;
    if (haptics && CAN_BUZZ) Haptics.selectionAsync().catch(() => undefined);
  }, [haptics]);
  const refuse = useCallback(() => {
    if (haptics && CAN_BUZZ) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
  }, [haptics]);
  const settleTick = useCallback(
    (slot: number) => {
      if (haptics && CAN_BUZZ) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      onSettle(slot);
    },
    [haptics, onSettle],
  );
  const handing = useSharedValue(0);
  useAnimatedReaction(
    () => Math.round(wheel.value / step),
    (now, before) => {
      if (handing.value === 1 && before !== null && now !== before) scheduleOnRN(tick);
    },
    [step, tick],
  );
  const box = size + Math.max(6, size * 0.04) * 2;
  const grab = useSharedValue({ angle: 0, total: 0, from: 0 });
  const handPan = Gesture.Pan()
    .enabled(!inert)
    .minDistance(2)
    .onBegin((event) => {
      const dx = event.x - box / 2;
      const dy = event.y - box / 2;
      if (Math.hypot(dx, dy) < size * 0.18) return;
      cancelAnimation(wheel);
      handing.value = 1;
      grab.value = { angle: Math.atan2(dy, dx), total: 0, from: wheel.value };
      scheduleOnRN(onUserMove);
    })
    .onUpdate((event) => {
      if (handing.value !== 1) return;
      const angle = Math.atan2(event.y - box / 2, event.x - box / 2);
      const total = grab.value.total + wrapAngle(angle - grab.value.angle);
      grab.value = { angle, total, from: grab.value.from };
      const raw = grab.value.from + (total / (Math.PI * 2)) * 60;
      if (bounds.wrap) wheel.value = raw;
      else {
        const lowest = bounds.lo * step;
        const highest = bounds.hi * step;
        wheel.value = raw < lowest ? lowest + (raw - lowest) * 0.35 : raw > highest ? highest + (raw - highest) * 0.35 : raw;
      }
    })
    .onFinalize(() => {
      if (handing.value !== 1) return;
      handing.value = 0;
      let target = Math.round(wheel.value / step);
      if (!bounds.wrap) target = Math.min(Math.max(target, bounds.lo), bounds.hi);
      const found = nearestOpen(target, open, bounds.wrap, bounds.lo, bounds.hi, 0);
      if (found < 0) return;
      if (found !== target) scheduleOnRN(refuse);
      const done = (finished?: boolean) => {
        'worklet';
        if (finished) scheduleOnRN(settleTick, found);
      };
      wheel.value = reduce ? withTiming(found * step, { duration: 160 }, done) : withSpring(found * step, { stiffness: 320, damping: 30 }, done);
    });

  // The hands show the handle being edited; the arc shows the range.
  const handsAt = wheel;
  const range = mode === 'range' ? { start: startM, end: endM } : null;
  const shownValue = mode === 'range' && editingEnd ? end : start;
  const wheelLabel = accessibilityLabel ?? (mode === 'range' ? (editingEnd ? 'End time' : 'Start time') : 'Time');

  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => setWidth(Math.round(event.nativeEvent.layout.width));

  const clock = (
    <GestureDetector gesture={handPan}>
      <View style={Platform.OS === 'web' ? ({ cursor: 'grab' } as unknown as ViewStyle) : null}>
        <AnalogClock
          minutes={handsAt}
          size={size}
          range={range}
          showNumerals={showNumerals}
          dayNight={dayNight}
          accent={accent}
          snapTo={reduce ? step : 0}
          scheme={scheme}
        />
        {mode === 'range' ? (
          <View pointerEvents="none" style={[styles.duration, { top: box / 2 + size * 0.15 }]}>
            {/* A window on the face, like a date window: the hands pass under it. */}
            <View style={[styles.durationWindow, { backgroundColor: scheme === 'dark' ? '#1C1C22' : '#F6F5F2', borderColor: colors.line }]}>
              <MorphText text={formatDuration(liveDuration)} color={colors.label} size={Math.max(12, size * 0.066)} />
            </View>
          </View>
        ) : null}
      </View>
    </GestureDetector>
  );

  const wheelView = (
    <View style={layout === 'side' ? styles.sideWheel : styles.stackWheel}>
      <TimeWheel
        value={wheel}
        step={step}
        cycle={cycle}
        open={open}
        bounds={bounds}
        rows={layout === 'stacked' ? 3.5 : 5}
        rowHeight={ROW}
        colors={colors}
        reduceMotion={reduce}
        haptics={haptics}
        inert={inert}
        accessibilityLabel={wheelLabel}
        accessibilityValue={spokenTime(shownValue, cycle)}
        onUserMove={onUserMove}
        onSettle={onSettle}
      />
    </View>
  );

  return (
    <View onLayout={onLayout} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.line }, style]}>
      {mode === 'range' ? (
        <Tabs
          active={active}
          start={start}
          end={end}
          cycle={cycle}
          colors={colors}
          width={width}
          reduce={reduce}
          onPick={switchTo}
        />
      ) : null}
      {layout === 'stacked' ? (
        <>
          <View style={styles.clockCenter}>{clock}</View>
          {wheelView}
        </>
      ) : (
        <View style={[styles.side, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
          {clock}
          {wheelView}
        </View>
      )}
    </View>
  );
}

/** Start and End, a tab each, with a highlight that slides between them. */
function Tabs({
  active,
  start,
  end,
  cycle,
  colors,
  width,
  reduce,
  onPick,
}: {
  active: 'start' | 'end';
  start: number;
  end: number;
  cycle: 12 | 24;
  colors: (typeof COLORS)[Scheme];
  width: number;
  reduce: boolean;
  onPick: (tab: 'start' | 'end') => void;
}) {
  const inner = Math.max(0, width - 32 - 8);
  const at = useSharedValue(active === 'end' ? 1 : 0);
  useEffect(() => {
    at.value = reduce
      ? withTiming(active === 'end' ? 1 : 0, { duration: 160 })
      : withSpring(active === 'end' ? 1 : 0, { stiffness: 320, damping: 30, overshootClamping: true });
  }, [active, at, reduce]);
  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: (at.value * inner) / 2 }] }));
  return (
    <View role="tablist" style={[styles.tabs, { backgroundColor: colors.tabs }]}>
      <Animated.View style={[styles.tabOn, { width: inner / 2, backgroundColor: colors.tabOn, boxShadow: colors.tabShadow }, slide]} />
      {(['start', 'end'] as const).map((tab) => {
        const t = formatTime(tab === 'start' ? start : end, cycle);
        return (
          <Pressable
            key={tab}
            role="tab"
            aria-selected={active === tab}
            accessibilityLabel={`${tab === 'start' ? 'Start' : 'End'}, ${spokenTime(tab === 'start' ? start : end, cycle)}`}
            onPress={() => onPick(tab)}
            style={[styles.tab, webPointer]}>
            <Text style={[styles.tabLabel, { color: colors.muted }]}>{tab === 'start' ? 'Start' : 'End'}</Text>
            <Text style={[styles.tabTime, { color: colors.center }]}>
              {t.time}
              {t.period ? <Text style={styles.tabPeriod}> {t.period}</Text> : null}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Text whose changed characters roll in: the old one rises away, the new one comes up from below. */
function MorphText({ text, color, size }: { text: string; color: string; size: number }) {
  const chars = [...text];
  return (
    <View style={styles.morph} accessible={false}>
      {chars.map((ch, i) => (
        <View key={i} style={{ height: size * 1.3, overflow: 'hidden', justifyContent: 'center' }}>
          <Text style={[styles.morphGhost, { fontSize: size }]}>{ch === ' ' ? ' ' : ch}</Text>
          <Animated.Text
            key={ch}
            entering={FadeInDown.duration(200)}
            exiting={FadeOutUp.duration(160)}
            style={[styles.morphChar, { color, fontSize: size, lineHeight: size * 1.3 }]}>
            {ch === ' ' ? ' ' : ch}
          </Animated.Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, padding: 16 },
  clockCenter: { alignItems: 'center' },
  stackWheel: { marginTop: 6 },
  side: { alignItems: 'center', gap: 10 },
  sideWheel: { flex: 1 },
  duration: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  durationWindow: { borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 7, paddingVertical: 1 },
  tabs: { flexDirection: 'row', borderRadius: 16, padding: 4, marginBottom: 12 },
  tabOn: { position: 'absolute', left: 4, top: 4, bottom: 4, borderRadius: 12 },
  tab: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  tabLabel: { fontSize: 12, fontWeight: '600' },
  tabTime: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'], marginTop: 1 },
  tabPeriod: { fontSize: 12, fontWeight: '600' },
  morph: { flexDirection: 'row', alignItems: 'center' },
  morphGhost: { opacity: 0, fontWeight: '700', fontVariant: ['tabular-nums'] },
  morphChar: { position: 'absolute', left: 0, right: 0, textAlign: 'center', fontWeight: '700', fontVariant: ['tabular-nums'] },
});
