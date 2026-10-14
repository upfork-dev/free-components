import * as Haptics from 'expo-haptics';
import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type ReactNode, type Ref } from 'react';
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
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import { useScheme, type Scheme } from '../../lib/use-scheme';

export type SwipeDirection = 'left' | 'right' | 'up';

export type SwipeStamp = {
  /** A word or two, shown on the card as it's dragged that way: "Like", "Nope", "Save". */
  label: string;
  color: string;
};

export type SwipeDeckHandle = {
  /** Sends the top card off that way, as if it had been swiped: for buttons under the deck. */
  swipe: (direction: SwipeDirection) => void;
  /** Brings the last card back, from the side it left by. */
  undo: () => void;
};

export type SwipeDeckProps<T> = {
  data: readonly T[];
  keyExtractor: (item: T, index: number) => string;
  /** Draws a card. It fills the card, whose corners are rounded and clipped. */
  renderCard: (item: T, index: number) => ReactNode;
  /** Called as a card is swiped away (by a gesture, a button, or a screen reader's action). */
  onSwipe?: (item: T, direction: SwipeDirection, index: number) => void;
  /** Called as a card comes back, with the way it had gone. */
  onUndo?: (item: T, direction: SwipeDirection, index: number) => void;
  /** Called once the last card has gone. */
  onEnd?: () => void;
  /** Shown when every card is gone. */
  renderEmpty?: () => ReactNode;
  /** The ways a card may go. Defaults to left and right. */
  directions?: readonly SwipeDirection[];
  /** What each way says on the card while it's dragged that way. */
  stamps?: Partial<Record<SwipeDirection, SwipeStamp>>;
  /** How many cards show in the stack, the top one included. */
  stackSize?: number;
  /** Where to start: the index of the first card on top. */
  initialIndex?: number;
  ref?: Ref<SwipeDeckHandle>;
  scheme?: Scheme;
  style?: StyleProp<ViewStyle>;
};

const RADIUS = 28;
/** How far a card must be dragged to go, as a share of the deck's width (sideways) or height (up). */
const SIDE = 0.3;
const UP = 0.2;
const FLING = 850;
const STEP_SCALE = 0.055;
const STEP_Y = 14;
const BACK = { damping: 18, stiffness: 220, mass: 0.8 };
const RAISE = { damping: 20, stiffness: 240, mass: 0.8 };

const THEMES = {
  light: { card: '#FFFFFF', line: 'rgba(12, 13, 16, 0.06)', shadow: 0.14, ink: '#0C0D10' },
  dark: { card: '#17181C', line: 'rgba(255, 255, 255, 0.07)', shadow: 0.55, ink: '#F2F3F5' },
} as const;

const webGrab = Platform.OS === 'web' ? ({ cursor: 'grab' } as unknown as ViewStyle) : null;

/**
 * A stack of cards to swipe through: right to keep, left to pass, up for something special. The card under the top
 * one rises as you drag; buttons can swipe for you, and the last card can come back.
 */
