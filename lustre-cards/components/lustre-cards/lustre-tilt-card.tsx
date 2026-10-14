import { useEffect } from 'react';
import { Platform, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { LustreCard, cardHeight, type PaymentCard } from './lustre-card';

export type LustreTiltCardProps = {
  card: PaymentCard;
  width: number;
  orientation?: 'portrait' | 'landscape';
  /** Show the back. */
  flipped?: boolean;
  /** A tap on the card. */
  onPress?: () => void;
  cvvVisible?: boolean;
  onRevealCvv?: (visible: boolean) => void;
  /** A slow drift of the light at rest. */
  breathe?: boolean;
  style?: ViewStyle;
};

/** A single card you can tilt with a finger (or the mouse, hovering) and turn over. */
export function LustreTiltCard({
  card,
  width,
  orientation = 'portrait',
  flipped = false,
  onPress,
  cvvVisible,
  onRevealCvv,
  breathe = true,
  style,
}: LustreTiltCardProps) {
  const reduceMotion = useReducedMotion();
  const height = cardHeight(width, orientation);
  const tilt = useSharedValue({ x: 0, y: 0 });
  const flip = useSharedValue(flipped ? 1 : 0);
  const time = useSharedValue(0);
  const drifting = breathe && !reduceMotion;

  useEffect(() => {
    flip.value = withTiming(flipped ? 1 : 0, { duration: reduceMotion ? 180 : 560 });
  }, [flipped, flip, reduceMotion]);

  useFrameCallback((frame) => {
    if (drifting) time.value = frame.timeSinceFirstFrame / 1000;
  });

  const aim = (x: number, y: number) => {
    'worklet';
    tilt.value = {
      x: Math.max(-1, Math.min(1, (x - width / 2) / (width / 2))),
      y: Math.max(-1, Math.min(1, (y - height / 2) / (height / 2))),
    };
  };
  const settle = () => {
    'worklet';
    tilt.value = withSpring({ x: 0, y: 0 }, { stiffness: 150, damping: 14 });
  };

  const press = () => onPress?.();
  const pan = Gesture.Pan()
    .minDistance(2)
    .onStart((event) => aim(event.x, event.y))
    .onUpdate((event) => aim(event.x, event.y))
    .onFinalize(() => settle());
  const tap = Gesture.Tap()
    .maxDistance(8)
    .onEnd((_event, success) => {
      if (success) scheduleOnRN(press);
    });
  const hover = Gesture.Hover()
    .enabled(Platform.OS === 'web')
    .onUpdate((event) => aim(event.x, event.y))
    .onEnd(() => settle());

  return (
    <GestureDetector gesture={Gesture.Simultaneous(hover, Gesture.Exclusive(pan, tap))}>
      <Animated.View style={[{ width, height }, style]}>
        <LustreCard
          card={card}
          width={width}
          orientation={orientation}
          tilt={tilt}
          flip={flip}
          time={time}
          cvvVisible={cvvVisible}
          onRevealCvv={onRevealCvv}
        />
      </Animated.View>
    </GestureDetector>
  );
}
