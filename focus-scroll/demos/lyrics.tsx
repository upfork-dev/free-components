import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  Line,
  LinearGradient,
  RadialGradient,
  Rect,
  RoundedRect,
  vec,
  type SkParagraph,
} from '@shopify/react-native-skia';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import {
  FocusParagraph,
  FocusScroll,
  buildParagraph,
  useAutoAdvance,
  useFocusFont,
  withAlpha,
  type FocusScrollHandle,
} from '../components/focus-scroll';
import type { Scheme } from '../lib/use-scheme';

// Written for this demo: an original song.
const LYRICS = [
  'We folded our wishes in paper and light',
  'And carried them down to the river tonight',
  "Your hands were the warmest thing I'd ever known",
  'A small flame of amber, a heart of its own',
  'Let them rise, let them rise',
  'Little moons on a string',
  "Every word that we couldn't say",
  'Is a lantern taking wing',
  'The city went quiet, the water stood still',
  'The bridge held its breath on the side of the hill',
  'You wrote down a name that you never said loud',
  'And watched it grow smaller and blend with the cloud',
  'Let them rise, let them rise',
  'Over rooftops and rain',
  "Every promise we couldn't keep",
  'Finds its way home again',
  'And if I forget how the evening began',
  "I'll follow the glow that you held in your hand",
  'Not every goodbye has to fall like a stone',
  'Some float like a lantern and light up the road',
  'So let them rise, let them rise',
  'Till the dark wears a crown',
  'Every lantern we let go of',
  'Is a star looking down',
];

const DURATIONS = LYRICS.map((line) => Math.round(1500 + line.length * 52));

const COLORS = {
  dark: {
    ink: '#F5F1FF',
    muted: 'rgba(245, 241, 255, 0.62)',
    faint: 'rgba(245, 241, 255, 0.16)',
    top: ['#2B1240', '#1E1031'],
    bottom: '#0C0916',
    glowA: ['#FF9A55', '#FF6F7D'],
    glowB: ['#9B4DDB', '#4F6BFF'],
    glowOpacity: 0.55,
    button: '#F5F1FF',
    onButton: '#1A0F2A',
    pill: 'rgba(245, 241, 255, 0.14)',
    pillLine: 'rgba(245, 241, 255, 0.18)',
  },
  light: {
    ink: '#1B1530',
    muted: 'rgba(27, 21, 48, 0.6)',
    faint: 'rgba(27, 21, 48, 0.12)',
    top: ['#FCF4EA', '#F7EBDD'],
    bottom: '#EFE1D0',
    glowA: ['#FFB27D', '#FF9DB0'],
    glowB: ['#E7A6E0', '#A9B6FF'],
    glowOpacity: 0.5,
    button: '#1B1530',
    onButton: '#FCF4EA',
    pill: 'rgba(27, 21, 48, 0.08)',
    pillLine: 'rgba(27, 21, 48, 0.12)',
  },
} as const;

