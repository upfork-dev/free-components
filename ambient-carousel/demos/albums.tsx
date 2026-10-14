import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { AmbientCarousel } from '../components/ambient-carousel';
import { ALBUMS, AlbumCover, type Album } from '../lib/album-covers';
import type { Scheme } from '../lib/use-scheme';

const COLORS = {
  dark: { stage: '#0A0A0D', ink: '#F5F5F7', sub: 'rgba(245, 245, 247, 0.65)', chip: 'rgba(255, 255, 255, 0.08)', play: '#F5F5F7', onPlay: '#0A0A0D', bar: 'rgba(24, 24, 30, 0.86)', line: 'rgba(255, 255, 255, 0.08)' },
  light: { stage: '#F6F5F2', ink: '#141418', sub: 'rgba(20, 20, 24, 0.65)', chip: 'rgba(20, 20, 24, 0.06)', play: '#141418', onPlay: '#F6F5F2', bar: 'rgba(255, 255, 255, 0.9)', line: 'rgba(20, 20, 24, 0.08)' },
} as const;

const START = 3;
const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;
const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Play turning into pause: the triangle's two halves become the two bars. */
function PlayIcon({ playing, color, size }: { playing: boolean; color: string; size: number }) {
  const t = useSharedValue(playing ? 1 : 0);
  useEffect(() => {
    t.value = withTiming(playing ? 1 : 0, { duration: 220, easing: Easing.inOut(Easing.cubic) });
  }, [playing, t]);
  const shape = (play: number[][], pause: number[][]) => () => {
    'worklet';
    const k = t.value;
    const pts = play.map((p, i) => [p[0] + (pause[i][0] - p[0]) * k, p[1] + (pause[i][1] - p[1]) * k]);
    return { d: `M${pts[0][0]} ${pts[0][1]}L${pts[1][0]} ${pts[1][1]}L${pts[2][0]} ${pts[2][1]}L${pts[3][0]} ${pts[3][1]}Z` };
  };
  const left = useAnimatedProps(shape([[7, 4], [13, 8], [13, 16], [7, 20]], [[6, 4], [10, 4], [10, 20], [6, 20]]));
  const right = useAnimatedProps(shape([[13, 8], [19.5, 12], [19.5, 12], [13, 16]], [[14, 4], [18, 4], [18, 20], [14, 20]]));
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <AnimatedPath animatedProps={left} fill={color} strokeLinejoin="round" stroke={color} strokeWidth={1.2} />
      <AnimatedPath animatedProps={right} fill={color} strokeLinejoin="round" stroke={color} strokeWidth={1.2} />
    </Svg>
  );
}

/** A music app's "New this week": album covers in depth, the stage glowing in the focused cover's colours. */
function AlbumsScreen({ scheme = 'dark' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [focused, setFocused] = useState(START);
  const [playing, setPlaying] = useState<string | null>(null);
  const now = ALBUMS.find((a) => a.key === playing) ?? null;

  const toggle = (album: Album) => setPlaying((key) => (key === album.key ? null : album.key));

  return (
    <View style={[styles.page, { backgroundColor: c.stage }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View>
          <Text style={[styles.kicker, { color: c.sub }]}>Friday releases</Text>
          <Text style={[styles.title, { color: c.ink }]}>New this week</Text>
        </View>
        <View style={[styles.count, { backgroundColor: c.chip }]}>
          <Text style={[styles.countText, { color: c.ink }]}>
            {focused + 1} / {ALBUMS.length}
          </Text>
        </View>
      </View>

      <AmbientCarousel
        data={ALBUMS}
        defaultIndex={START}
        loop
        reflection
        scheme={scheme}
        itemWidth={Math.round(width * 0.64)}
        accessibilityLabel="Album"
        accessibilityLabelForItem={(a) => `${a.title} by ${a.artist}`}
        onChange={setFocused}
        onPress={toggle}
        renderCover={({ item }) => <AlbumCover album={item} size={Math.round(width * 0.64)} />}
        renderMeta={(album) => (
          <View style={styles.meta}>
            <Text numberOfLines={1} style={[styles.album, { color: c.ink }]}>
              {album.title}
            </Text>
            <Text numberOfLines={1} style={[styles.artist, { color: c.sub }]}>
              {album.artist} · {album.year} · {album.tracks} tracks
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={playing === album.key ? `Pause ${album.title}` : `Play ${album.title}`}
              onPress={() => toggle(album)}
              style={({ pressed }) => [styles.play, { backgroundColor: c.play, transform: [{ scale: pressed ? 0.94 : 1 }] }, webPointer]}>
              <PlayIcon playing={playing === album.key} color={c.onPlay} size={22} />
            </Pressable>
          </View>
        )}
        style={styles.carousel}
      />

      {now ? (
        <View style={[styles.mini, { backgroundColor: c.bar, borderColor: c.line, marginBottom: insets.bottom + 14 }]}>
          <View style={styles.miniCover}>
            <AlbumCover album={now} size={44} />
          </View>
          <View style={styles.fill}>
            <Text numberOfLines={1} style={[styles.miniTitle, { color: c.ink }]}>
              {now.title}
            </Text>
            <Text numberOfLines={1} style={[styles.miniArtist, { color: c.sub }]}>
              {now.artist}
            </Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Pause ${now.title}`} onPress={() => setPlaying(null)} style={[styles.miniButton, webPointer]}>
            <PlayIcon playing color={c.ink} size={22} />
          </Pressable>
        </View>
      ) : (
        <Text style={[styles.hint, { color: c.sub, marginBottom: insets.bottom + 24 }]}>Swipe through, tap the front cover to play</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 24 },
  kicker: { fontSize: 13, fontWeight: '600' },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8, marginTop: 2 },
  count: { height: 30, borderRadius: 15, paddingHorizontal: 12, justifyContent: 'center' },
  countText: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  carousel: { marginTop: 'auto' },
  meta: { alignItems: 'center', width: '100%' },
  album: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  artist: { fontSize: 15, marginTop: 4 },
  play: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  mini: { marginTop: 'auto', marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 10 },
  miniCover: { width: 44, height: 44, borderRadius: 8, overflow: 'hidden' },
  miniTitle: { fontSize: 15, fontWeight: '700' },
  miniArtist: { fontSize: 13, marginTop: 1 },
  miniButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  hint: { marginTop: 'auto', textAlign: 'center', fontSize: 13, fontWeight: '600' },
});

/** The demo with a safe-area provider of its own, so it runs anywhere (UpFork's preview gives it none). */
export default function Albums({ scheme }: { scheme?: Scheme }) {
  return (
    <SafeAreaProvider>
      <AlbumsScreen scheme={scheme} />
    </SafeAreaProvider>
  );
}
