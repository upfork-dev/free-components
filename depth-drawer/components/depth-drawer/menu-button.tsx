import { Platform, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedProps } from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';

import { useDrawer } from './drawer';

export type MenuButtonProps = {
  /** What the three bars become as the drawer opens: a close mark, or a back arrow. */
  morph?: 'close' | 'arrow';
  color?: string;
  /** The icon's size; the touch area is at least 44 points. */
  size?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const AnimatedLine = Animated.createAnimatedComponent(Line);
const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;

// Each bar as [x1, y1, x2, y2] at rest and at the end of the morph, on a 24-point grid.
const BARS = {
  close: [
    [4.5, 7, 19.5, 7, 6.2, 6.2, 17.8, 17.8],
    [4.5, 12, 19.5, 12, 12, 12, 12, 12],
    [4.5, 17, 19.5, 17, 6.2, 17.8, 17.8, 6.2],
  ],
  arrow: [
    [4.5, 7, 19.5, 7, 5, 12, 11.5, 5.5],
    [4.5, 12, 19.5, 12, 5, 12, 19.5, 12],
    [4.5, 17, 19.5, 17, 5, 12, 11.5, 18.5],
  ],
} as const;

/** Three bars that turn into a close mark (or a back arrow) as the drawer opens. Pressing it toggles the drawer. */
export function MenuButton({ morph = 'close', color, size = 24, accessibilityLabel, style }: MenuButtonProps) {
  const { progress, toggle, isOpen, theme, side } = useDrawer();
  const ink = color ?? theme.text;
  const bars = BARS[morph];
  // In a right-side drawer the arrow points the other way.
  const flip = morph === 'arrow' && side === 'right';
  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (isOpen ? 'Close menu' : 'Open menu')}
      accessibilityState={{ expanded: isOpen }}
      aria-expanded={isOpen}
      hitSlop={Math.max(0, (44 - size) / 2)}
      style={[styles.button, { width: Math.max(44, size), height: Math.max(44, size) }, webPointer, style]}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24" style={flip ? { transform: [{ scaleX: -1 }] } : undefined}>
        {bars.map((bar, i) => (
          <Bar key={i} bar={bar} index={i} color={ink} progress={progress} morph={morph} />
        ))}
      </Svg>
    </Pressable>
  );
}

function Bar({
  bar,
  index,
  color,
  progress,
  morph,
}: {
  bar: readonly number[];
  index: number;
  color: string;
  progress: ReturnType<typeof useDrawer>['progress'];
  morph: 'close' | 'arrow';
}) {
  const props = useAnimatedProps(() => {
    const raw = progress.value;
    const t = raw < 0 ? 0 : raw > 1 ? 1 : raw;
    // Ease the morph so the bars meet softly.
    const e = t * t * (3 - 2 * t);
    const lerp = (a: number, b: number) => a + (b - a) * e;
    // The middle bar of the close mark shrinks into the centre and fades.
    const fade = morph === 'close' && index === 1 ? 1 - e : 1;
    return {
      x1: lerp(bar[0], bar[4]),
      y1: lerp(bar[1], bar[5]),
      x2: lerp(bar[2], bar[6]),
      y2: lerp(bar[3], bar[7]),
      strokeOpacity: fade,
    };
  });
  return <AnimatedLine animatedProps={props} stroke={color} strokeWidth={2} strokeLinecap="round" />;
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center' },
});