function rgb(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function glowStops(from: [number, number, number], to: [number, number, number], t: number) {
  'worklet';
  const r = Math.round(from[0] + (to[0] - from[0]) * t);
  const g = Math.round(from[1] + (to[1] - from[1]) * t);
  const b = Math.round(from[2] + (to[2] - from[2]) * t);
  return [`rgba(${r}, ${g}, ${b}, 1)`, `rgba(${r}, ${g}, ${b}, 0.35)`, `rgba(${r}, ${g}, ${b}, 0)`];
}

const SIDE = 28;
const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;

/** A now-playing screen whose lyrics are in focus one line at a time, with a karaoke fill. */
function LyricsScreen({ scheme = 'dark' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const insets = useSafeAreaInsets();
  const fonts = useFocusFont();
  const list = useRef<FocusScrollHandle>(null);
  const [playing, setPlaying] = useState(true);
  const [following, setFollowing] = useState(true);

  const timeline = useAutoAdvance(list, {
    durations: DURATIONS,
    playing,
    following,
    loop: true,
    startIndex: 4,
    startProgress: 0.42,
  });

  // Paragraphs are built once per width, for measuring and drawing.
  const cache = useRef(new Map<string, SkParagraph>());
  const lineStyle = useMemo(
    () => ({ fontSize: 27, weight: 700 as const, lineHeight: 1.16, letterSpacing: -0.4 }),
    [],
  );
  const getItemHeight = useCallback(
    (line: string, index: number, width: number) => {
      if (!fonts) return 60;
      const key = `${index}:${width}`;
      let paragraph = cache.current.get(key);
      if (!paragraph) {
        paragraph = buildParagraph(fonts, line, width - SIDE * 2, lineStyle);
        cache.current.set(key, paragraph);
      }
      return paragraph.getHeight() + 24;
    },
    [fonts, lineStyle],
  );

  const backToNow = () => {
    setFollowing(true);
    list.current?.scrollToIndex(timeline.index);
  };

  return (
    <View style={[styles.page, { backgroundColor: c.bottom }]}>
      <Backdrop scheme={scheme} elapsed={timeline.elapsed} total={timeline.total} />

      <View style={[styles.header, { paddingTop: insets.top + 18 }]}>
        <Cover size={58} />
        <View style={styles.titles}>
          <Text style={[styles.song, { color: c.ink }]} numberOfLines={1}>
            Paper Lanterns
          </Text>
          <Text style={[styles.artist, { color: c.muted }]} numberOfLines={1}>
            Mira Vale · Lights Over Water
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="More" hitSlop={10} style={[styles.more, webPointer]}>
          <Svg width={22} height={22} viewBox="0 0 24 24">
            <Path d="M5 12h.01M12 12h.01M19 12h.01" stroke={c.muted} strokeWidth={3} strokeLinecap="round" />
          </Svg>
        </Pressable>
      </View>

      <Progress scheme={scheme} elapsed={timeline.elapsed} total={timeline.total} playing={playing} />

      <View style={styles.lyrics}>
        {fonts ? (
          <FocusScroll
            ref={list}
            data={LYRICS}
            keyExtractor={(_, index) => String(index)}
            getItemHeight={getItemHeight}
            initialIndex={4}
            focalPoint={0.4}
            edgeFade={64}
            depth={{ blur: 9, scale: 0.94, opacity: 0.4, tilt: 4, spread: 2.4 }}
            accessibilityLabelForItem={(line) => line}
            onUserScroll={() => setFollowing(false)}
            onItemPress={(_, index) => {
              timeline.seek(index);
              setFollowing(true);
            }}
            renderItem={({ item, index, width }) => (
              <FocusParagraph
                text={item}
                fonts={fonts}
                width={width - SIDE * 2}
                x={SIDE}
                y={12}
                color={c.ink}
                dimColor={withAlpha(c.ink, scheme === 'dark' ? 0.34 : 0.3)}
                progress={index < timeline.index ? 1 : index === timeline.index ? timeline.progress : 0}
                {...lineStyle}
              />
            )}
          />
        ) : null}
      </View>

      <View style={[styles.controls, { paddingBottom: insets.bottom + 26 }]}>
        <BackToNow visible={!following} scheme={scheme} onPress={backToNow} />
        <View style={styles.buttons}>
          <RoundButton label="Previous line" onPress={() => timeline.seek(Math.max(timeline.index - 1, 0))}>
            <Svg width={30} height={30} viewBox="0 0 24 24">
              <Path d="M19 6.5v11a.8.8 0 0 1-1.25.66L10 12.66a.8.8 0 0 1 0-1.32l7.75-5.5A.8.8 0 0 1 19 6.5Z" fill={c.ink} />
              <Path d="M6 6v12" stroke={c.ink} strokeWidth={2.4} strokeLinecap="round" />
            </Svg>
          </RoundButton>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={playing ? 'Pause' : 'Play'}
            onPress={() => setPlaying((value) => !value)}
            style={({ pressed }) => [
              styles.play,
              { backgroundColor: c.button, transform: [{ scale: pressed ? 0.94 : 1 }] },
              webPointer,
            ]}>
            <Svg width={30} height={30} viewBox="0 0 24 24">
              {playing ? (
                <Path d="M8 5.5v13M16 5.5v13" stroke={c.onButton} strokeWidth={3.4} strokeLinecap="round" />
              ) : (
                <Path d="M8.5 5.6v12.8a.9.9 0 0 0 1.37.77l10.2-6.4a.9.9 0 0 0 0-1.54l-10.2-6.4A.9.9 0 0 0 8.5 5.6Z" fill={c.onButton} />
              )}
            </Svg>
          </Pressable>
          <RoundButton label="Next line" onPress={() => timeline.seek(Math.min(timeline.index + 1, LYRICS.length - 1))}>
            <Svg width={30} height={30} viewBox="0 0 24 24">
              <Path d="M5 6.5v11a.8.8 0 0 0 1.25.66L14 12.66a.8.8 0 0 0 0-1.32l-7.75-5.5A.8.8 0 0 0 5 6.5Z" fill={c.ink} />
              <Path d="M18 6v12" stroke={c.ink} strokeWidth={2.4} strokeLinecap="round" />
            </Svg>
          </RoundButton>
        </View>
      </View>
    </View>
  );
}

/** A deep gradient with two soft glows whose colours drift as the song goes on. */
function Backdrop({ scheme, elapsed, total }: { scheme: Scheme; elapsed: SharedValue<number>; total: number }) {
  const c = COLORS[scheme];
  const { width, height } = useWindowDimensions();
  const a = useMemo(() => [rgb(c.glowA[0]), rgb(c.glowA[1])], [c]);
  const b = useMemo(() => [rgb(c.glowB[0]), rgb(c.glowB[1])], [c]);
  // Each glow fades to its own colour at zero alpha (not to transparent black, which would grey its edge).
  const glowA = useDerivedValue(() => {
    const mix = 0.5 - 0.5 * Math.cos(((elapsed.value / total) % 1) * Math.PI * 2);
    return glowStops(a[0], a[1], mix);
  });
  const glowB = useDerivedValue(() => {
    const mix = 0.5 - 0.5 * Math.cos(((elapsed.value / total) % 1) * Math.PI * 2 + 1.4);
    return glowStops(b[0], b[1], mix);
  });
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height} dither>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, height)}
          colors={[c.top[0], c.top[1], c.bottom]}
          positions={[0, 0.45, 1]}
        />
      </Rect>
      <Rect x={0} y={0} width={width} height={height} opacity={c.glowOpacity} dither>
        <RadialGradient c={vec(width * 0.82, height * 0.16)} r={width * 0.78} colors={glowA} />
      </Rect>
      <Rect x={0} y={0} width={width} height={height} opacity={c.glowOpacity * 0.85} dither>
        <RadialGradient c={vec(width * 0.12, height * 0.86)} r={width * 0.9} colors={glowB} />
      </Rect>
    </Canvas>
  );
}

