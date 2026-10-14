import * as Haptics from 'expo-haptics';
import {
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import {
  I18nManager,
  Platform,
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
  cancelAnimation,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useScheme, type Scheme } from '../../lib/use-scheme';
import { AmbientGlow } from './ambient-glow';
import { mixLab, paletteLabs, type Lab } from './color';

export type AmbientItem = { key: string; colors: readonly [string, string] | readonly [string, string, string] };

export type AmbientCarouselHandle = { scrollToIndex(index: number, animated?: boolean): void };

export type AmbientCarouselProps<T extends AmbientItem> = {
  data: readonly T[];
  /** The cover's face. `focus` is 1 when it faces you, falling to 0 one place away. */
  renderCover: (info: { item: T; index: number; focus: SharedValue<number> }) => ReactNode;
  /** The title block under the covers; it slides and fades with the carousel. */
  renderMeta?: (item: T, index: number) => ReactNode;
  accessibilityLabelForItem: (item: T, index: number) => string;
  /** What the carousel holds, for screen readers: "Album". */
  accessibilityLabel?: string;
  index?: number;
  defaultIndex?: number;
  /** Once it settles on another item. */
  onChange?: (index: number) => void;
  /** A tap on the cover in front (or activating it with a screen reader). */
  onPress?: (item: T, index: number) => void;
  /** Pass one to follow the carousel as a fractional index (0 to length with `loop`). */
  progress?: SharedValue<number>;
  /** The covers' width (62% of the carousel by default). */
  itemWidth?: number;
  /** Width over height (1). */
  aspectRatio?: number;
  visibleCount?: 3 | 5 | 7;
  /** The side covers' turn, in degrees (48). */
  maxRotate?: number;
  perspective?: number;
  loop?: boolean;
  /** A faint mirror image of each cover on the floor. */
  reflection?: boolean;
  glow?: boolean | { intensity?: number; drift?: boolean };
  scheme?: Scheme;
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;
  ref?: Ref<AmbientCarouselHandle>;
};

const SNAP = { stiffness: 210, damping: 26, mass: 1 };
const TAP = { stiffness: 180, damping: 24, mass: 1 };
const REDUCED = { duration: 180 };
const DECAY_TRAVEL = 0.996 / (1 - 0.996) / 1000;
const RUBBER = 0.35;
const RADIUS = 14;
const MOUNT_ALL = 40;
const CAN_BUZZ = Platform.OS !== 'web';
const webGrab = Platform.OS === 'web' ? ({ cursor: 'grab', outlineStyle: 'none' } as unknown as ViewStyle) : null;

function wrapPlaces(x: number, n: number) {
  'worklet';
  return x - n * Math.round(x / n);
}

function wrapIndex(i: number, n: number) {
  'worklet';
  return ((i % n) + n) % n;
}

/**
 * The pointer's speed (points a second) over its last moves. Gesture Handler's own is sometimes 0 for a quick flick on
 * the web; this one is measured from the samples kept as [x, time, x, time, …].
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

/** How far across a cover `d` places from the front sits: the first neighbours tuck behind it, the rest stack. */
function slideFor(d: number, near: number, far: number) {
  'worklet';
  const a = Math.abs(d);
  const x = a < 1 ? a * near : near + (a - 1) * far;
  return Math.sign(d) * x;
}

/**
 * A cover-flow carousel with a living glow. The focused cover faces you, its neighbours fold away in depth, and the
 * stage glows in the focused item's colours, melting from one palette to the next as you swipe.
 */
export function AmbientCarousel<T extends AmbientItem>({
  data,
  renderCover,
  renderMeta,
  accessibilityLabelForItem,
  accessibilityLabel = 'Carousel',
  index: controlledIndex,
  defaultIndex = 0,
  onChange,
  onPress,
  progress,
  itemWidth: itemWidthProp,
  aspectRatio = 1,
  visibleCount = 5,
  maxRotate = 48,
  perspective = 900,
  loop: loopProp = false,
  reflection = false,
  glow = true,
  scheme: schemeProp,
  haptics = true,
  style,
  ref,
}: AmbientCarouselProps<T>) {
  const scheme = useScheme(schemeProp);
  const reduce = useReducedMotion();
  const window = useWindowDimensions();
  const [size, setSize] = useState({ width: window.width, height: 0 });
  const n = data.length;
  const loop = loopProp && n > 2;
  const rtl = I18nManager.isRTL;
  const dir = rtl ? -1 : 1;
  const coverW = itemWidthProp ?? Math.round(size.width * 0.62);
  const coverH = Math.round(coverW / aspectRatio);
  const near = coverW * 0.56;
  const far = coverW * (visibleCount === 3 ? 0.26 : visibleCount === 5 ? 0.2 : 0.14);
  const halfVisible = (visibleCount - 1) / 2;
  const rotate = reduce ? Math.min(20, maxRotate) : maxRotate;

  const reflect = reflection ? Math.round(coverH * 0.32) : 0;
  const [metaHeight, setMetaHeight] = useState(renderMeta ? 92 : 0);
  const measureMeta = useCallback((h: number) => setMetaHeight((now) => (Math.abs(now - h) > 1 ? Math.max(now === 92 ? 0 : now, h) : now)), []);
  // Room above the covers inside the stage, so the glow blooms all round them before it fades out.
  const stageTop = Math.round(Math.min(coverW, coverH) * 0.45);
  const height = stageTop + coverH + reflect + 22 + metaHeight + 8;
  const centerY = stageTop + coverH / 2;

  const clampIndex = useCallback((i: number) => Math.min(Math.max(Math.round(i), 0), Math.max(n - 1, 0)), [n]);
  const first = clampIndex(controlledIndex ?? defaultIndex);
  const position = useSharedValue(first);
  const [focused, setFocused] = useState(first);
  const settledRef = useRef(first);

  // The palette: each item's three colours in OKLab, blended at the carousel's fractional place.
  const labs = useMemo(() => data.map((item) => paletteLabs(item.colors)), [data]);
  const palette = useDerivedValue<[Lab, Lab, Lab]>(() => {
    if (labs.length === 0) return [[0.5, 0, 0], [0.5, 0, 0], [0.5, 0, 0]];
    const p = loop ? position.value : Math.min(Math.max(position.value, 0), labs.length - 1);
    const base = Math.floor(p);
    const t = p - base;
    const a = labs[loop ? wrapIndex(base, labs.length) : base];
    const b = labs[loop ? wrapIndex(base + 1, labs.length) : Math.min(base + 1, labs.length - 1)];
    return [mixLab(a[0], b[0], t), mixLab(a[1], b[1], t), mixLab(a[2], b[2], t)];
  });

  useAnimatedReaction(
    () => position.value,
    (value) => {
      if (progress) progress.value = loop ? wrapIndex(value, n) : value;
    },
    [progress, loop, n],
  );

  // A tick as each new cover comes to the front.
  const tick = useCallback(() => {
    if (haptics && CAN_BUZZ) Haptics.selectionAsync().catch(() => undefined);
  }, [haptics]);
  useAnimatedReaction(
    () => Math.round(position.value),
    (now, before) => {
      if (before !== null && now !== before) scheduleOnRN(tick);
    },
    [tick],
  );

  const settle = useCallback(
    (slot: number) => {
      const index = loop ? wrapIndex(slot, n) : clampIndex(slot);
      if (index === settledRef.current) return;
      settledRef.current = index;
      setFocused(index);
      onChange?.(index);
    },
    [loop, n, clampIndex, onChange],
  );

  const springTo = useCallback(
    (slot: number, config: typeof SNAP, velocity = 0) => {
      'worklet';
      const done = (finished?: boolean) => {
        'worklet';
        if (finished) scheduleOnRN(settle, slot);
      };
      position.value = reduce ? withTiming(slot, REDUCED, done) : withSpring(slot, { ...config, velocity }, done);
    },
    [position, reduce, settle],
  );

  const slotFor = useCallback(
    (index: number) => {
      const target = clampIndex(index);
      return loop ? target + n * Math.round((position.value - target) / n) : target;
    },
    [clampIndex, loop, n, position],
  );

  const scrollToIndex = useCallback(
    (index: number, animated = true) => {
      if (n === 0) return;
      const slot = slotFor(index);
      cancelAnimation(position);
      if (animated) springTo(slot, TAP);
      else {
        position.value = slot;
        settle(slot);
      }
    },
    [n, slotFor, position, springTo, settle],
  );
  useImperativeHandle(ref, () => ({ scrollToIndex }), [scrollToIndex]);

  useEffect(() => {
    if (controlledIndex !== undefined && clampIndex(controlledIndex) !== settledRef.current) scrollToIndex(controlledIndex);
  }, [controlledIndex, clampIndex, scrollToIndex]);

  // New data: keep the focused item (by its key) in front.
  const lastKey = useRef(data[first]?.key);
  useEffect(() => {
    const key = lastKey.current;
    const at = data.findIndex((item) => item.key === key);
    if (at >= 0 && at !== settledRef.current) {
      cancelAnimation(position);
      position.value = at;
      settledRef.current = at;
      setFocused(at);
    } else if (at < 0 && settledRef.current > n - 1) {
      position.value = Math.max(0, n - 1);
      settle(Math.max(0, n - 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);
  useEffect(() => {
    lastKey.current = data[focused]?.key;
  }, [data, focused]);

  // The front cover dips when pressed.
  const pressed = useSharedValue(0);
  const callPress = useCallback(
    (slot: number) => {
      const index = loop ? wrapIndex(slot, n) : clampIndex(slot);
      const item = data[index];
      if (item && onPress) onPress(item, index);
    },
    [loop, n, clampIndex, data, onPress],
  );

  const cx = size.width / 2;
  const tapAt = (x: number) => {
    'worklet';
    const nearSlot = Math.round(position.value);
    let best = Number.NaN;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let k = nearSlot - 3; k <= nearSlot + 3; k += 1) {
      if (!loop && (k < 0 || k > n - 1)) continue;
      const d = k - position.value;
      if (Math.abs(d) > halfVisible + 0.5) continue;
      const left = cx + dir * slideFor(d, near, far);
      const half = (coverW / 2) * (1 - 0.12 * Math.min(Math.abs(d), 1));
      if (Math.abs(x - left) > half) continue;
      // The front-most cover under the finger wins.
      const score = Math.abs(d);
      if (score < bestScore) {
        bestScore = score;
        best = k;
      }
    }
    if (Number.isNaN(best)) {
      springTo(Math.round(position.value), SNAP);
      return;
    }
    if (best === nearSlot && Math.abs(position.value - nearSlot) < 0.08) {
      position.value = nearSlot;
      scheduleOnRN(callPress, nearSlot);
      return;
    }
    springTo(best, TAP);
  };

  const startX = useSharedValue(0);
  const startP = useSharedValue(0);
  const startTime = useSharedValue(0);
  const lastMove = useSharedValue({ x: 0, t: 0 });
  const samples = useSharedValue<number[]>([]);
  const pan = Gesture.Pan()
    .enabled(n > 0)
    .activeOffsetX([-6, 6])
    .failOffsetY([-14, 14])
    .onBegin((event) => {
      cancelAnimation(position);
      startX.value = event.absoluteX;
      startP.value = position.value;
      startTime.value = Date.now();
      lastMove.value = { x: event.absoluteX, t: Date.now() };
      samples.value = [event.absoluteX, Date.now()];
      if (Math.abs(event.x - cx) < coverW / 2 && Math.abs(position.value - Math.round(position.value)) < 0.08) {
        pressed.value = withTiming(1, { duration: 90 });
      }
    })
    .onStart(() => {
      pressed.value = withTiming(0, { duration: 120 });
    })
    .onUpdate((event) => {
      if (n < 2) return;
      if (event.absoluteX !== lastMove.value.x) {
        lastMove.value = { x: event.absoluteX, t: Date.now() };
        samples.value = [...samples.value.slice(-10), event.absoluteX, Date.now()];
      }
      const raw = startP.value - ((event.absoluteX - startX.value) * dir) / near;
      if (loop) position.value = raw;
      else position.value = raw < 0 ? raw * RUBBER : raw > n - 1 ? n - 1 + (raw - (n - 1)) * RUBBER : raw;
    })
    .onEnd((event) => {
      if (n < 2) return;
      const resting = Date.now() - lastMove.value.t > 80;
      const speed = Math.abs(event.velocityX) > 1 ? event.velocityX : trackedSpeed(samples.value);
      const velocity = resting ? 0 : (-speed * dir) / near;
      const from = Math.round(startP.value);
      let target = Math.round(position.value + velocity * DECAY_TRAVEL);
      if (target === from && Math.abs(velocity) > 1.2) target = from + Math.sign(velocity);
      if (!loop) target = Math.min(Math.max(target, 0), n - 1);
      springTo(target, SNAP, velocity);
    })
    .onFinalize((event, success) => {
      pressed.value = withTiming(0, { duration: 160 });
      if (success) return;
      const still = Math.abs(event.absoluteX - startX.value) < 10 && Date.now() - startTime.value < 400;
      if (still) tapAt(event.x);
      else springTo(Math.round(position.value), SNAP);
    });

  // Keys and the mouse wheel on the web; increment, decrement and activate for screen readers.
  const target = useRef<number | null>(null);
  const stepBy = useCallback(
    (by: number) => {
      if (n < 2) return;
      let next = (target.current ?? Math.round(position.value)) + by;
      if (!loop) next = Math.min(Math.max(next, 0), n - 1);
      target.current = next;
      cancelAnimation(position);
      springTo(next, TAP);
      setTimeout(() => {
        if (target.current === next) target.current = null;
      }, 450);
    },
    [n, loop, position, springTo],
  );
  const wheelTotal = useRef(0);
  const onWheel = (event: { nativeEvent: { deltaX: number; deltaY: number } }) => {
    const { deltaX, deltaY } = event.nativeEvent;
    const delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
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
    const key = event.nativeEvent.key;
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const back = rtl ? 'ArrowRight' : 'ArrowLeft';
    if (key === forward) stepBy(1);
    else if (key === back) stepBy(-1);
    else if (key === 'Enter' || key === ' ') callPress(Math.round(position.value));
    else return;
    event.preventDefault?.();
  };
  const webProps = Platform.OS === 'web' ? ({ onWheel, onKeyDown, focusable: true } as Record<string, unknown>) : {};
  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    const name = event.nativeEvent.actionName;
    if (name === 'increment') stepBy(1);
    else if (name === 'decrement') stepBy(-1);
    else if (name === 'activate') callPress(Math.round(position.value));
  };

  const onLayout = (event: LayoutChangeEvent) => {
    const w = Math.round(event.nativeEvent.layout.width);
    if (w > 0 && w !== size.width) setSize((s) => ({ ...s, width: w }));
  };

  // Mounted covers: all of them for a short list (nothing re-renders as it moves), else a window round the focus.
  const [center, setCenter] = useState(first);
  const reach = Math.ceil(halfVisible) + 2;
  const mountAll = n <= MOUNT_ALL && (!loop || n >= reach * 2 + 1);
  useAnimatedReaction(
    () => Math.round(position.value),
    (now) => {
      if (!mountAll && Math.abs(now - center) >= 1) scheduleOnRN(setCenter, now);
    },
    [mountAll, center],
  );
  const slots = useMemo(() => {
    const out: { slot: number; index: number; key: string }[] = [];
    if (n === 0) return out;
    if (mountAll) {
      for (let i = 0; i < n; i += 1) out.push({ slot: i, index: i, key: data[i].key });
      return out;
    }
    for (let k = center - reach; k <= center + reach; k += 1) {
      if (!loop && (k < 0 || k > n - 1)) continue;
      const i = loop ? wrapIndex(k, n) : k;
      out.push({ slot: k, index: i, key: `${data[i].key}@${k}` });
    }
    return out;
  }, [n, mountAll, center, reach, loop, data]);
  const wrap = mountAll && loop;

  const glowConfig = typeof glow === 'object' ? glow : {};
  const item = data[focused];

  return (
    <View onLayout={onLayout} style={[{ height }, styles.root, style]}>
      {glow ? (
        <AmbientGlow
          palette={palette}
          width={size.width}
          height={height}
          focusX={cx}
          focusY={centerY}
          coverSize={coverW * 1.4}
          intensity={glowConfig.intensity ?? 1}
          drift={glowConfig.drift ?? true}
          scheme={scheme}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <GestureDetector gesture={pan}>
        <Animated.View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={accessibilityLabel}
          aria-valuetext={item ? `${accessibilityLabelForItem(item, focused)}, ${focused + 1} of ${n}` : ''}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }, ...(onPress ? [{ name: 'activate' }] : [])]}
          onAccessibilityAction={onAccessibilityAction}
          style={[StyleSheet.absoluteFill, webGrab]}
          {...webProps}>
          {slots.map(({ slot, index, key }) => (
            <Cover
              key={key}
              item={data[index]}
              index={index}
              slot={slot}
              n={n}
              wrap={wrap}
              position={position}
              pressed={pressed}
              x={cx}
              top={stageTop}
              width={coverW}
              height={coverH}
              near={near}
              far={far}
              dir={dir}
              rotate={rotate}
              perspective={perspective}
              halfVisible={halfVisible}
              reflect={reflect}
              scheme={scheme}
              renderCover={renderCover}
            />
          ))}
        </Animated.View>
      </GestureDetector>
      {/* Outside the swipe area, so the meta's own buttons take their taps. */}
          {renderMeta
            ? slots.map(({ slot, index, key }) => (
                <Meta
                  key={`meta:${key}`}
                  slot={slot}
                  n={n}
                  wrap={wrap}
                  position={position}
                  top={stageTop + coverH + reflect + 22}
                  dir={dir}
                  onMeasure={measureMeta}>
                  {renderMeta(data[index], index)}
                </Meta>
              ))
            : null}
    </View>
  );
}

type CoverProps<T extends AmbientItem> = {
  item: T;
  index: number;
  slot: number;
  n: number;
  wrap: boolean;
  position: SharedValue<number>;
  pressed: SharedValue<number>;
  x: number;
  top: number;
  width: number;
  height: number;
  near: number;
  far: number;
  dir: number;
  rotate: number;
  perspective: number;
  halfVisible: number;
  reflect: number;
  scheme: Scheme;
  renderCover: AmbientCarouselProps<T>['renderCover'];
};

function CoverInner<T extends AmbientItem>({
  item,
  index,
  slot,
  n,
  wrap,
  position,
  pressed,
  x,
  top,
  width,
  height,
  near,
  far,
  dir,
  rotate,
  perspective,
  halfVisible,
  reflect,
  scheme,
  renderCover,
}: CoverProps<T>) {
  const focus = useDerivedValue(() => {
    const d = wrap ? wrapPlaces(slot - position.value, n) : slot - position.value;
    return smooth(1 - Math.abs(d));
  });
  const place = useAnimatedStyle(() => {
    const d = wrap ? wrapPlaces(slot - position.value, n) : slot - position.value;
    const a = Math.abs(d);
    const turn = smooth(Math.min(a, 1)) * rotate * Math.sign(d) * -dir;
    const scale = (1 - 0.12 * Math.min(a, 1) - 0.05 * Math.max(0, a - 1)) * (1 - 0.03 * pressed.value * smooth(1 - a));
    const shown = 1 - smooth(a - halfVisible - 0.15);
    return {
      opacity: a > halfVisible + 1.2 ? 0 : shown,
      zIndex: Math.round(1000 - a * 100),
      transform: [
        { perspective },
        { translateX: x - width / 2 + dir * slideFor(d, near, far) },
        { rotateY: `${turn}deg` },
        { scale },
      ],
    };
  });
  // Turned-away covers darken (an overlay of black, never transparency).
  const shade = useAnimatedStyle(() => {
    const d = wrap ? wrapPlaces(slot - position.value, n) : slot - position.value;
    const a = Math.abs(d);
    return { opacity: Math.min(0.62, 0.34 * Math.min(a, 1) + 0.12 * Math.max(0, a - 1)) };
  });

  const face = useMemo(() => renderCover({ item, index, focus }), [renderCover, item, index, focus]);
  const shadow = scheme === 'dark' ? '0px 18px 40px rgba(0, 0, 0, 0.35)' : `0px 18px 40px ${withAlpha(item.colors[0], 0.25)}`;

  return (
    <Animated.View pointerEvents="none" style={[styles.cover, { top, width, height: height + reflect }, place]}>
      <View style={[styles.frame, { width, height, boxShadow: shadow }]}>
        <View style={[StyleSheet.absoluteFill, styles.clip]}>{face}</View>
        <View style={styles.highlight} />
        <Animated.View style={[StyleSheet.absoluteFill, styles.clip, styles.shade, shade]} />
      </View>
      {reflect > 0 ? <Reflection width={width} height={height} depth={reflect} shade={shade} face={face} /> : null}
    </Animated.View>
  );
}
const Cover = memo(CoverInner) as typeof CoverInner;

/**
 * The cover mirrored on the floor, fading out through an opacity mask: a CSS mask on the web, and on phones a stack
 * of thin bands of the mirror image, each a little fainter (the same mask, in eight steps).
 */
function Reflection({
  width,
  height,
  depth,
  shade,
  face,
}: {
  width: number;
  height: number;
  depth: number;
  shade: ReturnType<typeof useAnimatedStyle>;
  face: ReactNode;
}) {
  const mirror = (
    <View style={{ width, height, transform: [{ scaleY: -1 }] }}>
      <View style={[StyleSheet.absoluteFill, styles.clip]}>{face}</View>
      <Animated.View style={[StyleSheet.absoluteFill, styles.clip, styles.shade, shade]} />
    </View>
  );
  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          styles.reflection,
          { top: height + 2, width, height: depth },
          { maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.26), rgba(0,0,0,0.1) 45%, rgba(0,0,0,0))' } as unknown as ViewStyle,
        ]}>
        {mirror}
      </View>
    );
  }
  const bands = 8;
  const band = depth / bands;
  return (
    <View style={[styles.reflection, { top: height + 2, width, height: depth }]}>
      {Array.from({ length: bands }, (_, i) => {
        const t = (i + 0.5) / bands;
        const alpha = 0.26 * Math.pow(1 - t, 1.6);
        return (
          <View key={i} style={{ position: 'absolute', top: i * band, height: band + 0.5, width, overflow: 'hidden', opacity: alpha }}>
            <View style={{ position: 'absolute', top: -i * band }}>{mirror}</View>
          </View>
        );
      })}
    </View>
  );
}

