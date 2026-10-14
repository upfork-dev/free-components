import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Paint,
  Path,
  Picture,
  RadialGradient,
  Rect,
  Shadow,
  Skia,
  SweepGradient,
  createPicture,
  vec,
  type SkPath,
} from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { interpolateColor, useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { useScheme, type Scheme } from '../../lib/use-scheme';

export type AnalogClockProps = {
  /** Minutes since 00:00, fractional and unbounded: the hands follow it (past midnight, they keep going forwards). */
  minutes: SharedValue<number>;
  size?: number;
  /** A booked span drawn round the face, from `start` to `end` (minutes; `end` after `start`). */
  range?: { start: SharedValue<number>; end: SharedValue<number> } | null;
  showNumerals?: 'none' | 'quarters' | 'all';
  /** The face warms by day and deepens by night, with a sun or a moon in a window at six. */
  dayNight?: boolean;
  accent?: string;
  /** Hands jump to whole steps of this many minutes instead of sweeping (reduced motion). */
  snapTo?: number;
  scheme?: Scheme;
  style?: StyleProp<ViewStyle>;
};

const LOOK = {
  light: {
    face: '#F6F5F2',
    faceDay: '#FBF3E6',
    faceNight: '#E6E8F1',
    rim: 'rgba(20, 20, 30, 0.07)',
    edge: 'rgba(20, 20, 30, 0.07)',
    tick5: '#2A2A33',
    tick1: '#B9B8C0',
    numeral: '#2A2A33',
    hour: '#15151C',
    minute: '#3A3A46',
    shadow: 'rgba(20, 20, 30, 0.28)',
    track: 'rgba(20, 20, 30, 0.05)',
    handle: '#FFFFFF',
    glow: 0,
  },
  dark: {
    face: '#1C1C22',
    faceDay: '#24211C',
    faceNight: '#191B26',
    rim: 'rgba(255, 255, 255, 0.07)',
    edge: 'rgba(0, 0, 0, 0.35)',
    tick5: '#E6E6EC',
    tick1: '#4A4A55',
    numeral: '#E6E6EC',
    hour: '#FFFFFF',
    minute: '#CFCFD8',
    shadow: 'rgba(0, 0, 0, 0.55)',
    track: 'rgba(255, 255, 255, 0.06)',
    handle: '#FFFFFF',
    glow: 1,
  },
} as const;

// Numerals drawn as single strokes in a 6 × 10 box: no font needed (Skia on the web has none).
const DIGITS: Record<string, { d: string; w: number }> = {
  '0': { d: 'M3 0.4C4.6 0.4 5.6 2 5.6 5.1C5.6 8.2 4.6 9.8 3 9.8C1.4 9.8 0.4 8.2 0.4 5.1C0.4 2 1.4 0.4 3 0.4Z', w: 6 },
  '1': { d: 'M0.4 2.2L2.2 0.6V9.8', w: 3.4 },
  '2': { d: 'M0.6 2.6C0.9 1.2 1.9 0.4 3.1 0.4C4.6 0.4 5.6 1.4 5.6 2.8C5.6 4.2 4.6 5.1 3.3 6.2L0.6 9.6H5.8', w: 6.2 },
  '3': { d: 'M0.8 1.2C1.4 0.6 2.2 0.4 3 0.4C4.5 0.4 5.4 1.3 5.4 2.6C5.4 3.9 4.4 4.8 2.9 4.8C4.6 4.8 5.6 5.8 5.6 7.3C5.6 8.8 4.5 9.8 3 9.8C1.9 9.8 1 9.3 0.5 8.6', w: 6.1 },
  '4': { d: 'M4.4 9.8V0.4L0.4 6.8H5.8', w: 6.2 },
  '5': { d: 'M5.2 0.6H1.2L0.8 4.6C1.4 4.1 2.2 3.9 3 3.9C4.6 3.9 5.6 5 5.6 6.8C5.6 8.6 4.5 9.8 2.9 9.8C1.8 9.8 1 9.3 0.5 8.6', w: 6.1 },
  '6': { d: 'M4.8 0.8C4.3 0.5 3.7 0.4 3.2 0.4C1.6 0.4 0.6 2 0.6 5C0.6 8.2 1.6 9.8 3.1 9.8C4.6 9.8 5.6 8.6 5.6 6.9C5.6 5.2 4.6 4.1 3.2 4.1C2 4.1 1 4.8 0.6 5.8', w: 6.1 },
  '7': { d: 'M0.4 0.6H5.6L2.2 9.8', w: 6 },
  '8': { d: 'M3 4.8C1.7 4.8 0.8 4 0.8 2.6C0.8 1.3 1.7 0.4 3 0.4C4.3 0.4 5.2 1.3 5.2 2.6C5.2 4 4.3 4.8 3 4.8ZM3 4.8C4.5 4.8 5.6 5.8 5.6 7.3C5.6 8.8 4.5 9.8 3 9.8C1.5 9.8 0.4 8.8 0.4 7.3C0.4 5.8 1.5 4.8 3 4.8Z', w: 6 },
  '9': { d: 'M1.2 9.4C1.7 9.7 2.3 9.8 2.8 9.8C4.4 9.8 5.4 8.2 5.4 5.2C5.4 2 4.4 0.4 2.9 0.4C1.4 0.4 0.4 1.6 0.4 3.3C0.4 5 1.4 6.1 2.8 6.1C4 6.1 5 5.4 5.4 4.4', w: 6 },
};

/** A numeral as one path, centred on (cx, cy), `height` tall. */
function numeral(text: string, cx: number, cy: number, height: number): SkPath {
  const scale = height / 10;
  const gap = 1.1;
  const width = [...text].reduce((sum, ch) => sum + DIGITS[ch].w, 0) + gap * (text.length - 1);
  let x = cx - (width * scale) / 2;
  const out = Skia.Path.Make();
  for (const ch of text) {
    const glyph = Skia.Path.MakeFromSVGString(DIGITS[ch].d);
    if (glyph) {
      const m = Skia.Matrix();
      m.translate(x, cy - height / 2);
      m.scale(scale, scale);
      glyph.transform(m);
      out.addPath(glyph);
    }
    x += (DIGITS[ch].w + gap) * scale;
  }
  return out;
}

/** A crescent moon, centred on the origin. */
function crescent(r: number): SkPath {
  const full = Skia.Path.Make();
  full.addCircle(0, 0, r);
  const bite = Skia.Path.Make();
  bite.addCircle(r * 0.5, -r * 0.3, r * 0.86);
  return Skia.Path.MakeFromOp(full, bite, 1 /* difference */) ?? full;
}

function smoothstep(a: number, b: number, x: number) {
  'worklet';
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** How much of the day it is, 0 (night) to 1 (day), with soft dawns and dusks. */
function daylight(minutes: number) {
  'worklet';
  const t = ((minutes % 1440) + 1440) % 1440;
  return smoothstep(300, 420, t) - smoothstep(1020, 1170, t);
}

/**
 * An analog clock drawn with Skia. Its face (ticks, numerals) is drawn once into a picture; each frame only the
 * hands, the range and the day/night tint change.
 */
export function AnalogClock({
  minutes,
  size = 220,
  range = null,
  showNumerals = 'quarters',
  dayNight = false,
  accent = '#FF7A1A',
  snapTo = 0,
  scheme: schemeProp,
  style,
}: AnalogClockProps) {
  const scheme = useScheme(schemeProp);
  const look = LOOK[scheme];
  const pad = Math.max(6, size * 0.04);
  const box = size + pad * 2;
  const c = box / 2;
  const R = size / 2;

  // The face's fixed parts: drawn once.
  const face = useMemo(() => {
    const rect = Skia.XYWHRect(0, 0, box, box);
    return createPicture((canvas) => {
      const paint = Skia.Paint();
      paint.setAntiAlias(true);
      paint.setStyle(1);
      paint.setStrokeCap(1);
      for (let i = 0; i < 60; i += 1) {
        const five = i % 5 === 0;
        const a = (i / 60) * Math.PI * 2;
        const outer = R * 0.92;
        const inner = outer - R * (five ? 0.1 : 0.05);
        paint.setColor(Skia.Color(five ? look.tick5 : look.tick1));
        paint.setStrokeWidth(five ? Math.max(1.4, size * 0.008) : Math.max(1, size * 0.005));
        canvas.drawLine(c + Math.sin(a) * inner, c - Math.cos(a) * inner, c + Math.sin(a) * outer, c - Math.cos(a) * outer, paint);
      }
      if (showNumerals !== 'none') {
        const height = Math.max(7, R * 0.14);
        const ring = R * 0.68;
        const hours = showNumerals === 'all' ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : [12, 3, 6, 9];
        const numerals = Skia.Path.Make();
        for (const h of hours) {
          if (dayNight && h === 6) continue; // the window sits at six
          const a = ((h % 12) / 12) * Math.PI * 2;
          numerals.addPath(numeral(String(h), c + Math.sin(a) * ring, c - Math.cos(a) * ring, height));
        }
        const ink = Skia.Paint();
        ink.setAntiAlias(true);
        ink.setStyle(1);
        ink.setStrokeCap(1);
        ink.setStrokeJoin(1);
        ink.setStrokeWidth(Math.max(1.1, height * 0.13));
        ink.setColor(Skia.Color(look.numeral));
        canvas.drawPath(numerals, ink);
      }
    }, rect);
  }, [box, c, R, size, look, showNumerals, dayNight]);

  const moon = useMemo(() => crescent(R * 0.065), [R]);
  const windowPath = useMemo(() => {
    const p = Skia.Path.Make();
    const wr = R * 0.27;
    const wy = c + R * 0.5;
    p.addArc(Skia.XYWHRect(c - wr, wy - wr, wr * 2, wr * 2), 180, 180);
    p.close();
    return p;
  }, [R, c]);

  // Hands: unbounded minutes, so crossing midnight turns them forwards.
  const shown = useDerivedValue(() => (snapTo > 0 ? Math.round(minutes.value / snapTo) * snapTo : minutes.value));
  const hourTurn = useDerivedValue(() => [{ rotate: (shown.value / 720) * Math.PI * 2 }]);
  const minuteTurn = useDerivedValue(() => [{ rotate: (shown.value / 60) * Math.PI * 2 }]);

  const day = useDerivedValue(() => (dayNight ? daylight(shown.value) : 0.5));
  const faceColor = useDerivedValue(() =>
    dayNight ? interpolateColor(day.value, [0, 1], [look.faceNight, look.faceDay]) : look.face,
  );
  const sky = useDerivedValue(() => [
    interpolateColor(day.value, [0, 1], ['#1A2350', '#8FCBFF']),
    interpolateColor(day.value, [0, 1], ['#3A3F7C', '#FFE2AE']),
  ]);
  // The sun crosses the window from 6:00 to 18:00, the moon from 18:00 to 6:00.
  const body = useDerivedValue(() => {
    const t = ((shown.value % 1440) + 1440) % 1440;
    const sunUp = t >= 360 && t < 1080;
    const p = sunUp ? (t - 360) / 720 : ((t - 1080 + 1440) % 1440) / 720;
    const phi = Math.PI * (1 - p);
    const wr = R * 0.27 * 0.72;
    return { x: c + Math.cos(phi) * wr, y: c + R * 0.5 - Math.sin(phi) * wr, sun: sunUp };
  });
  const sunX = useDerivedValue(() => body.value.x);
  const sunY = useDerivedValue(() => body.value.y);
  const sunOpacity = useDerivedValue(() => (body.value.sun ? 1 : 0));
  const moonOpacity = useDerivedValue(() => (body.value.sun ? 0 : 1));
  const moonMove = useDerivedValue(() => [{ translateX: body.value.x }, { translateY: body.value.y }]);

  // The booked span, along the ring, in hour-hand angles.
  const ringR = R * 0.84;
  const arc = useDerivedValue(() => {
    const p = Skia.Path.Make();
    if (!range) return p;
    const start = range.start.value;
    const sweep = Math.min(359.5, Math.max(0.5, ((range.end.value - start) / 720) * 360));
    p.addArc(Skia.XYWHRect(c - ringR, c - ringR, ringR * 2, ringR * 2), -90 + ((((start % 720) + 720) % 720) / 720) * 360, sweep);
    return p;
  });
  const arcTurn = useDerivedValue(() => {
    if (!range) return [{ rotate: 0 }];
    return [{ rotate: ((((range.start.value % 720) + 720) % 720) / 720) * Math.PI * 2 - Math.PI / 2 }];
  });
  const arcSweep = useDerivedValue(() => (range ? Math.min(359.5, Math.max(1, ((range.end.value - range.start.value) / 720) * 360)) : 1));
  const startX = useDerivedValue(() => (range ? c + Math.sin((range.start.value / 720) * Math.PI * 2) * ringR : -100));
  const startY = useDerivedValue(() => (range ? c - Math.cos((range.start.value / 720) * Math.PI * 2) * ringR : -100));
  const endX = useDerivedValue(() => (range ? c + Math.sin((range.end.value / 720) * Math.PI * 2) * ringR : -100));
  const endY = useDerivedValue(() => (range ? c - Math.cos((range.end.value / 720) * Math.PI * 2) * ringR : -100));
  const hourHand = useMemo(() => hand(c, R, 0.1, 0.5), [c, R]);
  const minuteHand = useMemo(() => hand(c, R, 0.13, 0.78), [c, R]);

  const tint = lighten(accent, 0.45);
  const handW = Math.max(3, size * 0.019);
  const minuteW = Math.max(2, size * 0.012);
  const cap = Math.max(3.5, size * 0.024);
  const shadowBlur = Math.max(1.2, size * 0.01);

  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={[{ width: box, height: box }, style]}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Circle cx={c} cy={c} r={R} color={faceColor}>
          <Shadow dx={0} dy={size * 0.02} blur={size * 0.035} color={look.edge} />
        </Circle>
        <Circle cx={c} cy={c} r={R}>
          <RadialGradient c={vec(c, c)} r={R} colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0)', look.edge]} positions={[0, 0.82, 1]} />
        </Circle>
        <Circle cx={c} cy={c} r={R - 0.5} style="stroke" strokeWidth={1} color={look.rim} />

        {dayNight ? (
          <Group clip={windowPath}>
            <Rect x={c - R * 0.3} y={c + R * 0.2} width={R * 0.6} height={R * 0.32}>
              <LinearGradient start={vec(0, c + R * 0.23)} end={vec(0, c + R * 0.5)} colors={sky} />
            </Rect>
            <Group opacity={sunOpacity}>
              <Circle cx={sunX} cy={sunY} r={R * 0.11} color="rgba(255, 200, 90, 0.35)">
                <BlurMask blur={R * 0.04} style="normal" />
              </Circle>
              <Circle cx={sunX} cy={sunY} r={R * 0.055} color="#FFC94D" />
            </Group>
            <Group opacity={moonOpacity} transform={moonMove}>
              <Path path={moon} color="#F3EFD8" />
            </Group>
          </Group>
        ) : null}
        {dayNight ? <Path path={windowPath} style="stroke" strokeWidth={1} color={look.rim} /> : null}

        <Picture picture={face} />

        {range ? (
          <Group>
            <Circle cx={c} cy={c} r={ringR} style="stroke" strokeWidth={size * 0.045} color={look.track} />
            <Path path={arc} style="stroke" strokeWidth={size * 0.045} strokeCap="round">
              <SweepGradient c={vec(c, c)} colors={[withAlpha(accent, 0.85), withAlpha(tint, 0.85), withAlpha(accent, 0.85)]} start={0} end={arcSweep} transform={arcTurn} origin={vec(c, c)} />
            </Path>
            <Group layer={<Paint><Shadow dx={0} dy={1} blur={2.5} color={look.shadow} /></Paint>}>
              <Circle cx={startX} cy={startY} r={size * 0.03} color={look.handle} />
              <Circle cx={endX} cy={endY} r={size * 0.03} color={look.handle} />
            </Group>
          </Group>
        ) : null}

        <Group layer={<Paint><Shadow dx={0} dy={size * 0.008} blur={shadowBlur} color={look.shadow} /></Paint>}>
          <Group transform={hourTurn} origin={vec(c, c)}>
            <Path path={hourHand} style="stroke" strokeWidth={handW} strokeCap="round" color={look.hour} />
          </Group>
          <Group transform={minuteTurn} origin={vec(c, c)}>
            <Path path={minuteHand} style="stroke" strokeWidth={minuteW} strokeCap="round" color={look.minute} />
          </Group>
        </Group>
        {look.glow ? (
          <Circle cx={c} cy={c} r={cap * 2.2} color={withAlpha(accent, 0.35)}>
            <BlurMask blur={cap * 1.4} style="normal" />
          </Circle>
        ) : null}
        <Circle cx={c} cy={c} r={cap} color={accent} />
        <Circle cx={c} cy={c} r={cap * 0.38} color={look.face} />
      </Canvas>
    </View>
  );
}

/** A hand pointing at 12: from a short tail below the centre to its tip. */
function hand(c: number, R: number, tail: number, length: number) {
  const p = Skia.Path.Make();
  p.moveTo(c, c + R * tail);
  p.lineTo(c, c - R * length);
  return p;
}

function withAlpha(hex: string, alpha: number) {
  const v = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(v >> 16) & 255}, ${(v >> 8) & 255}, ${v & 255}, ${alpha})`;
}

/** A #RRGGBB colour mixed towards white. */
export function lighten(hex: string, amount: number) {
  const v = parseInt(hex.slice(1, 7), 16);
  const mix = (ch: number) => Math.round(ch + (255 - ch) * amount);
  const r = mix((v >> 16) & 255);
  const g = mix((v >> 8) & 255);
  const b = mix(v & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
