import * as Haptics from 'expo-haptics';
import { memo, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  AppState,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { useScheme, type Scheme } from '../../lib/use-scheme';
import { DEFAULT_DURATION, expireToast, removeToast, toast, useToasts, type ToastRecord } from './store';
import { SURFACE, ToastFace, toastColors } from './toast';

export type ToasterProps = {
  position?: 'top' | 'bottom';
  /** Toasts drawn in the stack (the rest wait their turn). */
  visibleToasts?: number;
  /** Distance from the screen's edge, past the safe area: room for a tab bar. */
  offset?: number;
  /** The gap between toasts when the stack is open. */
  gap?: number;
  /** Always open, every toast readable. */
  expand?: boolean;
  /** Tinted backgrounds for success, error, warning and info. */
  richColors?: boolean;
  /** A hairline along each toast's bottom edge showing the time it has left. */
  showProgress?: boolean;
  /** A soft scrim behind the open stack, or a wash of your page's colour rising behind it. */
  backdrop?: boolean | { color: string; opacity?: number };
  scheme?: Scheme;
  toastStyle?: StyleProp<ViewStyle>;
};

const NO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };
const ENTER = { stiffness: 260, damping: 24, mass: 1 };
const MOVE = { stiffness: 260, damping: 28, mass: 1 };
const OPEN = { stiffness: 220, damping: 26, mass: 1 };
const QUICK = { duration: 150 };
const PEEK = 10;
const RADIUS = 18;
const MAX_WIDTH = 420;
const SIDE = 16;
const IDLE_COLLAPSE = 5000;
const CAN_BUZZ = Platform.OS !== 'web';

let owner: symbol | null = null;

/**
 * Draws the toasts: a collapsed stack that peeks, fans open when touched (or hovered), pauses its timers politely and
 * lets each toast be swiped away. Mount one near the root of your app.
 */
