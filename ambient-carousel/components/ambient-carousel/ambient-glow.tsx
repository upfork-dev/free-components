import { Canvas, Circle, Group, LinearGradient, Paint, RadialGradient, Rect, vec } from '@shopify/react-native-skia';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useDerivedValue, useFrameCallback, useReducedMotion, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { useScheme, type Scheme } from '../../lib/use-scheme';
import { glowing, labToRgba, pastel, type Lab } from './color';

export type AmbientGlowProps = {
  /** Three colours in OKLab, following the carousel every frame. */
  palette: SharedValue<[Lab, Lab, Lab]>;
  width: number;
  height: number;
  /** Where the glow gathers (the focused cover's centre) and the cover's size. */
  focusX: number;
  focusY: number;
  coverSize: number;
  /** 0 to 1 (1 by default). */
  intensity?: number;
  /** A slow drift of the blobs (off with reduced motion). */
  drift?: boolean;
  scheme?: Scheme;
  style?: StyleProp<ViewStyle>;
};

type Blob = { dx: number; dy: number; r: number; color: number; fx: number; fy: number; phase: number; amp: number };

// Four soft blobs round the focus, each drifting on its own slow Lissajous loop (6 to 10 seconds a turn).
const BLOBS: Blob[] = [
  { dx: -0.3, dy: -0.22, r: 0.72, color: 0, fx: 1 / 8, fy: 1 / 10, phase: 0.0, amp: 0.12 },
  { dx: 0.32, dy: -0.06, r: 0.7, color: 1, fx: 1 / 7, fy: 1 / 9, phase: 1.7, amp: 0.11 },
  { dx: -0.04, dy: 0.32, r: 0.66, color: 2, fx: 1 / 9, fy: 1 / 6.5, phase: 3.1, amp: 0.1 },
  { dx: 0.12, dy: -0.38, r: 0.56, color: 1, fx: 1 / 6, fy: 1 / 8, phase: 4.4, amp: 0.1 },
];

/**
 * A living aura: soft blobs of a palette drifting behind something, blended in OKLab as the palette changes. It fades
 * to nothing well inside its canvas, so it has no edge, and its gradients are dithered, so it doesn't band.
 */
export function AmbientGlow({
  palette,
  width,
  height,
  focusX,
  focusY,
  coverSize,
  intensity = 1,
  drift = true,
  scheme: schemeProp,
  style,
}: AmbientGlowProps) {
  const scheme = useScheme(schemeProp);
  const reduce = useReducedMotion();
  const dark = scheme === 'dark';
  const peak = (dark ? 0.75 : 0.55) * Math.max(0, Math.min(1, intensity));
  const moving = drift && !reduce;

  const time = useSharedValue(0);
  useFrameCallback((frame) => {
    if (moving) time.value = frame.timeSinceFirstFrame / 1000;
  }, moving);

  return (
    <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={[{ width, height }, style]}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Group layer={<Paint />}>
          {BLOBS.map((blob, i) => (
            <GlowBlob
              key={i}
              blob={blob}
              palette={palette}
              time={time}
              x={focusX}
              y={focusY}
              size={coverSize}
              peak={peak}
              dark={dark}
            />
          ))}
          {/* The fade to nothing: the whole aura multiplied by an alpha that reaches 0 well before every edge. */}
          <Rect x={0} y={0} width={width} height={height} blendMode="dstIn">
            <LinearGradient
              start={vec(0, 0)}
              end={vec(width, 0)}
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,1)', 'rgba(0,0,0,1)', 'rgba(0,0,0,0)']}
              positions={[0, 0.2, 0.8, 1]}
            />
          </Rect>
          <Rect x={0} y={0} width={width} height={height} blendMode="dstIn">
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, height)}
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,1)', 'rgba(0,0,0,1)', 'rgba(0,0,0,0)']}
              positions={[0, 0.16, 0.66, 1]}
            />
          </Rect>
        </Group>
      </Canvas>
    </View>
  );
}

function GlowBlob({
  blob,
  palette,
  time,
  x,
  y,
  size,
  peak,
  dark,
}: {
  blob: Blob;
  palette: SharedValue<[Lab, Lab, Lab]>;
  time: SharedValue<number>;
  x: number;
  y: number;
  size: number;
  peak: number;
  dark: boolean;
}) {
  const r = blob.r * size;
  const cx = useDerivedValue(() => x + blob.dx * size + Math.sin(time.value * Math.PI * 2 * blob.fx + blob.phase) * blob.amp * size);
  const cy = useDerivedValue(() => y + blob.dy * size + Math.sin(time.value * Math.PI * 2 * blob.fy + blob.phase * 1.3) * blob.amp * size);
  const center = useDerivedValue(() => vec(cx.value, cy.value));
  const colors = useDerivedValue(() => {
    const lab = dark ? glowing(palette.value[blob.color]) : pastel(palette.value[blob.color]);
    return [labToRgba(lab, peak), labToRgba(lab, peak * 0.62), labToRgba(lab, peak * 0.24), labToRgba(lab, 0)];
  });
  return (
    <Circle cx={cx} cy={cy} r={r} dither blendMode={dark ? 'screen' : 'multiply'}>
      <RadialGradient c={center} r={r} colors={colors} positions={[0, 0.34, 0.7, 1]} />
    </Circle>
  );
}
