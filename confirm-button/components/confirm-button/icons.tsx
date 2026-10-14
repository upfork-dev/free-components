import { useEffect } from 'react';
import Animated, { cancelAnimation, useAnimatedProps, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

type IconProps = { size: number; color: string };

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Easings that hold still outside 0…1: on the web a first frame can come with a slightly negative time.
const linear = (t: number) => {
  'worklet';
  return t < 0 ? 0 : t > 1 ? 1 : t;
};
const outCubic = (t: number) => {
  'worklet';
  const c = 1 - (t < 0 ? 0 : t > 1 ? 1 : t);
  return 1 - c * c * c;
};

/** A 2-point arc turning once every 0.85 s. */
export function Spinner({ size, color }: IconProps) {
  const turn = useSharedValue(0);
  useEffect(() => {
    turn.value = withRepeat(withTiming(1, { duration: 850, easing: linear }), -1, false);
    return () => cancelAnimation(turn);
  }, [turn]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 360}deg` }] }));
  const r = size / 2 - 1.5;
  const c = size / 2;
  return (
    <Animated.View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Path d={`M ${c} ${c - r} A ${r} ${r} 0 1 1 ${c - r} ${c}`} stroke={color} strokeWidth={2} strokeLinecap="round" fill="none" />
      </Svg>
    </Animated.View>
  );
}

const CHECK = 'M5 12.5l4.4 4.4L19 7.4';
const CHECK_LENGTH = 21;

/** A check that draws itself (260 ms) when `drawn` turns true. */
export function DrawnCheck({ size, color, drawn }: IconProps & { drawn: boolean }) {
  const draw = useSharedValue(drawn ? 1 : 0);
  useEffect(() => {
    draw.value = drawn ? withTiming(1, { duration: 260, easing: outCubic }) : 0;
  }, [drawn, draw]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: CHECK_LENGTH * (1 - draw.value) }));
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <AnimatedPath d={CHECK} stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray={CHECK_LENGTH} animatedProps={props} />
    </Svg>
  );
}

export function Cross({ size, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M7 7l10 10M17 7L7 17" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

export { linear, outCubic };