/** The album cover, drawn: three paper lanterns glowing on a dark river. */
function Cover({ size }: { size: number }) {
  const s = size / 58;
  const lanterns = [
    { x: 17, y: 20, w: 9, h: 12 },
    { x: 33, y: 14, w: 11, h: 15 },
    { x: 42, y: 30, w: 7, h: 10 },
  ];
  return (
    <View style={[styles.cover, { width: size, height: size, borderRadius: 14 * s }]}>
      <Canvas style={{ width: size, height: size }}>
        <Group transform={[{ scale: s }]}>
          <RoundedRect x={0} y={0} width={58} height={58} r={14}>
            <LinearGradient start={vec(0, 0)} end={vec(58, 58)} colors={['#2A1B5C', '#130C2B']} />
          </RoundedRect>
          <Rect x={0} y={40} width={58} height={18} opacity={0.6}>
            <LinearGradient start={vec(0, 40)} end={vec(0, 58)} colors={['#1B2D6B', '#0B0F2A']} />
          </Rect>
          {lanterns.map((l, i) => (
            <Group key={i}>
              <Line p1={vec(l.x + l.w / 2, 0)} p2={vec(l.x + l.w / 2, l.y)} color="rgba(255, 214, 160, 0.35)" strokeWidth={0.6} />
              <Circle cx={l.x + l.w / 2} cy={l.y + l.h / 2} r={l.w * 1.3} color="#FF9A4D" opacity={0.55}>
                <BlurMask blur={6} style="normal" />
              </Circle>
              <RoundedRect x={l.x} y={l.y} width={l.w} height={l.h} r={l.w * 0.4}>
                <LinearGradient start={vec(l.x, l.y)} end={vec(l.x, l.y + l.h)} colors={['#FFE2A8', '#FF9248']} />
              </RoundedRect>
              <RoundedRect x={l.x + l.w * 0.3} y={47 + i} width={l.w * 0.4} height={3} r={1.5} color="#FFB36B" opacity={0.35} />
            </Group>
          ))}
        </Group>
      </Canvas>
    </View>
  );
}

