import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useScheme, type Scheme } from '../../lib/use-scheme';
import { ArrowIcon, CheckIcon, CrossIcon, Spinner } from './icons';

export type SlideToConfirmStatus = 'idle' | 'busy' | 'done' | 'failed';

export type SlideToConfirmProps = {
  /** What sliding does, e.g. "Slide to pay $249.00". Screen readers announce it too. */
  label: string;
  /**
   * Called once the thumb reaches the end. Return a promise to show a spinner until it settles:
   * resolved shows `doneLabel`, rejected shows `failLabel` and lets the user try again.
   */
  onConfirm: () => unknown;
  doneLabel?: string;
  failLabel?: string;
  /** The thumb's and the fill's color. Defaults to the theme's ink: near black, or near white in dark. */
  tint?: string;
  /** The icons' and the done label's color on the tint. */
  onTint?: string;
  disabled?: boolean;
  /** Milliseconds before a confirmed slider resets by itself; 0 keeps it confirmed. */
  resetAfter?: number;
  height?: number;
  scheme?: Scheme;
  style?: StyleProp<ViewStyle>;
};

const INSET = 5;
/** How far (of the way) the thumb must go to confirm when it's let go. */
const THRESHOLD = 0.86;
const SNAP = { damping: 20, stiffness: 260, mass: 0.7 };
const BACK = { damping: 17, stiffness: 210, mass: 0.8 };
const FAIL_HOLD = 1400;

const THEMES = {
  light: {
    track: '#ECEDF0',
    line: 'rgba(12, 13, 16, 0.06)',
    text: '#0C0D10',
    ink: '#0C0D10',
    page: '#FFFFFF',
    danger: '#D63B40',
  },
  dark: {
    track: '#1B1C20',
    line: 'rgba(255, 255, 255, 0.07)',
    text: '#F2F3F5',
    ink: '#F2F3F5',
    page: '#0C0D10',
    danger: '#EF5A5F',
  },
} as const;

const webGrab = Platform.OS === 'web' ? ({ cursor: 'grab' } as unknown as ViewStyle) : null;

/**
 * A pill you slide to the end to confirm something that shouldn't happen by accident: a payment,
 * a transfer, an unlock. Drag with a finger or the mouse; tap the track for a hint.
 */
