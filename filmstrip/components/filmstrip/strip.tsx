import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  I18nManager,
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
import { centerOf, clamp, decayTravel, openWidth, openness, shownWidth, trackedSpeed } from './layout';
import type { FilmItem, RenderImage } from './types';

export type FilmstripStripProps<T extends FilmItem> = {
  data: readonly T[];
  /** The float index the strip shows and sets. Share it with a FilmstripViewer to keep them together. */
  position: SharedValue<number>;
  renderImage: RenderImage<T>;
  thumbHeight?: number;
  sliverWidth?: number;
  gap?: number;
  /** Called when a scrub or a tap settles on an item. */
  onIndexChange?: (index: number) => void;
  /** What a screen reader hears for an item: defaults to "<label>, <n> of <total>". */
  describe?: (item: T, index: number) => string;
  scheme?: Scheme;
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;
};

const PAD = 10;
const SNAP = { stiffness: 260, damping: 30, mass: 1 };
const RUBBER = 0.35;
const CAN_BUZZ = Platform.OS !== 'web';

export const STRIP_THEMES = {
  dark: { band: 'rgba(255, 255, 255, 0.04)', hairline: 'rgba(255, 255, 255, 0.06)', ring: 'rgba(255, 255, 255, 0.9)', badge: 'rgba(0, 0, 0, 0.62)', badgeText: '#FFFFFF', empty: 'rgba(255, 255, 255, 0.08)' },
  light: { band: 'rgba(0, 0, 0, 0.03)', hairline: 'rgba(0, 0, 0, 0.06)', ring: '#111111', badge: 'rgba(0, 0, 0, 0.6)', badgeText: '#FFFFFF', empty: 'rgba(0, 0, 0, 0.06)' },
} as const;

const webGrab = Platform.OS === 'web' ? ({ cursor: 'grab', outlineStyle: 'none', touchAction: 'pan-y' } as unknown as ViewStyle) : null;

export function formatDuration(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
}

function buzz(enabled: boolean, call: () => Promise<void>) {
  if (!enabled || !CAN_BUZZ) return;
  call().catch(() => undefined);
}

/**
 * The strip alone: the current item open to its true shape, every other one squeezed into a sliver.
 * Drag to scrub (1 item per sliver of drag, decay, then a snap), tap a sliver to jump to it.
 */