function Progress({
  scheme,
  elapsed,
  total,
  playing,
}: {
  scheme: Scheme;
  elapsed: SharedValue<number>;
  total: number;
  playing: boolean;
}) {
  const c = COLORS[scheme];
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(elapsed.value);
    if (!playing) return;
    const timer = setInterval(() => setNow(elapsed.value), 250);
    return () => clearInterval(timer);
  }, [playing, elapsed]);
  const fill = useAnimatedStyle(() => ({ transform: [{ scaleX: Math.min(elapsed.value / total, 1) }] }));
  return (
    <View style={styles.progress}>
      <View style={[styles.track, { backgroundColor: c.faint }]}>
        <Animated.View style={[styles.fill, { backgroundColor: c.ink }, fill]} />
      </View>
      <View style={styles.times}>
        <Text style={[styles.time, { color: c.muted }]}>{clock(now)}</Text>
        <Text style={[styles.time, { color: c.muted }]}>-{clock(Math.max(total - now, 0))}</Text>
      </View>
    </View>
  );
}

function BackToNow({ visible, scheme, onPress }: { visible: boolean; scheme: Scheme; onPress: () => void }) {
  const c = COLORS[scheme];
  const style = useAnimatedStyle(() => ({
    opacity: withTiming(visible ? 1 : 0, { duration: 220 }),
    transform: [{ translateY: withTiming(visible ? 0 : 10, { duration: 260 }) }],
  }));
  return (
    <Animated.View pointerEvents={visible ? 'auto' : 'none'} style={[styles.nowWrap, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to the line being sung"
        onPress={onPress}
        style={({ pressed }) => [
          styles.now,
          { backgroundColor: c.pill, borderColor: c.pillLine, opacity: pressed ? 0.75 : 1 },
          webPointer,
        ]}>
        <Svg width={14} height={14} viewBox="0 0 24 24">
          <Path d="M12 4v13M6 11l6 6 6-6" stroke={c.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
        <Text style={[styles.nowText, { color: c.ink }]}>Back to now</Text>
      </Pressable>
    </Animated.View>
  );
}

function RoundButton({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.round, { opacity: pressed ? 0.6 : 1 }, webPointer]}>
      {children}
    </Pressable>
  );
}

function clock(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SIDE, gap: 14 },
  cover: { overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  titles: { flex: 1 },
  song: { fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
  artist: { fontSize: 14, marginTop: 3 },
  more: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  progress: { paddingHorizontal: SIDE, marginTop: 20 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2, width: '100%', transformOrigin: 'left' },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  time: { fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
  lyrics: { flex: 1, marginTop: 6 },
  controls: { alignItems: 'center', paddingTop: 8 },
  nowWrap: { position: 'absolute', top: -46 },
  now: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  nowText: { fontSize: 14, fontWeight: '600' },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: 34 },
  round: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  play: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
});

/** The demo with a safe-area provider of its own, so it runs anywhere (UpFork's preview gives it none). */
export default function Lyrics({ scheme }: { scheme?: Scheme }) {
  return (
    <SafeAreaProvider>
      <LyricsScreen scheme={scheme} />
    </SafeAreaProvider>
  );
}