export function SlideToConfirm({
  label,
  onConfirm,
  doneLabel = 'Done',
  failLabel = 'Try again',
  tint,
  onTint,
  disabled = false,
  resetAfter = 1800,
  height = 64,
  scheme: schemeProp,
  style,
}: SlideToConfirmProps) {
  const scheme = useScheme(schemeProp);
  const theme = THEMES[scheme];
  const fill = tint ?? theme.ink;
  const fillText = onTint ?? (tint ? '#FFFFFF' : theme.page);
  const thumb = height - INSET * 2;
  const reduceMotion = useReducedMotion();

  const [status, setStatus] = useState<SlideToConfirmStatus>('idle');
  const [width, setWidth] = useState(0);
  const statusRef = useRef(status);
  statusRef.current = status;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const max = useSharedValue(0);
  const x = useSharedValue(0);
  const start = useSharedValue(0);
  const anchor = useSharedValue(0);
  const armed = useSharedValue(false);
  const pressed = useSharedValue(0);
  const shake = useSharedValue(0);
  const done = useSharedValue(0);
  const failed = useSharedValue(0);

  const interactive = !disabled && status === 'idle' && width > 0;

  useEffect(() => {
    done.value = withTiming(status === 'done' ? 1 : 0, { duration: 280 });
    failed.value = withTiming(status === 'failed' ? 1 : 0, { duration: 180 });
  }, [status, done, failed]);

  useEffect(() => {
    if (status === 'done' && resetAfter > 0) {
      const timer = setTimeout(reset, resetAfter);
      return () => clearTimeout(timer);
    }
    if (status === 'failed') {
      const timer = setTimeout(() => setStatus('idle'), FAIL_HOLD);
      return () => clearTimeout(timer);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, resetAfter]);

  function onLayout(event: LayoutChangeEvent) {
    const next = event.nativeEvent.layout.width;
    setWidth(next);
    max.value = Math.max(0, next - thumb - INSET * 2);
    if (statusRef.current === 'done' || statusRef.current === 'busy') x.value = max.value;
  }

  function reset() {
    if (!mounted.current) return;
    setStatus('idle');
    x.value = withSpring(0, BACK);
  }

  function succeed() {
    if (!mounted.current) return;
    setStatus('done');
    buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  }

  function fail() {
    if (!mounted.current) return;
    setStatus('failed');
    buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
    x.value = withSpring(0, BACK);
    shake.value = withSequence(
      withTiming(-8, { duration: 45 }),
      withRepeat(withTiming(8, { duration: 80 }), 3, true),
      withTiming(0, { duration: 45 }),
    );
  }

  function confirm() {
    if (statusRef.current !== 'idle') return;
    buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
    let result: unknown;
    try {
      result = onConfirm();
    } catch {
      fail();
      return;
    }
    if (result instanceof Promise) {
      setStatus('busy');
      result.then(succeed, fail);
    } else {
      succeed();
    }
  }

  function tick() {
    buzz(() => Haptics.selectionAsync());
  }

  const pan = Gesture.Pan()
    .enabled(interactive)
    .minDistance(1)
    .onBegin((event) => {
      pressed.value = withTiming(1, { duration: 120 });
      start.value = x.value;
      anchor.value = event.absoluteX;
    })
    .onUpdate((event) => {
      // From where the pointer went down, not from where the pan activated: nothing is lost.
      const next = Math.min(Math.max(start.value + event.absoluteX - anchor.value, 0), max.value);
      x.value = next;
      const over = next >= max.value * THRESHOLD;
      if (over !== armed.value) {
        armed.value = over;
        if (over) scheduleOnRN(tick);
      }
    })
    .onEnd((event) => {
      if (x.value >= max.value * THRESHOLD || (event.velocityX > 900 && x.value > max.value * 0.45)) {
        x.value = withSpring(max.value, SNAP);
        scheduleOnRN(confirm);
      } else {
        x.value = withSpring(0, BACK);
      }
    })
    .onFinalize(() => {
      pressed.value = withTiming(0, { duration: 160 });
      armed.value = false;
    });

  // A tap anywhere nudges the thumb: it shows a mouse user that this slides, not clicks.
  const tap = Gesture.Tap()
    .enabled(interactive)
    .onEnd(() => {
      x.value = withSequence(
        withTiming(Math.min(34, max.value), { duration: 210, easing: Easing.out(Easing.cubic) }),
        withSpring(0, BACK),
      );
    });

  const progress = (value: number, of: number) => {
    'worklet';
    return of > 0 ? value / of : 0;
  };

  const fillStyle = useAnimatedStyle(() => {
    const p = progress(x.value, max.value);
    return {
      width: x.value + thumb,
      opacity: interpolate(done.value, [0, 1], [0.1 + p * 0.14, 1]),
      backgroundColor: interpolateColor(failed.value, [0, 1], [fill, theme.danger]),
    };
  });

  const labelStyle = useAnimatedStyle(() => {
    const p = progress(x.value, max.value);
    return {
      opacity: interpolate(p, [0, 0.5], [1, 0], Extrapolation.CLAMP) * (1 - done.value),
      transform: [{ translateX: p * 16 }],
    };
  });

  const doneStyle = useAnimatedStyle(() => ({
    opacity: done.value,
    transform: [{ scale: 0.96 + done.value * 0.04 }],
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(failed.value, [0, 1], [fill, theme.danger]),
    // Once confirmed the thumb melts into the fill: no shadow ring left round it.
    shadowOpacity: 0.16 * (1 - done.value),
    transform: [{ translateX: x.value + shake.value }, { scale: 1 + pressed.value * 0.05 }],
  }));

  function onAccessibilityAction(event: AccessibilityActionEvent) {
    if (event.nativeEvent.actionName !== 'activate' || !interactive) return;
    x.value = withSpring(max.value, SNAP);
    confirm();
  }

  const iconSize = Math.round(thumb * 0.42);
  const message = status === 'failed' ? failLabel : label;

  return (
    <GestureDetector gesture={Gesture.Race(pan, tap)}>
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel={status === 'done' ? doneLabel : label}
        accessibilityHint="Slide to the end, or double-tap, to confirm."
        accessibilityState={{ disabled, busy: status === 'busy' }}
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={onAccessibilityAction}
        onLayout={onLayout}
        style={[
          styles.track,
          { height, borderRadius: height / 2, backgroundColor: theme.track, borderColor: theme.line },
          disabled && styles.disabled,
          style,
        ]}>
        <Animated.View
          pointerEvents="none"
          style={[styles.fill, { borderRadius: thumb / 2, height: thumb }, fillStyle]}
        />

        <Animated.View pointerEvents="none" style={[styles.center, { paddingLeft: thumb }, labelStyle]}>
          <Text
            numberOfLines={1}
            style={[styles.label, { color: status === 'failed' ? theme.danger : theme.text }]}>
            {message}
          </Text>
          {status === 'idle' ? <Chevrons color={theme.text} still={reduceMotion} /> : null}
        </Animated.View>

        <Animated.View pointerEvents="none" style={[styles.center, doneStyle]}>
          <Text numberOfLines={1} style={[styles.label, { color: fillText }]}>
            {doneLabel}
          </Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.thumb,
            { width: thumb, height: thumb, borderRadius: thumb / 2 },
            webGrab,
            thumbStyle,
          ]}>
          {status === 'busy' ? (
            <Spinner size={iconSize} color={fillText} />
          ) : status === 'done' ? (
            <CheckIcon size={iconSize} color={fillText} />
          ) : status === 'failed' ? (
            <CrossIcon size={iconSize} color="#FFFFFF" />
          ) : (
            <ArrowIcon size={iconSize} color={fillText} />
          )}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

/** Three chevrons that brighten in turn, pointing the way. */
function Chevrons({ color, still }: { color: string; still: boolean }) {
  return (
    <View style={styles.chevrons}>
      {[0, 1, 2].map((index) => (
        <Chevron key={index} index={index} color={color} still={still} />
      ))}
    </View>
  );
}

function Chevron({ index, color, still }: { index: number; color: string; still: boolean }) {
  const glow = useSharedValue(still ? 0.5 : 0.18);

  useEffect(() => {
    if (still) return;
    glow.value = withDelay(
      index * 160,
      withRepeat(
        withSequence(
          withTiming(0.85, { duration: 420, easing: Easing.out(Easing.quad) }),
          withTiming(0.18, { duration: 620, easing: Easing.in(Easing.quad) }),
          withTiming(0.18, { duration: 340 }),
        ),
        -1,
      ),
    );
  }, [glow, index, still]);

  const style = useAnimatedStyle(() => ({ opacity: glow.value }));
  return (
    <Animated.Text style={[styles.chevron, { color }, style]} accessible={false}>
      ›
    </Animated.Text>
  );
}

/** Haptics are a nicety: where a device has none, the promise is dropped. */
function buzz(call: () => Promise<void>) {
  call().catch(() => undefined);
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  disabled: { opacity: 0.5 },
  fill: { position: 'absolute', left: INSET },
  center: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  label: { fontSize: 16, fontWeight: '600', letterSpacing: -0.1, userSelect: 'none' },
  chevrons: { flexDirection: 'row', marginLeft: 2 },
  chevron: { fontSize: 18, fontWeight: '600', marginLeft: -1, userSelect: 'none' },
  thumb: {
    position: 'absolute',
    left: INSET,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
});