export function SwipeDeck<T>({
  data,
  keyExtractor,
  renderCard,
  onSwipe,
  onUndo,
  onEnd,
  renderEmpty,
  directions = ['left', 'right'],
  stamps,
  stackSize = 3,
  initialIndex = 0,
  ref,
  scheme: schemeProp,
  style,
}: SwipeDeckProps<T>) {
  const theme = THEMES[useScheme(schemeProp)];
  const reduceMotion = useReducedMotion();

  const [index, setIndex] = useState(initialIndex);
  const [size, setSize] = useState({ width: 0, height: 0 });
  // Which way each gone card left, so it can come back the same way.
  const gone = useRef<SwipeDirection[]>([]);
  const [entering, setEntering] = useState<{ key: string; from: SwipeDirection } | null>(null);
  const busy = useRef(false);
  const top = useRef<{ fling: (direction: SwipeDirection) => void } | null>(null);

  const width = useSharedValue(0);
  const height = useSharedValue(0);
  /** How far the top card is on its way out, 0 to 1: the cards under it rise by as much. */
  const drag = useSharedValue(0);

  // A card that has gone: the stack moves up one with the drag already at 1, so nothing jumps.
  useLayoutEffect(() => {
    drag.value = 0;
  }, [index, drag]);

  function onLayout(event: LayoutChangeEvent) {
    const { width: w, height: h } = event.nativeEvent.layout;
    setSize({ width: w, height: h });
    width.value = w;
    height.value = h;
  }

  function left(direction: SwipeDirection, at: number) {
    gone.current.push(direction);
    Haptics.impactAsync(direction === 'up' ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium).catch(
      () => undefined,
    );
    onSwipe?.(data[at], direction, at);
  }

  function advance(at: number) {
    busy.current = false;
    setEntering(null);
    setIndex(at + 1);
    if (at + 1 >= data.length) onEnd?.();
  }

  useImperativeHandle(
    ref,
    () => ({
      swipe(direction) {
        if (busy.current || index >= data.length || !directions.includes(direction)) return;
        top.current?.fling(direction);
      },
      undo() {
        const from = gone.current.pop();
        if (!from || index === 0 || busy.current) return;
        const at = index - 1;
        setEntering({ key: keyExtractor(data[at], at), from });
        setIndex(at);
        Haptics.selectionAsync().catch(() => undefined);
        onUndo?.(data[at], from, at);
      },
    }),
    [index, data, directions, keyExtractor, onUndo],
  );

  const visible = data.slice(index, index + stackSize);

  return (
    <View style={[styles.deck, style]} onLayout={onLayout}>
      {index >= data.length && renderEmpty ? <View style={StyleSheet.absoluteFill}>{renderEmpty()}</View> : null}
      {size.width > 0
        ? visible
            .map((item, i) => {
              const at = index + i;
              const key = keyExtractor(item, at);
              return (
                <Card
                  key={key}
                  position={i}
                  top={i === 0}
                  enterFrom={entering?.key === key ? entering.from : null}
                  size={size}
                  width={width}
                  height={height}
                  drag={drag}
                  directions={directions}
                  stamps={stamps}
                  theme={theme}
                  reduceMotion={reduceMotion}
                  register={(handle) => {
                    if (i === 0) top.current = handle;
                  }}
                  onStart={(direction) => {
                    busy.current = true;
                    left(direction, at);
                  }}
                  onGone={() => advance(at)}>
                  {renderCard(item, at)}
                </Card>
              );
            })
            .reverse()
        : null}
    </View>
  );
}