export function Toaster({
  position = 'bottom',
  visibleToasts = 3,
  offset = 16,
  gap = 8,
  expand: alwaysOpen = false,
  richColors = false,
  showProgress = false,
  backdrop = false,
  scheme: schemeProp,
  toastStyle,
}: ToasterProps) {
  // One store, one Toaster: a second one (a hot reload, a duplicate) draws nothing.
  const token = useRef(Symbol('toaster')).current;
  const [isOwner, setOwner] = useState(false);
  useEffect(() => {
    if (owner === null || owner === token) {
      owner = token;
      setOwner(true);
    } else if (__DEV__) {
      console.warn('Toast Stack: another <Toaster /> is already mounted; this one draws nothing.');
    }
    return () => {
      if (owner === token) owner = null;
    };
  }, [token]);

  const all = useToasts();
  const scheme = useScheme(schemeProp);
  const reduce = useReducedMotion();
  const insets = useContext(SafeAreaInsetsContext) ?? NO_INSETS;
  const window = useWindowDimensions();
  const width = Math.min(window.width - SIDE * 2, MAX_WIDTH);
  const visible = Math.max(1, visibleToasts);

  // The stack: the newest toasts, plus one more fading at the back so a toast pushed out leaves softly.
  const active = useMemo(() => all.filter((t) => !t.closing), [all]);
  const shown = active.slice(0, visible + 1);
  const shownKey = shown.map((t) => t.id).join('|');
  const mounted = useRef(new Set<string>());
  const leaving = all.filter((t) => t.closing && mounted.current.has(t.id));
  const items = [...shown, ...leaving];
  useEffect(() => {
    // A toast closed before it was ever drawn goes at once.
    for (const t of all) if (t.closing && !mounted.current.has(t.id)) removeToast(t.id);
    mounted.current = new Set(items.map((t) => t.id));
  });

  const order = useSharedValue<string[]>([]);
  const heights = useSharedValue<Record<string, number>>({});
  useEffect(() => {
    order.value = shownKey ? shownKey.split('|') : [];
  }, [shownKey, order]);

  // Open or collapsed.
  const [opened, setOpened] = useState(false);
  const open = alwaysOpen || opened;
  const progress = useSharedValue(open ? 1 : 0);
  useEffect(() => {
    progress.value = reduce ? withTiming(open ? 1 : 0, QUICK) : withSpring(open ? 1 : 0, OPEN);
  }, [open, progress, reduce]);
  useEffect(() => {
    if (active.length === 0) setOpened(false);
  }, [active.length]);

  // Timers pause while the stack is open, pressed, hovered or the app is in the background.
  const [hovered, setHovered] = useState(false);
  const [touching, setTouching] = useState(false);
  const [away, setAway] = useState(AppState.currentState !== 'active' && AppState.currentState !== undefined);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setAway(state !== 'active'));
    return () => sub.remove();
  }, []);
  const paused = opened || touching || hovered || away;

  // An open stack closes itself after a while without a touch.
  useEffect(() => {
    if (!opened || alwaysOpen || hovered || touching) return;
    const timer = setTimeout(() => setOpened(false), IDLE_COLLAPSE);
    return () => clearTimeout(timer);
  }, [opened, alwaysOpen, hovered, touching]);

  // Bottom toasts rise above the keyboard with it.
  const lift = useSharedValue(0);
  useEffect(() => {
    if (position !== 'bottom') return;
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (event) => {
      const to = Math.max(0, event.endCoordinates.height - insets.bottom);
      lift.value = ios ? withTiming(to, { duration: event.duration || 250 }) : withSpring(to, MOVE);
    });
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', (event) => {
      lift.value = ios ? withTiming(0, { duration: event.duration || 250 }) : withSpring(0, MOVE);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [position, insets.bottom, lift]);

  const measure = useCallback(
    (id: string, height: number) => {
      if (heights.value[id] === height) return;
      heights.value = { ...heights.value, [id]: height };
    },
    [heights],
  );
  useEffect(() => {
    // Forget the heights of toasts that are gone.
    const keep = new Set(all.map((t) => t.id));
    const stale = Object.keys(heights.value).filter((id) => !keep.has(id));
    if (stale.length === 0) return;
    const next = { ...heights.value };
    for (const id of stale) delete next[id];
    heights.value = next;
  }, [all, heights]);

  const sign = position === 'bottom' ? 1 : -1;
  const edge = (position === 'bottom' ? insets.bottom : insets.top) + offset;

  // The stack's own box: as tall as the front toast and its peeks, or the whole open list.
  const box = useAnimatedStyle(() => {
    const ids = order.value.slice(0, visible);
    let open = 0;
    let front = 0;
    for (let i = 0; i < ids.length; i += 1) {
      const h = heights.value[ids[i]] ?? 0;
      if (i === 0) front = h;
      open += h + (i > 0 ? gap : 0);
    }
    const closed = front + PEEK * Math.min(Math.max(ids.length - 1, 0), 2);
    return {
      height: closed + (open - closed) * progress.value,
      transform: [{ translateY: -lift.value }],
    };
  });

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const gradientId = `toast-wash-${useId().replace(/:/g, '')}`;

  if (!isOwner) return null;

  const scrim =
    backdrop === true ? (scheme === 'dark' ? 'rgba(0, 0, 0, 0.42)' : 'rgba(255, 255, 255, 0.5)') : null;
  const wash = typeof backdrop === 'object' ? backdrop : null;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {opened ? (
        // A touch anywhere outside the open stack closes it.
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close notifications"
          onPressIn={() => setOpened(false)}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {scrim || wash ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, backdropStyle]}>
          {scrim ? <View style={[StyleSheet.absoluteFill, { backgroundColor: scrim }]} /> : null}
          {wash ? (
            <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id={gradientId} x1="0" y1={position === 'bottom' ? '1' : '0'} x2="0" y2={position === 'bottom' ? '0' : '1'}>
                  <Stop offset="0" stopColor={wash.color} stopOpacity={wash.opacity ?? 0.92} />
                  <Stop offset="0.55" stopColor={wash.color} stopOpacity={(wash.opacity ?? 0.92) * 0.6} />
                  <Stop offset="1" stopColor={wash.color} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradientId})`} />
            </Svg>
          ) : null}
        </Animated.View>
      ) : null}
      <Animated.View
        pointerEvents="box-none"
        onPointerEnter={(event) => {
          if (Platform.OS === 'web' && event.nativeEvent.pointerType === 'mouse') {
            setHovered(true);
            setOpened(true);
          }
        }}
        onPointerLeave={(event) => {
          if (Platform.OS === 'web' && event.nativeEvent.pointerType === 'mouse') {
            setHovered(false);
            setOpened(false);
          }
        }}
        style={[
          styles.stack,
          { width, left: (window.width - width) / 2 },
          position === 'bottom' ? { bottom: edge } : { top: edge },
          box,
        ]}>
        {items.map((record) => {
          const index = shown.indexOf(record);
          return (
            <ToastItem
              key={record.id}
              record={record}
              index={index}
              visible={visible}
              order={order}
              heights={heights}
              progress={progress}
              open={open}
              paused={paused}
              position={position}
              sign={sign}
              gap={gap}
              width={width}
              scheme={scheme}
              rich={richColors}
              showProgress={showProgress}
              reduce={reduce}
              toastStyle={toastStyle}
              onMeasure={measure}
              onTouch={setTouching}
              onOpen={() => setOpened(true)}
            />
          );
        })}
      </Animated.View>
    </View>
  );
}

type ToastItemProps = {
  record: ToastRecord;
  /** Its place from the front, or -1 while it leaves. */
  index: number;
  visible: number;
  order: SharedValue<string[]>;
  heights: SharedValue<Record<string, number>>;
  progress: SharedValue<number>;
  open: boolean;
  paused: boolean;
  position: 'top' | 'bottom';
  sign: number;
  gap: number;
  width: number;
  scheme: Scheme;
  rich: boolean;
  showProgress: boolean;
  reduce: boolean;
  toastStyle?: StyleProp<ViewStyle>;
  onMeasure: (id: string, height: number) => void;
  onTouch: (touching: boolean) => void;
  onOpen: () => void;
};

function smoothstep(a: number, b: number, x: number) {
  'worklet';
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

const ToastItem = memo(function ToastItem({
  record,
  index,
  visible,
  order,
  heights,
  progress,
  open,
  paused,
  position,
  sign,
  gap,
  width,
  scheme,
  rich,
  showProgress,
  reduce,
  toastStyle,
  onMeasure,
  onTouch,
  onOpen,
}: ToastItemProps) {
  const { id, version, type, closing } = record;
  const duration = record.options.duration ?? (type === 'loading' ? Infinity : DEFAULT_DURATION);
  const colors = toastColors(type, scheme, rich);
  const surface = SURFACE[scheme];

  // Where it is: its place in the stack (springing), its offset in the open list, its heights.
  const ready = useSharedValue(0);
  const enter = useSharedValue(0);
  const exit = useSharedValue(0);
  const slot = useSharedValue(0);
  const stackOffset = useSharedValue(0);
  const closedHeight = useSharedValue(56);
  const ownHeight = useSharedValue(56);
  const [measured, setMeasured] = useState(false);

  const move = (to: number) => {
    'worklet';
    return reduce ? withTiming(to, QUICK) : withSpring(to, MOVE);
  };

  useAnimatedReaction(
    () => {
      const ids = order.value;
      const at = ids.indexOf(id);
      if (at < 0) return null;
      let offset = 0;
      for (let j = 0; j < at; j += 1) {
        const h = heights.value[ids[j]];
        if (h === undefined) return null;
        offset += h + gap;
      }
      const own = heights.value[id];
      const front = heights.value[ids[0]];
      if (own === undefined || front === undefined) return null;
      return { at, offset, own, front };
    },
    (target, before) => {
      if (target === null) return;
      if (ready.value === 0) {
        // First measured: take its place at once, invisibly, then come in.
        slot.value = target.at;
        stackOffset.value = target.offset;
        closedHeight.value = target.at === 0 ? target.own : target.front;
        ownHeight.value = target.own;
        ready.value = 1;
        enter.value = reduce ? withTiming(1, QUICK) : withSpring(1, ENTER);
        return;
      }
      if (before && before.at === target.at && before.offset === target.offset && before.own === target.own && before.front === target.front) return;
      slot.value = move(target.at);
      stackOffset.value = move(target.offset);
      closedHeight.value = move(target.at === 0 ? target.own : target.front);
      ownHeight.value = move(target.own);
    },
    [id, gap, reduce],
  );

  // Its timer: a value from 1 to 0 on the UI thread, which also draws the progress hairline.
  const life = useSharedValue(1);
  const lastVersion = useRef(version);
  const counting = measured && !closing && index >= 0 && index < visible && Number.isFinite(duration) && !paused;
  useEffect(() => {
    if (lastVersion.current !== version) {
      lastVersion.current = version;
      life.value = 1;
    }
    if (!counting) {
      cancelAnimation(life);
      return;
    }
    life.value = withTiming(0, { duration: Math.max(0, life.value * duration), easing: Easing.linear }, (finished) => {
      if (finished) scheduleOnRN(expireToast, id);
    });
    return () => cancelAnimation(life);
  }, [counting, version, duration, id, life]);

  // Announced, with a haptic by type, when it arrives or changes (a promise settling).
  useEffect(() => {
    if (!measured || closing) return;
    const words = [record.title, record.options.description].filter(Boolean).join(', ');
    if (words) {
      if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibilityWithOptions(words, { queue: !record.options.important });
      else AccessibilityInfo.announceForAccessibility(words);
    }
    if (CAN_BUZZ && record.options.haptic !== false) {
      const kind =
        type === 'success'
          ? Haptics.NotificationFeedbackType.Success
          : type === 'error'
            ? Haptics.NotificationFeedbackType.Error
            : type === 'warning'
              ? Haptics.NotificationFeedbackType.Warning
              : null;
      if (kind !== null) Haptics.notificationAsync(kind).catch(() => undefined);
    }
    // Only on arrival and on each update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measured, version]);

  // Leaving: a fade and a slight shrink, then out of the store. A swiped toast is already gone.
  const swiped = useSharedValue(0);
  useEffect(() => {
    if (!closing) return;
    cancelAnimation(life);
    if (swiped.value === 1) {
      removeToast(id);
      return;
    }
    exit.value = withTiming(1, { duration: reduce ? 150 : 200 }, (finished) => {
      if (finished) scheduleOnRN(removeToast, id);
    });
  }, [closing, id, exit, life, swiped, reduce]);

  // Swiping: towards the edge it came from, or sideways either way. Measured from where the pointer went down.
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const axis = useSharedValue(0);
  const start = useSharedValue({ x: 0, y: 0 });
  const fly = useSharedValue(0);
  const dismissBySwipe = useCallback(() => toast.dismiss(id), [id]);

  const pan = Gesture.Pan()
    .minDistance(6)
    .onBegin((event) => {
      start.value = { x: event.absoluteX, y: event.absoluteY };
      axis.value = 0;
      scheduleOnRN(onTouch, true);
    })
    .onUpdate((event) => {
      const dx = event.absoluteX - start.value.x;
      const dy = event.absoluteY - start.value.y;
      if (axis.value === 0) axis.value = Math.abs(dx) > Math.abs(dy) ? 1 : 2;
      if (axis.value === 1) dragX.value = dx;
      else dragY.value = sign * dy > 0 ? dy : dy * 0.2;
    })
    .onEnd((event) => {
      const horizontal = axis.value === 1;
      const distance = horizontal ? dragX.value : sign * dragY.value;
      const velocity = horizontal ? event.velocityX : sign * event.velocityY;
      const size = horizontal ? width : ownHeight.value;
      const away = horizontal ? Math.sign(distance || velocity) : 1;
      const far = Math.abs(distance) > size * 0.4 && (horizontal || distance > 0);
      const flung = Math.abs(velocity) > 900 && Math.sign(velocity) === (horizontal ? Math.sign(distance) : 1) && (horizontal || distance > 0);
      if (far || flung) {
        const target = horizontal ? away * (width + 40) : sign * (ownHeight.value * 2 + 80);
        const remaining = Math.abs(target - (horizontal ? dragX.value : dragY.value));
        const ms = Math.min(320, Math.max(140, (remaining / Math.max(Math.abs(velocity), 900)) * 1000));
        swiped.value = 1;
        fly.value = 1;
        const done = (finished?: boolean) => {
          'worklet';
          if (finished) scheduleOnRN(dismissBySwipe);
        };
        if (horizontal) dragX.value = withTiming(target, { duration: ms, easing: Easing.out(Easing.quad) }, done);
        else dragY.value = withTiming(target, { duration: ms, easing: Easing.out(Easing.quad) }, done);
      } else {
        dragX.value = withSpring(0, MOVE);
        dragY.value = withSpring(0, MOVE);
      }
    })
    .onFinalize(() => {
      scheduleOnRN(onTouch, false);
    });

  const place = useAnimatedStyle(() => {
    const s = Math.max(slot.value, 0);
    const k = Math.min(s, 2);
    const collapsedScale = 1 - 0.05 * k;
    const opened = progress.value;
    const closedY = -(PEEK * k + (1 - collapsedScale) * closedHeight.value);
    const openY = -stackOffset.value;
    let y = closedY + (openY - closedY) * opened;
    const coming = enter.value;
    if (!reduce) y += (1 - coming) * 24;
    const scale = (collapsedScale + (1 - collapsedScale) * opened) * (reduce ? 1 : 0.96 + 0.04 * coming) * (1 - 0.04 * exit.value);
    // Past the stack's last place it fades out; a swipe fades over the last 40% of its way.
    const beyond = 1 - Math.max(0, Math.min(1, s - (visible - 1)));
    const way = fly.value
      ? Math.abs(axis.value === 1 ? dragX.value / (width + 40) : dragY.value / (ownHeight.value * 2 + 80))
      : 0;
    const fading = 1 - smoothstep(0.6, 1, way);
    return {
      opacity: ready.value * Math.min(1, coming) * (1 - exit.value) * beyond * fading,
      transform: [{ translateX: dragX.value }, { translateY: sign * y + dragY.value }, { scale }],
    };
  });

  const boxStyle = useAnimatedStyle(() => ({
    height: closedHeight.value + (ownHeight.value - closedHeight.value) * progress.value,
  }));

  // Behind the front, the text hides until the stack opens and the toasts separate.
  const textStyle = useAnimatedStyle(() => {
    const behind = Math.max(0, Math.min(1, slot.value));
    const shown = smoothstep(0.35, 0.85, progress.value);
    return { opacity: 1 - behind * (1 - shown) };
  });

  const tint = useAnimatedStyle(
    () => ({
      backgroundColor: withTiming(colors.bg, { duration: 220 }),
      borderColor: withTiming(colors.border, { duration: 220 }),
    }),
    [colors.bg, colors.border],
  );

  const lifeStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: life.value }] }));

  const onLayout = (event: LayoutChangeEvent) => {
    const h = Math.round(event.nativeEvent.layout.height);
    if (h <= 0) return;
    onMeasure(id, h);
    if (!measured) setMeasured(true);
  };

  const label = [record.title, record.options.description].filter(Boolean).join(', ');
  const actions = [
    { name: 'dismiss', label: 'Dismiss' },
    ...(record.options.action ? [{ name: 'action', label: record.options.action.label }] : []),
    ...(record.options.cancel ? [{ name: 'cancel', label: record.options.cancel.label }] : []),
  ];
  const runAction = () => {
    record.options.action?.onPress();
    toast.dismiss(id);
  };
  const runCancel = () => {
    record.options.cancel?.onPress?.();
    toast.dismiss(id);
  };
  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    const name = event.nativeEvent.actionName;
    if (name === 'dismiss') toast.dismiss(id);
    else if (name === 'action') runAction();
    else if (name === 'cancel') runCancel();
  };

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          styles.item,
          { width, zIndex: index < 0 ? 0 : 100 - index, transformOrigin: position === 'bottom' ? 'center bottom' : 'center top' },
          position === 'bottom' ? { bottom: 0 } : { top: 0 },
          place,
        ]}>
        <Animated.View style={[styles.surface, { boxShadow: surface.shadow }, boxStyle, tint, toastStyle]}>
          <View style={styles.clip}>
            <Pressable
              role={record.options.important ? 'alert' : undefined}
              accessibilityLabel={record.render ? undefined : label}
              aria-live={record.options.important ? 'assertive' : 'polite'}
              accessibilityActions={actions}
              onAccessibilityAction={onAccessibilityAction}
              onPress={() => {
                if (!open) onOpen();
              }}
              onLayout={onLayout}
              style={[styles.measure, position === 'bottom' ? { top: 0 } : { bottom: 0 }]}>
              <Animated.View style={textStyle}>
                <ToastFace record={record} scheme={scheme} rich={rich} onAction={runAction} onCancel={runCancel} />
              </Animated.View>
            </Pressable>
            {showProgress && Number.isFinite(duration) ? (
              <Animated.View style={[styles.life, { backgroundColor: colors.icon }, lifeStyle]} />
            ) : null}
          </View>
          {scheme === 'dark' ? <View pointerEvents="none" style={[styles.highlight, { backgroundColor: surface.highlight }]} /> : null}
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  stack: { position: 'absolute' },
  item: { position: 'absolute', left: 0 },
  surface: { borderRadius: RADIUS, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth },
  clip: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: RADIUS, overflow: 'hidden' },
  measure: { position: 'absolute', left: 0, right: 0 },
  life: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 1.5, opacity: 0.6, transformOrigin: 'left' },
  highlight: { position: 'absolute', left: RADIUS, right: RADIUS, top: 0, height: 1 },
});