/** A title block that drifts with the finger: the outgoing one leaves to the left as the incoming one arrives. */
const Meta = memo(function Meta({
  slot,
  n,
  wrap,
  position,
  top,
  dir,
  onMeasure,
  children,
}: {
  slot: number;
  n: number;
  wrap: boolean;
  position: SharedValue<number>;
  top: number;
  dir: number;
  onMeasure: (height: number) => void;
  children: ReactNode;
}) {
  const style = useAnimatedStyle(() => {
    const d = wrap ? wrapPlaces(slot - position.value, n) : slot - position.value;
    const a = Math.abs(d);
    return {
      opacity: a >= 1 ? 0 : 1 - smooth(a * 1.6),
      transform: [{ translateX: dir * d * 70 }],
    };
  });
  return (
    <Animated.View
      pointerEvents="box-none"
      onLayout={(event) => onMeasure(Math.round(event.nativeEvent.layout.height))}
      style={[styles.meta, { top }, style]}>
      {children}
    </Animated.View>
  );
});

function withAlpha(hex: string, alpha: number) {
  const v = parseInt(hex.replace('#', '').slice(0, 6), 16);
  return `rgba(${(v >> 16) & 255}, ${(v >> 8) & 255}, ${v & 255}, ${alpha})`;
}

const styles = StyleSheet.create({
  root: { width: '100%' },
  cover: { position: 'absolute', left: 0 },
  frame: { borderRadius: RADIUS, borderCurve: 'continuous' },
  clip: { borderRadius: RADIUS, overflow: 'hidden' },
  highlight: {
    position: 'absolute',
    left: RADIUS,
    right: RADIUS,
    top: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  shade: { backgroundColor: '#000000' },
  reflection: { position: 'absolute', left: 0, overflow: 'hidden' },
  meta: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: 24 },
});