export function FilmstripStrip<T extends FilmItem>({
  data,
  position,
  renderImage,
  thumbHeight = 52,
  sliverWidth = 14,
  gap = 3,
  onIndexChange,
  describe,
  scheme: schemeProp,
  haptics = true,
  style,
}: FilmstripStripProps<T>) {
  const scheme = useScheme(schemeProp);
  const theme = STRIP_THEMES[scheme];
  const reduceMotion = useReducedMotion();
  const n = data.length;
  const last = Math.max(0, n - 1);
  const dir = I18nManager.isRTL ? -1 : 1;
  const unit = sliverWidth + gap;

  const opensList = useMemo(() => data.map((d) => openWidth(d.width, d.height, thumbHeight)), [data, thumbHeight]);
  const opens = useSharedValue(opensList);
  useEffect(() => {
    opens.value = opensList;
  }, [opens, opensList]);
  const stripWidth = useSharedValue(0);
  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => {
    const w = Math.round(event.nativeEvent.layout.width);
    stripWidth.value = w;
    if (w !== width) setWidth(w);
  };

  // Which items are mounted: those the strip can show, and a few beyond.
  const [center, setCenter] = useState(() => Math.round(clamp(position.value, 0, last)));
  const reach = Math.ceil(width / 2 / unit) + 4;
  useAnimatedReaction(
    () => Math.round(position.value),
    (now, before) => {
      if (now !== before) scheduleOnRN(setCenter, Math.min(Math.max(now, 0), last));
    },
    [last],
  );

  const dragging = useSharedValue(false);
  const startPos = useSharedValue(0);
  const startX = useSharedValue(0);
  const startT = useSharedValue(0);
  const samples = useSharedValue<number[]>([]);
  const lastMove = useSharedValue(0);
  const lastBuzz = useSharedValue(0);

  const settled = useCallback(
    (index: number) => {
      buzz(haptics, () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
      onIndexChange?.(index);
    },
    [haptics, onIndexChange],
  );
  const tick = useCallback(() => buzz(haptics, () => Haptics.selectionAsync()), [haptics]);

  // A detent each time a new item crosses the centre while scrubbing (at most every 45 ms).
  useAnimatedReaction(
    () => Math.round(position.value),
    (now, before) => {
      if (before === null || now === before || !dragging.value) return;
      const t = Date.now();
      if (t - lastBuzz.value < 45) return;
      lastBuzz.value = t;
      scheduleOnRN(tick);
    },
  );

  const springTo = (target: number, velocity = 0) => {
    'worklet';
    const done = (finished?: boolean) => {
      'worklet';
      if (finished) scheduleOnRN(settled, target);
    };
    position.value = reduceMotion
      ? withTiming(target, { duration: 160 }, done)
      : withSpring(target, { ...SNAP, velocity }, done);
  };

  /** The item under x (points from the strip's left), or -1. Slivers take the strip's whole height. */
  const hitTest = (x: number) => {
    'worklet';
    const w = stripWidth.value;
    const pos = position.value;
    const from = Math.max(0, Math.floor(pos) - 40);
    const to = Math.min(last, Math.ceil(pos) + 40);
    for (let i = from; i <= to; i++) {
      const c = w / 2 + dir * centerOf(i, pos, opens.value, sliverWidth, gap, n);
      const half = shownWidth(i, pos, opens.value, sliverWidth) / 2 + gap / 2;
      if (x >= c - half && x <= c + half) return i;
    }
    return -1;
  };

  const pan = Gesture.Pan()
    .enabled(n > 1)
    .minDistance(4)
    .onBegin((event) => {
      cancelAnimation(position);
      startPos.value = position.value;
      startX.value = event.absoluteX;
      startT.value = Date.now();
      samples.value = [event.absoluteX, Date.now()];
      lastMove.value = Date.now();
    })
    .onStart(() => {
      dragging.value = true;
    })
    .onUpdate((event) => {
      // From pointer-down (absoluteX at onBegin), so nothing of a quick mouse move is lost.
      const raw = startPos.value - (dir * (event.absoluteX - startX.value)) / unit;
      position.value = raw < 0 ? raw * RUBBER : raw > last ? last + (raw - last) * RUBBER : raw;
      lastMove.value = Date.now();
      samples.value = [...samples.value.slice(-10), event.absoluteX, Date.now()];
    })
    .onEnd((event) => {
      dragging.value = false;
      // On the web the last speed lingers after the pointer rests: a release after a pause has none.
      const resting = Date.now() - lastMove.value > 80;
      const speed = Math.abs(event.velocityX) > 1 ? event.velocityX : trackedSpeed(samples.value);
      const velocity = resting ? 0 : (-dir * speed) / unit;
      const target = clamp(Math.round(position.value + decayTravel(velocity)), 0, last);
      springTo(target, velocity);
    })
    .onFinalize((event, success) => {
      dragging.value = false;
      if (success) return;
      // Not a drag: a tap. Jump to the item under it.
      const still = Math.abs(event.absoluteX - startX.value) < 8 && Date.now() - startT.value < 450;
      const hit = still ? hitTest(event.x) : -1;
      springTo(hit >= 0 ? hit : clamp(Math.round(position.value), 0, last));
    });

  const stepBy = (by: number) => {
    if (n < 2) return;
    const target = clamp(Math.round(position.value) + by, 0, last);
    cancelAnimation(position);
    springTo(target);
  };
  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'increment') stepBy(1);
    else if (event.nativeEvent.actionName === 'decrement') stepBy(-1);
  };
  const onKeyDown = (event: { nativeEvent: { key: string }; preventDefault?: () => void }) => {
    const forward = dir > 0 ? 'ArrowRight' : 'ArrowLeft';
    const back = dir > 0 ? 'ArrowLeft' : 'ArrowRight';
    const key = event.nativeEvent.key;
    if (key === forward) stepBy(1);
    else if (key === back) stepBy(-1);
    else if (key === 'Home') stepBy(-n);
    else if (key === 'End') stepBy(n);
    else return;
    event.preventDefault?.();
  };
  const wheelTotal = useRef(0);
  const onWheel = (event: { nativeEvent: { deltaX: number; deltaY: number } }) => {
    const { deltaX, deltaY } = event.nativeEvent;
    wheelTotal.current += Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
    if (Math.abs(wheelTotal.current) >= 40) {
      stepBy(Math.sign(wheelTotal.current));
      wheelTotal.current = 0;
    }
  };
  const webProps = Platform.OS === 'web' ? ({ onKeyDown, onWheel, focusable: true } as Record<string, unknown>) : {};

  const from = Math.max(0, center - reach);
  const to = Math.min(last, center + reach);
  const items: number[] = [];
  if (width > 0) for (let i = from; i <= to; i++) items.push(i);

  const current = data[center];
  const description = current ? (describe ? describe(current, center) : `${current.accessibilityLabel}, ${center + 1} of ${n}`) : '';

  return (
    <GestureDetector gesture={pan}>
      <View
        onLayout={onLayout}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Filmstrip"
        accessibilityValue={{ text: description }}
        aria-valuetext={description}
        aria-valuenow={center + 1}
        aria-valuemin={1}
        aria-valuemax={n}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={onAccessibilityAction}
        style={[styles.band, { height: thumbHeight + PAD * 2, backgroundColor: theme.band, borderTopColor: theme.hairline }, webGrab, style]}
        {...webProps}
      >
        {items.map((i) => (
          <Thumb
            key={data[i].key}
            item={data[i]}
            index={i}
            open={opensList[i]}
            count={n}
            thumb={thumbHeight}
            sliver={sliverWidth}
            gap={gap}
            dir={dir}
            position={position}
            opens={opens}
            stripWidth={stripWidth}
            ring={Math.abs(i - center) <= 1}
            theme={theme}
            renderImage={renderImage}
          />
        ))}
      </View>
    </GestureDetector>
  );
}

