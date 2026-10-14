import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

type Props = {
  text: string;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  /** Screen readers announce the new text. */
  live?: boolean;
  numberOfLines?: number;
};

/**
 * A caption that changes with a little life: the old text rises and fades while the new one rises in
 * after it, never on top of it. For the counter and for captions (date, place, chapter).
 */
export function SwapText({ text, style, containerStyle, live = false, numberOfLines = 1 }: Props) {
  const [shown, setShown] = useState({ now: text, before: null as string | null, key: 0 });
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setShown((s) => (s.now === text ? s : { now: text, before: s.now, key: s.key + 1 }));
  }, [text]);

  return (
    <View style={[styles.box, containerStyle]} accessibilityLiveRegion={live ? 'polite' : 'none'} aria-live={live ? 'polite' : undefined}>
      <Line key={`in${shown.key}`} text={shown.now} style={style} phase={shown.key === 0 ? 'still' : 'in'} numberOfLines={numberOfLines} />
      {shown.before !== null ? (
        <Line key={`out${shown.key}`} text={shown.before} style={[style, styles.over]} phase="out" numberOfLines={numberOfLines} hidden />
      ) : null}
    </View>
  );
}

function Line({
  text,
  style,
  phase,
  numberOfLines,
  hidden,
}: {
  text: string;
  style?: StyleProp<TextStyle>;
  phase: 'still' | 'in' | 'out';
  numberOfLines: number;
  hidden?: boolean;
}) {
  const p = useSharedValue(phase === 'in' ? 0 : 1);
  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    if (phase === 'in') p.value = withDelay(70, withTiming(1, { duration: 200, easing: ease }));
    if (phase === 'out') p.value = withTiming(0, { duration: 130, easing: ease });
  }, [phase, p]);
  const animated = useAnimatedStyle(() => {
    const t = Math.min(Math.max(p.value, 0), 1);
    return {
      opacity: t,
      transform: [{ translateY: phase === 'out' ? -5 * (1 - t) : 6 * (1 - t) }],
    };
  });
  return (
    <Animated.Text
      numberOfLines={numberOfLines}
      style={[style, animated]}
      aria-hidden={hidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      accessibilityElementsHidden={hidden}
    >
      {text}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  box: { overflow: 'visible' },
  over: { position: 'absolute', left: 0, right: 0, top: 0 },
});
