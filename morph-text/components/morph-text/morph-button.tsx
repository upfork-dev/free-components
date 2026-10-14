import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useScheme, type Scheme } from '../../lib/use-scheme';
import { inOutQuad, outQuad } from './easing';
import { DrawnCheck, ErrorMark, Spinner } from './icons';
import { MorphText } from './morph-text';
import { DEFAULT_SPRING } from './timeline';

export type MorphButtonState = 'idle' | 'loading' | 'success' | 'error';

export type MorphButtonProps = {
  label: string;
  successLabel?: string;
  errorLabel?: string;
  /** Controlled state. Leave it out and return a promise from `onPress` instead. */
  state?: MorphButtonState;
  /** A promise walks the button through loading, then success or error. */
  onPress?: () => void | Promise<unknown>;
  /** ms in success or error before going back to idle (uncontrolled). */
  resetAfter?: number;
  variant?: 'solid' | 'tinted' | 'outline';
  tone?: 'accent' | 'neutral' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: ComponentType<{ color: string; size: number }>;
  disabled?: boolean;
  scheme?: Scheme;
  haptics?: boolean;
  /** Read instead of the label while loading. Defaults to "<label>, loading". */
  loadingLabel?: string;
  style?: StyleProp<ViewStyle>;
};

type Colors = { bg: string; fg: string; border: string };
type Variant = 'solid' | 'tinted' | 'outline';
type Tone = 'accent' | 'neutral' | 'danger' | 'success' | 'error';

// Every pair of text and fill here reads at 4.5:1 or better.
const PALETTE: Record<Scheme, Record<Tone, Record<Variant, Colors>>> = {
  light: {
    accent: {
      solid: { bg: '#111114', fg: '#FFFFFF', border: '#111114' },
      tinted: { bg: 'rgba(17, 17, 20, 0.08)', fg: '#111114', border: 'rgba(17, 17, 20, 0)' },
      outline: { bg: 'rgba(17, 17, 20, 0)', fg: '#111114', border: 'rgba(17, 17, 20, 0.2)' },
    },
    neutral: {
      solid: { bg: '#E7E7EB', fg: '#111114', border: '#E7E7EB' },
      tinted: { bg: 'rgba(17, 17, 20, 0.05)', fg: '#34343C', border: 'rgba(17, 17, 20, 0)' },
      outline: { bg: 'rgba(17, 17, 20, 0)', fg: '#34343C', border: 'rgba(17, 17, 20, 0.13)' },
    },
    danger: {
      solid: { bg: '#D6363C', fg: '#FFFFFF', border: '#D6363C' },
      tinted: { bg: 'rgba(229, 72, 77, 0.1)', fg: '#C02E34', border: 'rgba(229, 72, 77, 0)' },
      outline: { bg: 'rgba(229, 72, 77, 0)', fg: '#C02E34', border: 'rgba(229, 72, 77, 0.38)' },
    },
    success: {
      solid: { bg: '#15803D', fg: '#FFFFFF', border: '#15803D' },
      tinted: { bg: 'rgba(22, 163, 74, 0.12)', fg: '#15803D', border: 'rgba(22, 163, 74, 0)' },
      outline: { bg: 'rgba(22, 163, 74, 0)', fg: '#15803D', border: 'rgba(22, 163, 74, 0.42)' },
    },
    error: {
      solid: { bg: '#D6363C', fg: '#FFFFFF', border: '#D6363C' },
      tinted: { bg: 'rgba(229, 72, 77, 0.12)', fg: '#C02E34', border: 'rgba(229, 72, 77, 0)' },
      outline: { bg: 'rgba(229, 72, 77, 0)', fg: '#C02E34', border: 'rgba(229, 72, 77, 0.42)' },
    },
  },
  dark: {
    accent: {
      solid: { bg: '#F4F4F6', fg: '#0B0B0E', border: '#F4F4F6' },
      tinted: { bg: 'rgba(255, 255, 255, 0.08)', fg: '#FFFFFF', border: 'rgba(255, 255, 255, 0)' },
      outline: { bg: 'rgba(255, 255, 255, 0)', fg: '#F4F4F6', border: 'rgba(255, 255, 255, 0.24)' },
    },
    neutral: {
      solid: { bg: '#2A2A31', fg: '#F4F4F6', border: '#2A2A31' },
      tinted: { bg: 'rgba(255, 255, 255, 0.06)', fg: '#D6D6DC', border: 'rgba(255, 255, 255, 0)' },
      outline: { bg: 'rgba(255, 255, 255, 0)', fg: '#D6D6DC', border: 'rgba(255, 255, 255, 0.16)' },
    },
    danger: {
      solid: { bg: '#FF6B70', fg: '#0B0B0E', border: '#FF6B70' },
      tinted: { bg: 'rgba(255, 99, 105, 0.14)', fg: '#FF8F93', border: 'rgba(255, 99, 105, 0)' },
      outline: { bg: 'rgba(255, 99, 105, 0)', fg: '#FF8F93', border: 'rgba(255, 99, 105, 0.42)' },
    },
    success: {
      solid: { bg: '#4ADE80', fg: '#052E16', border: '#4ADE80' },
      tinted: { bg: 'rgba(74, 222, 128, 0.13)', fg: '#4ADE80', border: 'rgba(74, 222, 128, 0)' },
      outline: { bg: 'rgba(74, 222, 128, 0)', fg: '#4ADE80', border: 'rgba(74, 222, 128, 0.42)' },
    },
    error: {
      solid: { bg: '#FF6B70', fg: '#0B0B0E', border: '#FF6B70' },
      tinted: { bg: 'rgba(255, 99, 105, 0.15)', fg: '#FF8F93', border: 'rgba(255, 99, 105, 0)' },
      outline: { bg: 'rgba(255, 99, 105, 0)', fg: '#FF8F93', border: 'rgba(255, 99, 105, 0.45)' },
    },
  },
};