type ThumbProps<T extends FilmItem> = {
  item: T;
  index: number;
  open: number;
  count: number;
  thumb: number;
  sliver: number;
  gap: number;
  dir: number;
  position: SharedValue<number>;
  opens: SharedValue<number[]>;
  stripWidth: SharedValue<number>;
  ring: boolean;
  theme: (typeof STRIP_THEMES)[Scheme];
  renderImage: RenderImage<T>;
};

/**
 * One thumbnail. It never changes its width: two clipping boxes slide over each other (one holds the
 * left edge, the other the right edge), and the picture inside slides back, so what shows is the
 * picture's centre at any width, with round corners at both edges and no stretching.
 */
function Thumb<T extends FilmItem>({
  item,
  index,
  open,
  count,
  thumb,
  sliver,
  gap,
  dir,
  position,
  opens,
  stripWidth,
  ring,
  theme,
  renderImage,
}: ThumbProps<T>) {
  const geometry = () => {
    'worklet';
    const pos = position.value;
    const w = shownWidth(index, pos, opens.value, sliver);
    const cx = stripWidth.value / 2 + dir * centerOf(index, pos, opens.value, sliver, gap, count);
    return { w, cx, o: openness(index, pos) };
  };
  const right = useAnimatedStyle(() => {
    const { w, cx, o } = geometry();
    return {
      borderRadius: 3 + 3 * o,
      transform: [{ translateX: cx + w / 2 - open }, { translateY: -2 * o }],
    };
  });
  const left = useAnimatedStyle(() => {
    const { w, o } = geometry();
    return { borderRadius: 3 + 3 * o, transform: [{ translateX: open - w }] };
  });
  const picture = useAnimatedStyle(() => {
    const { w } = geometry();
    return { transform: [{ translateX: (w - open) / 2 }] };
  });
  const badge = useAnimatedStyle(() => ({ opacity: clamp((openness(index, position.value) - 0.6) / 0.3, 0, 1) }));
  const ringStyle = useAnimatedStyle(() => {
    const { cx, o } = geometry();
    const d = Math.abs(index - position.value);
    return {
      opacity: clamp(1 - d / 0.08, 0, 1),
      transform: [{ translateX: cx - open / 2 }, { translateY: -2 * o }],
    };
  });

  return (
    <>
      <Animated.View pointerEvents="none" style={[styles.clip, { width: open, height: thumb, top: PAD }, right]}>
        {/* The fill sits on the left-edge box: only the part both boxes share ever shows. */}
        <Animated.View style={[styles.clip, { width: open, height: thumb, backgroundColor: theme.empty }, left]}>
          <Animated.View style={[styles.clip, { width: open, height: thumb }, picture]}>
            {renderImage({ item, index, variant: 'thumb' })}
          </Animated.View>
        </Animated.View>
        {item.type === 'video' && item.duration !== undefined ? (
          <Animated.View style={[styles.badge, { backgroundColor: theme.badge }, badge]}>
            <Text style={[styles.badgeText, { color: theme.badgeText }]}>{formatDuration(item.duration)}</Text>
          </Animated.View>
        ) : null}
      </Animated.View>
      {ring ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.ring, { width: open + 3, height: thumb + 3, top: PAD - 1.5, marginLeft: -1.5, borderColor: theme.ring }, ringStyle]}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  band: { width: '100%', borderTopWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  clip: { position: 'absolute', left: 0, top: 0, overflow: 'hidden' },
  badge: { position: 'absolute', right: 4, bottom: 4, height: 16, borderRadius: 8, paddingHorizontal: 5, justifyContent: 'center' },
  badgeText: { fontSize: 10, fontWeight: '700', fontVariant: ['tabular-nums'] },
  ring: { position: 'absolute', left: 0, borderWidth: 1.5, borderRadius: 7.5 },
});
