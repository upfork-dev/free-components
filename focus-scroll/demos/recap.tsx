import {
  Circle,
  Group,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  RoundedRect,
  Skia,
  vec,
  type SkTypefaceFontProvider,
} from '@shopify/react-native-skia';
import { useMemo, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path as SvgPath } from 'react-native-svg';

import { FocusParagraph, FocusScroll, useFocusFont, type FocusScrollHandle } from '../components/focus-scroll';
import type { Scheme } from '../lib/use-scheme';

type Card = {
  key: string;
  kicker: string;
  big: string;
  caption: string;
  colors: [string, string];
  art: 'sun' | 'map' | 'clock' | 'trail' | 'streak' | 'stars';
};

const CARDS: Card[] = [
  { key: 'outside', kicker: 'Time outside', big: '142 hours', caption: 'under open sky. Your best month was June.', colors: ['#FF9A4A', '#F2546B'], art: 'sun' },
  { key: 'places', kicker: 'New places', big: '38', caption: 'places you had never been. Nine of them by train.', colors: ['#19B9B0', '#2F5BEA'], art: 'map' },
  { key: 'hour', kicker: 'Your hour', big: '6 a.m.', caption: 'was when you moved most. Early, every time.', colors: ['#6C5CE7', '#2A1F7A'], art: 'clock' },
  { key: 'distance', kicker: 'On foot', big: '1,204 km', caption: 'walked and run. About a marathon a fortnight.', colors: ['#3CC27A', '#137A5B'], art: 'trail' },
  { key: 'streak', kicker: 'Longest streak', big: '41 days', caption: 'in a row, from late March into May.', colors: ['#FF6FA6', '#FF8A3D'], art: 'streak' },
  { key: 'thanks', kicker: 'That was 2026', big: 'Thank you', caption: 'for a year in motion. See you out there.', colors: ['#1F2A5C', '#0B1030'], art: 'stars' },
];

const COLORS = {
  dark: { page: '#09090D', ink: '#F4F4F7', muted: 'rgba(244, 244, 247, 0.6)', dot: 'rgba(244, 244, 247, 0.22)', chip: 'rgba(244, 244, 247, 0.1)' },
  light: { page: '#F3F0EA', ink: '#16141C', muted: 'rgba(22, 20, 28, 0.58)', dot: 'rgba(22, 20, 28, 0.18)', chip: 'rgba(22, 20, 28, 0.07)' },
} as const;

const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;

