// One piece on screen (a letter, a word, a digit's strip): it plays its orders on the UI thread
// (move, arrive, leave) and tells its owner when it has finished leaving.

import { useEffect, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
  type WithSpringConfig,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { inOutQuad, outCubic, outQuad } from './easing';
import type { Piece } from './plan';

/** How far (px) a piece arrives from and leaves towards. */
export const ARRIVE_FROM = 6;
export const LEAVE_TO = 4;
const ARRIVE_FADE = 180;
/** Arrivals rise into place a little faster than pieces travel sideways: no letter lingers low. */
const ARRIVE_SPRING = { stiffness: 460, damping: 36, mass: 1 };

export type PieceTiming = {
  spring: WithSpringConfig;
  exitDuration: number;
  /** Reduced motion: fades this long, no travel. */
  fadeDuration: number;
};

type Props = {
  piece: Piece;
  /** The row's animated width: pieces measured from the centre or the right follow it. */
  width: SharedValue<number>;
  height: number;
  timing: PieceTiming;
  onGone: (id: number) => void;
  children: ReactNode;
};

export function PieceView({ piece, width, height, timing, onGone, children }: Props) {
  const entering = piece.phase === 'enter';
  const x = useSharedValue(piece.x);
  const y = useSharedValue(entering && !piece.fadeOnly ? ARRIVE_FROM * piece.rise : 0);
  const opacity = useSharedValue(entering ? 0 : 1);
  const scale = useSharedValue(1);

  useEffect(() => {
    const { spring, exitDuration, fadeDuration } = timing;
    if (piece.phase === 'exit') {
      const id = piece.id;
      const done = (finished?: boolean) => {
        'worklet';
        if (finished) scheduleOnRN(onGone, id);
      };
      if (piece.fadeOnly) {
        opacity.value = withTiming(0, { duration: fadeDuration, easing: inOutQuad }, done);
        return;
      }
      opacity.value = withTiming(0, { duration: exitDuration * 0.8, easing: outQuad });
      scale.value = withTiming(0.7, { duration: exitDuration, easing: outCubic });
      y.value = withTiming(-LEAVE_TO * piece.rise, { duration: exitDuration, easing: outCubic }, done);
      return;
    }
    if (piece.phase === 'enter' && piece.fadeOnly) {
      x.value = piece.x;
      opacity.value = withTiming(1, { duration: fadeDuration, easing: inOutQuad });
      return;
    }
    if (piece.phase === 'enter') {
      x.value = piece.x;
      opacity.value = withDelay(piece.delay, withTiming(1, { duration: ARRIVE_FADE, easing: outQuad }));
      y.value = withDelay(piece.delay, withSpring(0, ARRIVE_SPRING));
      scale.value = 1;
      return;
    }
    // Staying: go to the new place from wherever it is now (an interrupted morph doesn't snap back).
    x.value = withDelay(piece.delay, withSpring(piece.x, spring));
    if (opacity.value < 1) opacity.value = withTiming(1, { duration: ARRIVE_FADE, easing: outQuad });
    if (y.value !== 0) y.value = withSpring(0, ARRIVE_SPRING);
    if (scale.value !== 1) scale.value = withSpring(1, spring);
    // New orders only when the plan changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [piece.plan, piece.phase]);

  const anchor = piece.anchor;
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: anchor * width.value + x.value }, { translateY: y.value }, { scale: scale.value }],
  }));

  return <Animated.View style={[styles.piece, { width: piece.w, height }, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  piece: { position: 'absolute', left: 0, top: 0, overflow: 'visible' },
});