const SIZES = {
  sm: { height: 36, pad: 14, font: 14, icon: 16, gap: 6 },
  md: { height: 46, pad: 18, font: 16, icon: 18, gap: 8 },
  lg: { height: 54, pad: 22, font: 17, icon: 20, gap: 9 },
} as const;

const PRESS = { stiffness: 420, damping: 28, mass: 0.7 };
const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;

function buzz(enabled: boolean, call: () => Promise<void>) {
  // On the web, expo-haptics calls navigator.vibrate, which Chrome refuses before a first tap.
  if (!enabled || Platform.OS === 'web') return;
  call().catch(() => undefined);
}

/**
 * A pill whose label morphs while its width springs to fit, through idle, loading, success and
 * error. Return a promise from `onPress` and it walks the states by itself.
 */
export function MorphButton({
  label,
  successLabel,
  errorLabel = 'Try again',
  state: stateProp,
  onPress,
  resetAfter = 1600,
  variant = 'solid',
  tone = 'accent',
  size = 'md',
  icon: Icon,
  disabled = false,
  scheme: schemeProp,
  haptics = true,
  loadingLabel,
  style,
}: MorphButtonProps) {
  const scheme = useScheme(schemeProp);
  const reduceMotion = useReducedMotion();
  const dims = SIZES[size];
  const [own, setOwn] = useState<MorphButtonState>('idle');
  const state = stateProp ?? own;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const toneNow: Tone = state === 'success' ? 'success' : state === 'error' ? 'error' : tone;
  const colors = PALETTE[scheme][toneNow][variant];

  // Colours travel from what's on screen to the new state's.
  const paint = useSharedValue(1);
  const bgFrom = useSharedValue(colors.bg);
  const bgTo = useSharedValue(colors.bg);
  const borderFrom = useSharedValue(colors.border);
  const borderTo = useSharedValue(colors.border);
  useEffect(() => {
    if (bgTo.value === colors.bg && borderTo.value === colors.border) return;
    bgFrom.value = interpolateColor(paint.value, [0, 1], [bgFrom.value, bgTo.value]) as string;
    borderFrom.value = interpolateColor(paint.value, [0, 1], [borderFrom.value, borderTo.value]) as string;
    bgTo.value = colors.bg;
    borderTo.value = colors.border;
    paint.value = 0;
    paint.value = withTiming(1, { duration: 240, easing: inOutQuad });
  }, [colors.bg, colors.border, bgFrom, bgTo, borderFrom, borderTo, paint]);

  const shrink = state === 'loading' && !reduceMotion;
  const iconSlot =
    state === 'loading' ? dims.icon + (shrink ? 0 : dims.gap) : state === 'success' || state === 'error' || Icon ? dims.icon + dims.gap : 0;
  const pad = shrink ? (dims.height - dims.icon) / 2 : dims.pad;
  const text =
    state === 'loading'
      ? shrink
        ? ''
        : label
      : state === 'success'
        ? (successLabel ?? label)
        : state === 'error'
          ? errorLabel
          : label;

  const spring = reduceMotion ? { duration: 160, dampingRatio: 1 } : DEFAULT_SPRING;
  const slot = useSharedValue(iconSlot);
  const padding = useSharedValue(pad);
  const press = useSharedValue(1);
  const shake = useSharedValue(0);
  useEffect(() => {
    slot.value = withSpring(iconSlot, spring);
    padding.value = withSpring(pad, spring);
    // Springs follow the state's numbers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iconSlot, pad]);

  // What each state feels like, and what a screen reader hears.
  const previous = useRef(state);
  useEffect(() => {
    if (previous.current === state) return;
    previous.current = state;
    if (state === 'loading') buzz(haptics, () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    if (state === 'success') {
      buzz(haptics, () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
      AccessibilityInfo.announceForAccessibility(successLabel ?? label);
    }
    if (state === 'error') {
      buzz(haptics, () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
      AccessibilityInfo.announceForAccessibility(errorLabel);
      if (!reduceMotion) {
        shake.value = withSequence(
          withTiming(-7, { duration: 50, easing: outQuad }),
          withTiming(6, { duration: 80, easing: inOutQuad }),
          withTiming(-4, { duration: 80, easing: inOutQuad }),
          withTiming(2, { duration: 70, easing: inOutQuad }),
          withTiming(0, { duration: 60, easing: outQuad }),
        );
      }
    }
  }, [state, haptics, successLabel, label, errorLabel, reduceMotion, shake]);

  // Uncontrolled: success and error go back to idle by themselves.
  useEffect(() => {
    if (stateProp !== undefined || (own !== 'success' && own !== 'error')) return undefined;
    const timer = setTimeout(() => mounted.current && setOwn('idle'), resetAfter);
    return () => clearTimeout(timer);
  }, [own, stateProp, resetAfter]);

  const handlePress = () => {
    if (disabled || state === 'loading') return;
    let result: void | Promise<unknown>;
    try {
      result = onPress?.();
    } catch {
      if (stateProp === undefined) setOwn('error');
      return;
    }
    if (stateProp === undefined && result && typeof (result as Promise<unknown>).then === 'function') {
      setOwn('loading');
      (result as Promise<unknown>).then(
        () => mounted.current && setOwn('success'),
        () => mounted.current && setOwn('error'),
      );
    }
  };

  const pillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(paint.value, [0, 1], [bgFrom.value, bgTo.value]),
    borderColor: interpolateColor(paint.value, [0, 1], [borderFrom.value, borderTo.value]),
    paddingHorizontal: padding.value,
    transform: [{ translateX: shake.value }, { scale: press.value }],
  }));
  const slotStyle = useAnimatedStyle(() => ({ width: slot.value }));

  const a11yLabel = state === 'loading' ? (loadingLabel ?? `${label}, loading`) : text || label;

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={() => {
        press.value = withSpring(0.965, PRESS);
      }}
      onPressOut={() => {
        press.value = withSpring(1, PRESS);
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ disabled, busy: state === 'loading' }}
      hitSlop={dims.height < 44 ? (44 - dims.height) / 2 : undefined}
      style={[{ opacity: disabled ? 0.45 : 1 }, webPointer, style]}
    >
      <Animated.View
        style={[
          styles.pill,
          { height: dims.height, borderRadius: dims.height / 2, borderWidth: variant === 'outline' ? 1.5 : 0 },
          pillStyle,
        ]}
      >
        <Animated.View style={[styles.slot, { height: dims.icon }, slotStyle]}>
          <IconLayer visible={state === 'idle' && !!Icon} size={dims.icon}>
            {Icon ? <Icon color={colors.fg} size={dims.icon} /> : null}
          </IconLayer>
          <IconLayer visible={state === 'loading'} size={dims.icon}>
            <Spinner size={dims.icon} color={colors.fg} />
          </IconLayer>
          <IconLayer visible={state === 'success'} size={dims.icon}>
            <DrawnCheck size={dims.icon} color={colors.fg} drawn={state === 'success'} />
          </IconLayer>
          <IconLayer visible={state === 'error'} size={dims.icon}>
            <ErrorMark size={dims.icon} color={colors.fg} />
          </IconLayer>
        </Animated.View>
        <MorphText
          text={text}
          align="start"
          style={{ fontSize: dims.font, fontWeight: '600', color: colors.fg, letterSpacing: -0.1 }}
        />
      </Animated.View>
    </Pressable>
  );
}

function IconLayer({ visible, size, children }: { visible: boolean; size: number; children: ReactNode }) {
  const shown = useSharedValue(visible ? 1 : 0);
  useEffect(() => {
    shown.value = withTiming(visible ? 1 : 0, { duration: visible ? 180 : 120, easing: outQuad });
  }, [visible, shown]);
  const style = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ scale: 0.6 + 0.4 * shown.value }] }));
  return <Animated.View style={[styles.layer, { width: size, height: size }, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  slot: { overflow: 'visible' },
  layer: { position: 'absolute', left: 0, top: 0, alignItems: 'center', justifyContent: 'center' },
});