/** A year-in-review story: tall cards that snap one by one, the next soft and tilted beneath. */
function RecapScreen({ scheme = 'dark' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const insets = useSafeAreaInsets();
  const fonts = useFocusFont();
  const list = useRef<FocusScrollHandle>(null);
  const focus = useSharedValue(0);

  return (
    <View style={[styles.page, { backgroundColor: c.page }]}>
      <View style={[styles.header, { paddingTop: insets.top + 18 }]}>
        <View style={styles.fill}>
          <Text style={[styles.kicker, { color: c.muted }]}>Your 2026</Text>
          <Text style={[styles.title, { color: c.ink }]}>A year in motion</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share"
          style={({ pressed }) => [styles.share, { backgroundColor: c.chip, opacity: pressed ? 0.7 : 1 }, webPointer]}>
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <SvgPath d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" stroke={c.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
          <Text style={[styles.shareText, { color: c.ink }]}>Share</Text>
        </Pressable>
      </View>

      <View style={styles.cards}>
        {fonts ? (
          <FocusScroll
            ref={list}
            data={CARDS}
            keyExtractor={(card) => card.key}
            getItemHeight={(_, __, width) => cardHeight(width) + 22}
            focalPoint={0.45}
            edgeFade={40}
            focusProgress={focus}
            depth={{ blur: 10, scale: 0.86, opacity: 0.55, tilt: 12, spread: 1.2 }}
            accessibilityLabelForItem={(card) => `${card.kicker}: ${card.big}, ${card.caption}`}
            renderItem={({ item, width }) => <StoryCard card={item} width={width} fonts={fonts} />}
          />
        ) : null}
        <Dots count={CARDS.length} focus={focus} color={c.ink} dim={c.dot} />
      </View>

      <Text style={[styles.hint, { color: c.muted, paddingBottom: insets.bottom + 18 }]}>Scroll through your year</Text>
    </View>
  );
}

function cardHeight(width: number) {
  return Math.min(Math.round((width - 48) * 1.18), 430);
}

function StoryCard({ card, width, fonts }: { card: Card; width: number; fonts: SkTypefaceFontProvider }) {
  const w = width - 48;
  const h = cardHeight(width);
  const x = 24;
  const y = 11;
  return (
    <Group>
      <RoundedRect x={x} y={y} width={w} height={h} r={30}>
        <LinearGradient start={vec(x, y)} end={vec(x + w, y + h)} colors={card.colors} />
      </RoundedRect>
      <RoundedRect x={x} y={y} width={w} height={h} r={30}>
        <RadialGradient c={vec(x + w * 0.85, y + h * 0.1)} r={w * 0.9} colors={['rgba(255, 255, 255, 0.22)', 'rgba(255, 255, 255, 0)']} />
      </RoundedRect>
      <Group clip={Skia.RRectXY(Skia.XYWHRect(x, y, w, h), 30, 30)}>
        <Art kind={card.art} x={x} y={y} w={w} h={h} />
      </Group>
      <FocusParagraph text={card.kicker.toUpperCase()} fonts={fonts} width={w - 56} x={x + 28} y={y + h - 196} fontSize={13} weight={600} letterSpacing={1.6} color="rgba(255, 255, 255, 0.78)" />
      <FocusParagraph text={card.big} fonts={fonts} width={w - 56} x={x + 28} y={y + h - 170} fontSize={card.big.length > 7 ? 52 : 62} weight={700} letterSpacing={-1.6} lineHeight={1.05} color="#FFFFFF" />
      <FocusParagraph text={card.caption} fonts={fonts} width={w - 56} x={x + 28} y={y + h - 92} fontSize={18} weight={500} lineHeight={1.3} color="rgba(255, 255, 255, 0.86)" />
    </Group>
  );
}

/** Each card's illustration, drawn in the card's top half. */
function Art({ kind, x, y, w, h }: { kind: Card['art']; x: number; y: number; w: number; h: number }) {
  const cx = x + w * 0.68;
  const cy = y + h * 0.27;
  const path = useMemo(() => artPath(kind, x, y, w, h), [kind, x, y, w, h]);
  switch (kind) {
    case 'sun':
      return (
        <Group>
          {[0.95, 0.72, 0.5].map((k, i) => (
            <Circle key={i} cx={cx} cy={cy} r={w * 0.26 * k} color="#FFFFFF" opacity={0.1 + i * 0.08} />
          ))}
          <Circle cx={cx} cy={cy} r={w * 0.11} color="#FFF4DD" />
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return (
              <Line
                key={i}
                p1={vec(cx + Math.cos(a) * w * 0.15, cy + Math.sin(a) * w * 0.15)}
                p2={vec(cx + Math.cos(a) * w * 0.19, cy + Math.sin(a) * w * 0.19)}
                color="#FFF4DD"
                strokeWidth={3}
                strokeCap="round"
                opacity={0.8}
              />
            );
          })}
        </Group>
      );
    case 'map':
      return (
        <Group>
          <Path path={path} style="stroke" strokeWidth={3} color="rgba(255, 255, 255, 0.75)" strokeCap="round" strokeJoin="round" />
          {[0.18, 0.42, 0.63, 0.86].map((t, i) => {
            const px = x + w * (0.14 + t * 0.72);
            const py = y + h * (0.36 - Math.sin(t * 5) * 0.09);
            return (
              <Group key={i}>
                <Circle cx={px} cy={py} r={9} color="#FFFFFF" />
                <Circle cx={px} cy={py} r={4} color="rgba(30, 80, 200, 0.9)" />
              </Group>
            );
          })}
        </Group>
      );
    case 'clock':
      return (
        <Group>
          <Circle cx={cx} cy={cy} r={w * 0.2} style="stroke" strokeWidth={2} color="rgba(255, 255, 255, 0.5)" />
          <Circle cx={cx} cy={cy} r={w * 0.26} style="stroke" strokeWidth={1} color="rgba(255, 255, 255, 0.22)" />
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return <Circle key={i} cx={cx + Math.cos(a) * w * 0.17} cy={cy + Math.sin(a) * w * 0.17} r={i % 3 === 0 ? 3 : 1.6} color="#FFFFFF" opacity={0.8} />;
          })}
          <Line p1={vec(cx, cy)} p2={vec(cx, cy + w * 0.13)} color="#FFFFFF" strokeWidth={5} strokeCap="round" />
          <Line p1={vec(cx, cy)} p2={vec(cx, cy - w * 0.16)} color="#FFE7A8" strokeWidth={3} strokeCap="round" />
          <Circle cx={cx} cy={cy} r={6} color="#FFFFFF" />
        </Group>
      );
    case 'trail':
      return (
        <Group>
          <Path path={path} style="stroke" strokeWidth={14} color="rgba(255, 255, 255, 0.14)" strokeCap="round" strokeJoin="round" />
          <Path path={path} style="stroke" strokeWidth={3.5} color="#FFFFFF" strokeCap="round" strokeJoin="round" />
          <Circle cx={x + w * 0.86} cy={y + h * 0.14} r={8} color="#FFFFFF" />
        </Group>
      );
    case 'streak':
      return (
        <Group>
          {Array.from({ length: 10 }, (_, i) => {
            const bh = h * (0.1 + ((i * 37) % 23) / 70 + i * 0.012);
            return (
              <RoundedRect
                key={i}
                x={x + w * 0.14 + i * (w * 0.072)}
                y={y + h * 0.5 - bh}
                width={w * 0.044}
                height={bh}
                r={w * 0.022}
                color="#FFFFFF"
                opacity={0.35 + i * 0.06}
              />
            );
          })}
        </Group>
      );
    case 'stars':
      return (
        <Group>
          <Rect x={x} y={y} width={w} height={h * 0.6} opacity={0.5}>
            <RadialGradient c={vec(cx, cy)} r={w * 0.5} colors={['rgba(120, 140, 255, 0.55)', 'rgba(120, 140, 255, 0)']} />
          </Rect>
          {Array.from({ length: 34 }, (_, i) => {
            const sx = x + ((i * 97) % 100) / 100 * w;
            const sy = y + ((i * 61) % 100) / 100 * h * 0.55 + 14;
            return <Circle key={i} cx={sx} cy={sy} r={i % 5 === 0 ? 2.2 : 1.1} color="#FFFFFF" opacity={0.35 + ((i * 13) % 10) / 16} />;
          })}
          <Circle cx={cx} cy={cy} r={w * 0.09} color="#F4F1FF" />
          <Circle cx={cx + w * 0.04} cy={cy - w * 0.02} r={w * 0.085} color="#1F2A5C" />
        </Group>
      );
  }
}

