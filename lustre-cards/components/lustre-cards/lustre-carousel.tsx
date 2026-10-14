import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode, type Ref } from 'react';
import {
  AccessibilityInfo,
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
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type DerivedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useScheme, type Scheme } from '../../lib/use-scheme';
import { LustreCard, cardHeight, type PaymentCard } from './lustre-card';

export type LustreCarouselHandle = {
  scrollToIndex(index: number, animated?: boolean): void;
  /** Turns the card in focus over (or back). */
  flip(): void;
};

export type LustreCarouselProps = {
  cards: PaymentCard[];
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
  /** A tap on the card in focus. By default it flips over. */
  onCardPress?: (card: PaymentCard, index: number) => void;
  orientation?: 'portrait' | 'landscape';
  /** The cards' width. Defaults to 62% of the carousel (portrait), at most 260. */
  cardWidth?: number;
  /** Tilt the card in focus by pressing and holding on it (or hovering, with a mouse). */
  tiltEnabled?: boolean;
  /** An outside tilt, each from -1 to 1 (for instance from the device's motion). */
  tiltX?: SharedValue<number>;
  tiltY?: SharedValue<number>;
  /** Drawn under the cards for each card, cross-fading as they pass: its plan, its price. */
  renderDetails?: (card: PaymentCard, index: number) => ReactNode;
  /** Follows the carousel as a fractional index. */
  progress?: SharedValue<number>;
  /** A slow drift of the light at rest, so a still screen looks alive. */
  breathe?: boolean;
  scheme?: Scheme;
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;
  ref?: Ref<LustreCarouselHandle>;
};

const SNAP = { stiffness: 200, damping: 24, mass: 1 };
const FLIP = { duration: 560 };
const PROJECTION = 0.12;
const webGrab = Platform.OS === 'web' ? ({ cursor: 'grab' } as unknown as ViewStyle) : null;

/**
 * Payment cards in a carousel: the one in focus faces you, lifted, the others turn away at depth. Their reflections
 * slide as they move, follow a tilt, and they flip to show their backs.
 */
