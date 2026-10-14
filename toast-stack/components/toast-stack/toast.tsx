import { useEffect, useRef, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import type { Scheme } from '../../lib/use-scheme';
import { AlertTriangleIcon, InfoIcon } from './icons';
import type { ToastRecord, ToastType } from './store';

// One toast's face: its icon, text, action and progress. The Toaster places, stacks and moves it.

export const TYPE_COLORS = { success: '#16A34A', error: '#E5484D', warning: '#F59E0B', info: '#3B82F6' } as const;

export const SURFACE = {
  light: {
    surface: '#FFFFFF',
    hairline: 'rgba(15, 15, 25, 0.08)',
    highlight: 'transparent',
    shadow: '0px 1px 2px rgba(15, 15, 25, 0.06), 0px 12px 28px rgba(15, 15, 25, 0.12)',
    title: '#15151C',
    body: 'rgba(21, 21, 28, 0.7)',
    actionBg: '#15151C',
    actionText: '#FFFFFF',
    track: 'rgba(21, 21, 28, 0.08)',
    spinner: '#15151C',
  },
  dark: {
    surface: '#1C1C22',
    hairline: 'rgba(255, 255, 255, 0.07)',
    highlight: 'rgba(255, 255, 255, 0.06)',
    shadow: '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 12px 28px rgba(0, 0, 0, 0.45)',
    title: '#F3F3F7',
    body: 'rgba(243, 243, 247, 0.7)',
    actionBg: '#F3F3F7',
    actionText: '#15151C',
    track: 'rgba(255, 255, 255, 0.1)',
    spinner: '#F3F3F7',
  },
} as const;

/** `richColors`: tinted backgrounds. Every text colour holds 4.5:1 or better on its background. */
export const RICH = {
  light: {
    success: { bg: '#EBF8EF', border: 'rgba(22, 163, 74, 0.22)', title: '#0D5229', body: '#1E6B3B', icon: '#16A34A' },
    error: { bg: '#FDEDED', border: 'rgba(229, 72, 77, 0.22)', title: '#86181D', body: '#9E2A2F', icon: '#E5484D' },
    warning: { bg: '#FFF5DE', border: 'rgba(245, 158, 11, 0.3)', title: '#6E4300', body: '#7E5208', icon: '#F59E0B' },
    info: { bg: '#EBF2FF', border: 'rgba(59, 130, 246, 0.22)', title: '#183F9E', body: '#2450B8', icon: '#3B82F6' },
  },
  dark: {
    success: { bg: '#0F2819', border: 'rgba(52, 194, 106, 0.24)', title: '#CFF5DC', body: '#A5E2BB', icon: '#34C26A' },
    error: { bg: '#331517', border: 'rgba(255, 99, 105, 0.24)', title: '#FFD6D8', body: '#F5AEB1', icon: '#FF6369' },
    warning: { bg: '#30220A', border: 'rgba(245, 170, 40, 0.26)', title: '#FFE7B8', body: '#F2CC85', icon: '#F5A524' },
    info: { bg: '#10213D', border: 'rgba(106, 162, 255, 0.24)', title: '#D6E5FF', body: '#A9C6FB', icon: '#6AA2FF' },
  },
} as const;

type Rich = keyof (typeof RICH)['light'];

export function toastColors(type: ToastType, scheme: Scheme, rich: boolean) {
  const base = SURFACE[scheme];
  const tinted = rich && type in RICH[scheme] ? RICH[scheme][type as Rich] : null;
  const icon = type in TYPE_COLORS ? (scheme === 'dark' && tinted ? tinted.icon : TYPE_COLORS[type as Rich]) : base.spinner;
  return {
    bg: tinted?.bg ?? base.surface,
    border: tinted?.border ?? base.hairline,
    title: tinted?.title ?? base.title,
    body: tinted?.body ?? base.body,
    icon,
  };
}

const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;
const CIRCLE = 2 * Math.PI * 9.25;
const CHECK = 11;
const CROSS = 8;
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** A spinner: an arc turning once every 0.9 s. */
function Spinner({ color, size }: { color: string; size: number }) {
  const turn = useSharedValue(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    turn.value = withRepeat(withTiming(1, { duration: reduce ? 1800 : 900, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(turn);
  }, [turn, reduce]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 360}deg` }] }));
  return (
    <Animated.View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={9.25} stroke={color} strokeOpacity={0.18} strokeWidth={1.75} fill="none" />
        <Path d="M12 2.75a9.25 9.25 0 0 1 9.25 9.25" stroke={color} strokeWidth={1.75} strokeLinecap="round" fill="none" />
      </Svg>
    </Animated.View>
  );
}

/**
 * The icon for a type. A loading toast that becomes a success or an error morphs: the spinner shrinks away while the
 * circle and the check (or the cross) draw themselves in 220 ms.
 */
function TypeIcon({ type, from, color, size = 18 }: { type: ToastType; from: ToastType; color: string; size?: number }) {
  const reduce = useReducedMotion();
  // Mounted afresh for each type (keyed), so it starts drawn or undrawn without a frame of the wrong state.
  const morph = from === 'loading' && (type === 'success' || type === 'error');
  const draw = useSharedValue(morph ? 0 : 1);
  const leaving = useSharedValue(morph ? 1 : 0);
  useEffect(() => {
    if (!morph) return;
    draw.value = withTiming(1, { duration: reduce ? 150 : 220, easing: Easing.out(Easing.cubic) });
    leaving.value = withTiming(0, { duration: reduce ? 150 : 200 });
  }, [morph, draw, leaving, reduce]);

  const circleProps = useAnimatedProps(() => ({ strokeDashoffset: CIRCLE * (1 - draw.value) }));
  const markProps = useAnimatedProps(() => ({
    strokeDashoffset: (type === 'error' ? CROSS : CHECK) * (1 - Math.max(0, Math.min(1, draw.value * 1.6 - 0.6))),
  }));
  const spinnerStyle = useAnimatedStyle(() => ({ opacity: leaving.value, transform: [{ scale: 0.4 + 0.6 * leaving.value }] }));

  if (type === 'warning') return <AlertTriangleIcon color={color} size={size} />;
  if (type === 'info') return <InfoIcon color={color} size={size} />;
  if (type === 'loading') return <Spinner color={color} size={size} />;
  if (type !== 'success' && type !== 'error') return null;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <AnimatedCircle
          cx={12}
          cy={12}
          r={9.25}
          stroke={color}
          strokeWidth={1.75}
          fill="none"
          strokeDasharray={CIRCLE}
          animatedProps={circleProps}
          transform="rotate(-90 12 12)"
        />
        {type === 'success' ? (
          <AnimatedPath
            d="m8.2 12.3 2.6 2.6 5-5.3"
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={CHECK}
            animatedProps={markProps}
          />
        ) : (
          <>
            <AnimatedPath d="m9.2 9.2 5.6 5.6" stroke={color} strokeWidth={1.75} strokeLinecap="round" fill="none" strokeDasharray={CROSS} animatedProps={markProps} />
            <AnimatedPath d="m14.8 9.2-5.6 5.6" stroke={color} strokeWidth={1.75} strokeLinecap="round" fill="none" strokeDasharray={CROSS} animatedProps={markProps} />
          </>
        )}
      </Svg>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, spinnerStyle]}>
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 2.75a9.25 9.25 0 0 1 9.25 9.25" stroke={color} strokeWidth={1.75} strokeLinecap="round" fill="none" />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** A thin bar for `progress` (an upload), easing to each new value. */
function ProgressBar({ value, color, track }: { value: number; color: string; track: string }) {
  const width = useSharedValue(value);
  useEffect(() => {
    width.value = withTiming(Math.max(0, Math.min(1, value)), { duration: 260, easing: Easing.out(Easing.cubic) });
  }, [value, width]);
  const fill = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));
  return (
    <View style={[styles.bar, { backgroundColor: track }]}>
      <Animated.View style={[styles.barFill, { backgroundColor: color }, fill]} />
    </View>
  );
}

type ToastFaceProps = {
  record: ToastRecord;
  scheme: Scheme;
  rich: boolean;
  onAction: () => void;
  onCancel: () => void;
};

/** What a toast shows. Its text fades in when it changes (a promise settling), never over the old text. */
export function ToastFace({ record, scheme, rich, onAction, onCancel }: ToastFaceProps) {
  const base = SURFACE[scheme];
  const colors = toastColors(record.type, scheme, rich);
  const { options } = record;
  // The type before this render, so the icon knows to morph from a spinner.
  const previousType = useRef(record.type);
  useEffect(() => {
    previousType.current = record.type;
  }, [record.type]);
  if (record.render) return <View style={styles.custom}>{record.render(record.id)}</View>;

  const icon: ReactNode =
    options.icon === null ? null : options.icon !== undefined ? (
      options.icon
    ) : (
      <TypeIcon key={record.type} type={record.type} from={previousType.current} color={colors.icon} />
    );

  return (
    <View style={styles.row}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Animated.View key={`${record.title}|${options.description ?? ''}`} entering={FadeIn.duration(180)} style={styles.text}>
        <Text numberOfLines={2} style={[styles.title, { color: colors.title }]}>
          {record.title}
        </Text>
        {options.description ? (
          <Text numberOfLines={3} style={[styles.description, { color: colors.body }]}>
            {options.description}
          </Text>
        ) : null}
        {options.progress !== undefined ? <ProgressBar value={options.progress} color={colors.icon} track={base.track} /> : null}
      </Animated.View>
      {options.cancel ? (
        <Pressable accessibilityRole="button" hitSlop={8} onPress={onCancel} style={[styles.cancel, webPointer]}>
          <Text style={[styles.cancelText, { color: colors.body }]}>{options.cancel.label}</Text>
        </Pressable>
      ) : null}
      {options.action ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={onAction}
          style={({ pressed }) => [styles.action, { backgroundColor: base.actionBg, opacity: pressed ? 0.8 : 1 }, webPointer]}>
          <Text style={[styles.actionText, { color: base.actionText }]}>{options.action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  icon: { width: 18, height: 18 },
  text: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  description: { fontSize: 13, lineHeight: 18, marginTop: 1 },
  custom: { minHeight: 56 },
  action: { height: 30, borderRadius: 15, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 13, fontWeight: '700' },
  cancel: { height: 30, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 13, fontWeight: '600' },
  bar: { height: 4, borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2 },
});