function Card({
  children,
  position,
  top,
  enterFrom,
  size,
  width,
  height,
  drag,
  directions,
  stamps,
  theme,
  reduceMotion,
  register,
  onStart,
  onGone,
}: {
  children: ReactNode;
  position: number;
  top: boolean;
  enterFrom: SwipeDirection | null;
  size: { width: number; height: number };
  width: SharedValue<number>;
  height: SharedValue<number>;
  drag: SharedValue<number>;
  directions: readonly SwipeDirection[];
  stamps?: Partial<Record<SwipeDirection, SwipeStamp>>;
  theme: (typeof THEMES)[keyof typeof THEMES];
  reduceMotion: boolean;
  register: (handle: { fling: (direction: SwipeDirection) => void }) => void;
  onStart: (direction: SwipeDirection) => void;
  onGone: () => void;
}) {
  const start = offscreen(enterFrom, size.width, size.height);
  const x = useSharedValue(start.x);
  const y = useSharedValue(start.y);
  const ax = useSharedValue(0);
  const ay = useSharedValue(0);
  const ox = useSharedValue(0);
  const oy = useSharedValue(0);
  const leaving = useSharedValue(false);
  const armed = useSharedValue<SwipeDirection | ''>('');
  const stack = useSharedValue(position);
  const last = useRef(position);

  const allowRight = directions.includes('right');
  const allowLeft = directions.includes('left');
  const allowUp = directions.includes('up');

  // Back from where it left (undo).
  useEffect(() => {
    if (!enterFrom) return;
    x.value = withSpring(0, BACK);
    y.value = withSpring(0, BACK);
  }, [enterFrom, x, y]);

  // Moving up the stack after a swipe is already shown by the drag; moving down (an undo) springs.
  useEffect(() => {
    const from = last.current;
    last.current = position;
    if (position < from) stack.value = position;
    else if (position > from) stack.value = reduceMotion ? position : withSpring(position, RAISE);
  }, [position, stack, reduceMotion]);

  function fling(direction: SwipeDirection, vx = 0, vy = 0) {
    'worklet';
    if (leaving.value) return;
    leaving.value = true;
    const w = width.value;
    const h = height.value;
    const target = direction === 'up' ? { x: x.value + vx * 0.08, y: -h * 1.35 } : { x: (direction === 'right' ? 1 : -1) * w * 1.55, y: y.value + vy * 0.1 };
    const duration = reduceMotion ? 160 : 300;
    const timing = { duration, easing: Easing.out(Easing.quad) };
    // Said first, so the deck hears "leaving" before "gone", whatever finishes first.
    scheduleOnRN(onStart, direction);
    drag.value = withTiming(1, { duration });
    // It's gone when the axis it leaves along gets there (the other may not move at all).
    const done = (finished?: boolean) => {
      'worklet';
      if (finished) scheduleOnRN(onGone);
    };
    x.value = withTiming(target.x, timing, direction === 'up' ? undefined : done);
    y.value = withTiming(target.y, timing, direction === 'up' ? done : undefined);
  }

  useEffect(() => {
    if (top) register({ fling: (direction) => scheduleOnUI(fling, direction, 0, 0) });
  });

  function tick() {
    Haptics.selectionAsync().catch(() => undefined);
  }

  const pan = Gesture.Pan()
    .enabled(top)
    .minDistance(2)
    .onBegin((event) => {
      if (leaving.value) return;
      // From where the pointer went down: on the web the pan counts from where it activated.
      ax.value = event.absoluteX;
      ay.value = event.absoluteY;
      ox.value = x.value;
      oy.value = y.value;
    })
    .onUpdate((event) => {
      if (leaving.value) return;
      x.value = ox.value + event.absoluteX - ax.value;
      y.value = oy.value + event.absoluteY - ay.value;
      const way = wayOf(x.value, y.value, width.value, height.value, allowLeft, allowRight, allowUp);
      drag.value = Math.min(1, way.progress);
      const next = way.progress >= 1 ? way.direction : '';
      if (next !== armed.value) {
        armed.value = next;
        if (next) scheduleOnRN(tick);
      }
    })
    .onEnd((event) => {
      if (leaving.value) return;
      const w = width.value;
      const h = height.value;
      if (allowUp && (y.value < -h * UP || (event.velocityY < -FLING && y.value < -40)) && Math.abs(x.value) < w * SIDE) {
        fling('up', event.velocityX, event.velocityY);
      } else if (allowRight && (x.value > w * SIDE || (event.velocityX > FLING && x.value > 30))) {
        fling('right', event.velocityX, event.velocityY);
      } else if (allowLeft && (x.value < -w * SIDE || (event.velocityX < -FLING && x.value < -30))) {
        fling('left', event.velocityX, event.velocityY);
      } else {
        x.value = withSpring(0, BACK);
        y.value = withSpring(0, BACK);
        drag.value = withSpring(0, BACK);
      }
    })
    .onFinalize(() => {
      armed.value = '';
    });

  const cardStyle = useAnimatedStyle(() => {
    const w = Math.max(width.value, 1);
    // The cards under the top one: smaller and lower, rising as the top one goes.
    const depth = top ? 0 : Math.max(0, stack.value - drag.value);
    const scale = 1 - depth * STEP_SCALE;
    return {
      zIndex: 100 - position,
      shadowOpacity: theme.shadow * (top ? 1 : Math.max(0.25, 1 - depth * 0.6)),
      transform: [
        { translateX: x.value },
        { translateY: y.value + depth * STEP_Y * 1.6 },
        { rotate: `${(x.value / w) * 13}deg` },
        { scale },
      ],
    };
  });

  const allows = { left: allowLeft, right: allowRight, up: allowUp };
  const rightStamp = useStampStyle('right', x, y, width, height, allows);
  const leftStamp = useStampStyle('left', x, y, width, height, allows);
  const upStamp = useStampStyle('up', x, y, width, height, allows);

  function onAccessibilityAction(event: AccessibilityActionEvent) {
    const name = event.nativeEvent.actionName as SwipeDirection;
    if (directions.includes(name)) fling(name);
  }

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        accessible={top}
        accessibilityActions={top ? directions.map((d) => ({ name: d, label: stamps?.[d]?.label ?? d })) : undefined}
        onAccessibilityAction={onAccessibilityAction}
        accessibilityHint={top ? 'Swipe, or use the actions, to move on.' : undefined}
        style={[styles.card, { backgroundColor: theme.card, borderColor: theme.line }, top ? webGrab : null, cardStyle]}>
        <View style={styles.clip}>{children}</View>
        {stamps?.right ? <Stamp stamp={stamps.right} place={styles.stampLeft} shown={rightStamp} tilt={-12} /> : null}
        {stamps?.left ? <Stamp stamp={stamps.left} place={styles.stampRight} shown={leftStamp} tilt={12} /> : null}
        {stamps?.up ? <Stamp stamp={stamps.up} place={styles.stampBottom} shown={upStamp} tilt={0} /> : null}
      </Animated.View>
    </GestureDetector>
  );
}