export function LustreCarousel({
  cards,
  initialIndex = 0,
  onIndexChange,
  onCardPress,
  orientation = 'portrait',
  cardWidth: cardWidthProp,
  tiltEnabled = true,
  tiltX,
  tiltY,
  renderDetails,
  progress,
  breathe = true,
  scheme: schemeProp,
  haptics = true,
  style,
  ref,
}: LustreCarouselProps) {
  useScheme(schemeProp);
  const reduceMotion = useReducedMotion();
  const window = useWindowDimensions();
  const [width, setWidth] = useState(window.width);
  const cardWidth = cardWidthProp ?? Math.min(Math.round(width * (orientation === 'portrait' ? 0.62 : 0.8)), orientation === 'portrait' ? 260 : 330);
  const height = cardHeight(cardWidth, orientation);
  const spacing = cardWidth * 0.8;
  const count = cards.length;

  const position = useSharedValue(Math.min(Math.max(initialIndex, 0), Math.max(count - 1, 0)));
  const [focused, setFocused] = useState(Math.round(position.value));
  const focusedRef = useRef(focused);
  const [flipped, setFlipped] = useState(false);
  const flip = useSharedValue(0);
  const [cvvShown, setCvvShown] = useState(false);

  // The tilt: a finger held on the card, the mouse over it, or an outside source.
  const ownTilt = useSharedValue({ x: 0, y: 0 });
  const tilt = useDerivedValue(() => ({
    x: Math.max(-1, Math.min(1, ownTilt.value.x + (tiltX ? tiltX.value : 0))),
    y: Math.max(-1, Math.min(1, ownTilt.value.y + (tiltY ? tiltY.value : 0))),
  }));

  // Time, for the light's drift and the frost's sparkle.
  const time = useSharedValue(0);
  const drifting = breathe && !reduceMotion;
  useFrameCallback((frame) => {
    if (drifting) time.value = frame.timeSinceFirstFrame / 1000;
  });

  useAnimatedReaction(
    () => position.value,
    (value) => {
      if (progress) progress.value = value;
    },
  );

  const report = useCallback(
    (index: number) => {
      focusedRef.current = index;
      setFocused(index);
      setFlipped(false);
      setCvvShown(false);
      onIndexChange?.(index);
      if (haptics) Haptics.selectionAsync().catch(() => undefined);
    },
    [onIndexChange, haptics],
  );

  useAnimatedReaction(
    () => Math.round(position.value),
    (index, previous) => {
      if (previous !== null && index !== previous) scheduleOnRN(report, index);
    },
  );

  useEffect(() => {
    flip.value = reduceMotion ? withTiming(flipped ? 1 : 0, { duration: 180 }) : withTiming(flipped ? 1 : 0, FLIP);
    if (flipped && haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  }, [flipped, flip, reduceMotion, haptics]);

  const scrollToIndex = useCallback(
    (index: number, animated = true) => {
      const target = Math.min(Math.max(Math.round(index), 0), count - 1);
      cancelAnimation(position);
      position.value = animated ? withSpring(target, SNAP) : target;
    },
    [count, position],
  );

  useImperativeHandle(ref, () => ({ scrollToIndex, flip: () => setFlipped((value) => !value) }), [scrollToIndex]);

  const pressCard = useCallback(
    (index: number) => {
      if (index !== focusedRef.current) {
        scrollToIndex(index);
        return;
      }
      const card = cards[index];
      if (onCardPress && card) onCardPress(card, index);
      else setFlipped((value) => !value);
    },
    [cards, onCardPress, scrollToIndex],
  );

  // Swiping: from where the pointer went down; a fling keeps its speed and lands on a card.
  const startX = useSharedValue(0);
  const startPosition = useSharedValue(0);
  const pan = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .failOffsetY([-14, 14])
    .onBegin((event) => {
      startX.value = event.absoluteX;
      startPosition.value = position.value;
    })
    .onStart(() => {
      cancelAnimation(position);
      startPosition.value = position.value;
    })
    .onUpdate((event) => {
      const raw = startPosition.value - (event.absoluteX - startX.value) / spacing;
      const max = count - 1;
      position.value = raw < 0 ? raw * 0.35 : raw > max ? max + (raw - max) * 0.35 : raw;
    })
    .onEnd((event) => {
      const velocity = -event.velocityX / spacing;
      const target = Math.min(Math.max(Math.round(position.value + velocity * PROJECTION), 0), count - 1);
      position.value = reduceMotion ? withTiming(target, { duration: 200 }) : withSpring(target, { ...SNAP, velocity });
    });

  const cardLeft = (width - cardWidth) / 2;
  const cardTop = 18;
  const tapAt = (x: number, y: number) => {
    'worklet';
    const inside = y >= cardTop - 10 && y <= cardTop + height + 10;
    if (!inside) return;
    const index = Math.round(position.value + (x - width / 2) / spacing);
    if (index >= 0 && index < count) scheduleOnRN(pressCard, index);
  };
  const tap = Gesture.Tap()
    .maxDistance(10)
    .onEnd((event, success) => {
      if (success) tapAt(event.x, event.y);
    });

  const aim = (x: number, y: number) => {
    'worklet';
    const nx = (x - (cardLeft + cardWidth / 2)) / (cardWidth / 2);
    const ny = (y - (cardTop + height / 2)) / (height / 2);
    ownTilt.value = { x: Math.max(-1, Math.min(1, nx)), y: Math.max(-1, Math.min(1, ny)) };
  };
  const settleTilt = () => {
    'worklet';
    ownTilt.value = withSpring({ x: 0, y: 0 }, { stiffness: 150, damping: 14 });
  };
  // Press and hold on the card in focus, then move: it tilts under the finger.
  const tiltPan = Gesture.Pan()
    .enabled(tiltEnabled)
    .activateAfterLongPress(160)
    .onStart((event) => aim(event.x, event.y))
    .onUpdate((event) => aim(event.x, event.y))
    .onFinalize(() => settleTilt());
  // With a mouse, it tilts towards the pointer.
  const hover = Gesture.Hover()
    .enabled(tiltEnabled && Platform.OS === 'web')
    .onUpdate((event) => {
      const over = Math.abs(event.x - width / 2) < cardWidth / 2 && event.y > cardTop && event.y < cardTop + height;
      if (over) aim(event.x, event.y);
      else settleTilt();
    })
    .onEnd(() => settleTilt());

  const gesture = Gesture.Simultaneous(hover, Gesture.Race(pan, tiltPan, tap));

  const onLayout = (event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    if (next > 0 && next !== width) setWidth(next);
  };

  const accessibilityLabel = (index: number) => {
    const card = cards[index];
    if (!card) return '';
    return `${card.label ?? 'Card'} ending ${card.last4}${card.frozen ? ', frozen' : ''}, ${index + 1} of ${count}`;
  };
  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    const name = event.nativeEvent.actionName;
    if (name === 'increment') scrollToIndex(focusedRef.current + 1);
    else if (name === 'decrement') scrollToIndex(focusedRef.current - 1);
    else if (name === 'activate') pressCard(focusedRef.current);
    else if (name === 'revealCvv') {
      const card = cards[focusedRef.current];
      setFlipped(true);
      AccessibilityInfo.announceForAccessibility(
        card?.cvv ? `Security code ${card.cvv.split('').join(' ')}` : 'No security code',
      );
    }
  };

  // Every card stays mounted (each one's canvas holds its compiled shader); long lists keep two on each side.
  const mounted = count <= 6 ? null : ([Math.max(0, focused - 2), Math.min(count - 1, focused + 2)] as const);

  return (
    <View style={[styles.root, style]} onLayout={onLayout}>
      <GestureDetector gesture={gesture}>
        <View
          style={[styles.stage, { height: height + 44 }, webGrab]}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={accessibilityLabel(focused)}
          accessibilityHint={flipped ? 'Activate to turn it back over' : 'Activate to turn it over'}
          accessibilityActions={[
            { name: 'increment' },
            { name: 'decrement' },
            { name: 'activate' },
            { name: 'revealCvv', label: 'Show the security code' },
          ]}
          onAccessibilityAction={onAccessibilityAction}>
          {cards.map((card, index) =>
            mounted && (index < mounted[0] || index > mounted[1]) ? null : (
              <CarouselCard
                key={card.id}
                card={card}
                index={index}
                width={cardWidth}
                left={cardLeft}
                top={cardTop}
                spacing={spacing}
                position={position}
                orientation={orientation}
                tilt={tilt}
                time={time}
                flip={flip}
                isFocused={index === focused}
                cvvVisible={index === focused && cvvShown}
                onRevealCvv={setCvvShown}
              />
            ),
          )}
        </View>
      </GestureDetector>
      {renderDetails ? (
        <View style={styles.details}>
          {cards.map((card, index) => (
            <Details key={card.id} index={index} position={position}>
              {renderDetails(card, index)}
            </Details>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function CarouselCard({
  card,
  index,
  width,
  left,
  top,
  spacing,
  position,
  orientation,
  tilt,
  time,
  flip,
  isFocused,
  cvvVisible,
  onRevealCvv,
}: {
  card: PaymentCard;
  index: number;
  width: number;
  left: number;
  top: number;
  spacing: number;
  position: SharedValue<number>;
  orientation: 'portrait' | 'landscape';
  tilt: DerivedValue<{ x: number; y: number }>;
  time: SharedValue<number>;
  flip: SharedValue<number>;
  isFocused: boolean;
  cvvVisible: boolean;
  onRevealCvv: (visible: boolean) => void;
}) {
  const distance = useDerivedValue(() => index - position.value);
  // The light slides across the card as it passes the middle.
  const yaw = useDerivedValue(() => -Math.max(-1.6, Math.min(1.6, distance.value)) * 0.75);
  const near = useDerivedValue(() => 1 - Math.min(Math.abs(distance.value), 1));
  const ownTilt = useDerivedValue(() => (isFocused ? tilt.value : { x: 0, y: 0 }));
  const ownFlip = useDerivedValue(() => (isFocused ? flip.value : 0));
  const shine = useDerivedValue(() => 0.55 + 0.45 * near.value);

  const place = useAnimatedStyle(() => {
    const d = distance.value;
    const clamped = Math.max(-1.6, Math.min(1.6, d));
    const away = Math.min(Math.abs(d), 1);
    return {
      zIndex: Math.round(100 - Math.abs(d) * 10),
      opacity: Math.abs(d) > 2.4 ? 0 : 1,
      transform: [
        { translateX: d * spacing - Math.sign(d) * Math.max(Math.abs(d) - 1, 0) * spacing * 0.3 },
        { translateY: -10 * (1 - away) },
        { perspective: 1000 },
        { rotateY: `${-clamped * 18}deg` },
        { scale: 1 - 0.14 * away - 0.06 * Math.max(Math.abs(d) - 1, 0) },
      ],
    };
  });
  // The cards beside the one in focus go a little darker (not transparent).
  const dim = useAnimatedStyle(() => ({ opacity: Math.min(Math.abs(distance.value), 1.4) * 0.32 }));
  const radius = Math.round(Math.min(width, cardHeight(width, orientation)) * 0.075);

  return (
    <Animated.View style={[styles.card, { left, top }, place]}>
      <View style={[styles.shadow, { borderRadius: radius }]}>
        <LustreCard
          card={card}
          width={width}
          orientation={orientation}
          yaw={yaw}
          tilt={ownTilt}
          flip={ownFlip}
          time={time}
          shine={shine}
          cvvVisible={cvvVisible}
          onRevealCvv={onRevealCvv}
        />
      </View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#05050A', borderRadius: radius }, dim]} />
    </Animated.View>
  );
}

function Details({ index, position, children }: { index: number; position: SharedValue<number>; children: ReactNode }) {
  const style = useAnimatedStyle(() => {
    const d = index - position.value;
    const shown = 1 - Math.min(Math.abs(d) * 1.8, 1);
    return { opacity: shown * shown, transform: [{ translateX: d * 36 }] };
  });
  const [active, setActive] = useState(false);
  useAnimatedReaction(
    () => Math.abs(index - position.value) < 0.5,
    (now, before) => {
      if (now !== before) scheduleOnRN(setActive, now);
    },
  );
  return (
    <Animated.View pointerEvents={active ? 'auto' : 'none'} style={[StyleSheet.absoluteFill, style]}>
      {children}
    </Animated.View>
  );
}

export function useCardSize(width: number, orientation: 'portrait' | 'landscape' = 'portrait') {
  return useMemo(() => ({ width, height: cardHeight(width, orientation) }), [width, orientation]);
}

const styles = StyleSheet.create({
  root: { width: '100%' },
  stage: { width: '100%' },
  card: { position: 'absolute' },
  shadow: {
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 18 },
    elevation: 12,
  },
  details: { flex: 1, minHeight: 200 },
});
