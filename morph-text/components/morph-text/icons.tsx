import { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { linear, outCubic } from './easing';

type IconProps = { size: number; color: string };

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** A 2 px arc that turns once every 0.85 s. */
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
        <Path
          d={`M ${c} ${c - r} A ${r} ${r} 0 1 1 ${c - r} ${c}`}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    </Animated.View>
  );
}

const CHECK = 'M5 12.5l4.4 4.4L19 7.4';
const CHECK_LENGTH = 21;

/** A check that draws itself (220 ms) each time `drawn` turns true. */
export function DrawnCheck({ size, color, drawn }: IconProps & { drawn: boolean }) {
  const draw = useSharedValue(drawn ? 1 : 0);
  useEffect(() => {
    draw.value = drawn ? withTiming(1, { duration: 220, easing: outCubic }) : 0;
  }, [drawn, draw]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: CHECK_LENGTH * (1 - draw.value) }));
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <AnimatedPath
        d={CHECK}
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={CHECK_LENGTH}
        animatedProps={props}
      />
    </Svg>
  );
}

/** An exclamation mark in a ring, for errors. */
export function ErrorMark({ size, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17Z" stroke={color} strokeWidth={2} />
      <Path d="M12 7.8v5.2M12 16.3h.01" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}