type Way = { direction: SwipeDirection | ''; progress: number };

/** Which way the card is going and how far along (1 at the point where letting go sends it). */
function wayOf(x: number, y: number, w: number, h: number, left: boolean, right: boolean, up: boolean): Way {
  'worklet';
  const side = Math.abs(x) / Math.max(1, w * SIDE);
  const rise = Math.max(0, -y) / Math.max(1, h * UP);
  if (up && rise > side) return { direction: 'up', progress: rise };
  if (x > 0 && right) return { direction: 'right', progress: side };
  if (x < 0 && left) return { direction: 'left', progress: side };
  return { direction: '', progress: 0 };
}

/** A stamp shows as the card heads its way, fully a little before the point of no return. */
function useStampStyle(
  direction: SwipeDirection,
  x: SharedValue<number>,
  y: SharedValue<number>,
  width: SharedValue<number>,
  height: SharedValue<number>,
  allows: { left: boolean; right: boolean; up: boolean },
) {
  return useAnimatedStyle(() => {
    const way = wayOf(x.value, y.value, width.value, height.value, allows.left, allows.right, allows.up);
    const shown = way.direction === direction ? Math.min(1, way.progress * 1.25) : 0;
    return { opacity: shown, transform: [{ scale: 0.86 + 0.14 * shown }] };
  });
}

function offscreen(direction: SwipeDirection | null, w: number, h: number) {
  if (direction === 'up') return { x: 0, y: -h * 1.35 };
  if (direction === 'right') return { x: w * 1.55, y: 0 };
  if (direction === 'left') return { x: -w * 1.55, y: 0 };
  return { x: 0, y: 0 };
}

/** The word a way says on the card, in its color, with a wash of that color over the card. */
function Stamp({
  stamp,
  place,
  shown,
  tilt,
}: {
  stamp: SwipeStamp;
  place: ViewStyle;
  shown: ReturnType<typeof useStampStyle>;
  tilt: number;
}) {
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, place, shown]}>
      <View style={[StyleSheet.absoluteFill, styles.wash, { backgroundColor: stamp.color }]} />
      <View style={[styles.stamp, { borderColor: stamp.color, transform: [{ rotate: `${tilt}deg` }] }]}>
        <Text style={[styles.stampText, { color: stamp.color }]}>{stamp.label}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  deck: { flex: 1 },
  card: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  clip: { flex: 1, borderRadius: RADIUS, overflow: 'hidden' },
  wash: { opacity: 0.1, borderRadius: RADIUS },
  stampLeft: { alignItems: 'flex-start', paddingTop: 30, paddingLeft: 24 },
  stampRight: { alignItems: 'flex-end', paddingTop: 30, paddingRight: 24 },
  stampBottom: { alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 40 },
  stamp: {
    borderWidth: 3,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  stampText: { fontSize: 26, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', userSelect: 'none' },
});