function artPath(kind: Card['art'], x: number, y: number, w: number, h: number) {
  const path = Skia.Path.Make();
  if (kind === 'map') {
    path.moveTo(x + w * 0.1, y + h * 0.4);
    for (let t = 0; t <= 1.001; t += 0.05) {
      path.lineTo(x + w * (0.14 + t * 0.72), y + h * (0.36 - Math.sin(t * 5) * 0.09));
    }
  } else if (kind === 'trail') {
    path.moveTo(x + w * 0.12, y + h * 0.48);
    path.cubicTo(x + w * 0.3, y + h * 0.5, x + w * 0.24, y + h * 0.22, x + w * 0.46, y + h * 0.28);
    path.cubicTo(x + w * 0.66, y + h * 0.33, x + w * 0.6, y + h * 0.1, x + w * 0.86, y + h * 0.14);
  }
  return path;
}

function Dots({ count, focus, color, dim }: { count: number; focus: SharedValue<number>; color: string; dim: string }) {
  return (
    <View pointerEvents="none" style={styles.dots}>
      {Array.from({ length: count }, (_, i) => (
        <Dot key={i} index={i} focus={focus} color={color} dim={dim} />
      ))}
    </View>
  );
}

function Dot({ index, focus, color, dim }: { index: number; focus: SharedValue<number>; color: string; dim: string }) {
  const style = useAnimatedStyle(() => {
    const near = Math.max(0, 1 - Math.abs(focus.value - index));
    return { height: 6 + near * 14, opacity: 0.35 + near * 0.65 };
  });
  return <Animated.View style={[styles.dot, { backgroundColor: color, borderColor: dim }, style]} />;
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 24, paddingBottom: 6 },
  kicker: { fontSize: 13, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8, marginTop: 4 },
  share: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 18 },
  shareText: { fontSize: 14, fontWeight: '600' },
  cards: { flex: 1 },
  dots: { position: 'absolute', right: 8, top: 0, bottom: 0, justifyContent: 'center', gap: 6 },
  dot: { width: 4, borderRadius: 2 },
  hint: { textAlign: 'center', fontSize: 13, fontWeight: '500', paddingTop: 6 },
});

/** The demo with a safe-area provider of its own, so it runs anywhere (UpFork's preview gives it none). */
export default function Recap({ scheme }: { scheme?: Scheme }) {
  return (
    <SafeAreaProvider>
      <RecapScreen scheme={scheme} />
    </SafeAreaProvider>
  );
}
