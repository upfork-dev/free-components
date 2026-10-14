import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Filmstrip, SwapText, formatDuration, type FilmItem, type RenderImage } from '../components/filmstrip';
import { SceneImage } from '../lib/scene-image';
import { SCENES, type Scene } from '../lib/scenes';
import type { Scheme } from '../lib/use-scheme';

type Chapter = FilmItem & { scene: Scene; title: string; start: number };

// An invented road film in nine chapters; every frame is one of the painted scenes, cut to 16:9.
const PLAN: Array<[number, string, number]> = [
  [6, 'Leaving before dawn', 312],
  [0, 'Sand in everything', 405],
  [11, 'The red walls', 298],
  [9, 'Above the clouds', 356],
  [1, 'A lake like glass', 274],
  [2, 'Lost in the pines', 331],
  [13, 'Ochre country', 289],
  [12, 'Last ferry out', 367],
  [5, 'The green sky', 420],
];

let clock = 0;
const CHAPTERS: Chapter[] = PLAN.map(([id, title, seconds], i) => {
  const start = clock;
  clock += seconds;
  return {
    key: `c${i}`,
    width: 16,
    height: 9,
    type: 'video',
    duration: seconds,
    scene: SCENES[id],
    title,
    start,
    accessibilityLabel: `Chapter ${i + 1}, ${title}, ${formatDuration(seconds)}`,
  };
});
const TOTAL = clock;

const COLORS = {
  dark: { page: '#050506', ink: '#F4F4F6', muted: '#9A9AA5', faint: '#6E6E79', chip: 'rgba(255, 255, 255, 0.08)', track: 'rgba(255, 255, 255, 0.12)', fill: '#F4F4F6' },
  light: { page: '#F7F7F5', ink: '#111114', muted: '#62626B', faint: '#8E8E98', chip: 'rgba(0, 0, 0, 0.05)', track: 'rgba(0, 0, 0, 0.1)', fill: '#111114' },
} as const;

const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;
const renderImage: RenderImage<Chapter> = ({ item }) => <SceneImage scene={item.scene} />;

/** A film's chapters: frames in the viewer, chapters in the strip, the chapter's title and times below. */
function ChaptersScreen({ scheme = 'dark' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const insets = useSafeAreaInsets();

  const caption = (item: Chapter, index: number) => {
    const end = item.start + (item.duration ?? 0);
    return (
      <View>
        <View style={styles.captionTop}>
          <SwapText text={`Chapter ${index + 1} of ${CHAPTERS.length}`} style={[styles.kicker, { color: c.muted }]} live />
          <SwapText text={`${formatDuration(item.start)} – ${formatDuration(end)}`} style={[styles.range, { color: c.faint }]} />
        </View>
        <SwapText text={item.title} style={[styles.chapterTitle, { color: c.ink }]} />
        {/* Where the chapter sits in the whole film. */}
        <View style={[styles.track, { backgroundColor: c.track }]}>
          <View
            style={[
              styles.span,
              { backgroundColor: c.fill, left: `${(item.start / TOTAL) * 100}%`, width: `${((item.duration ?? 0) / TOTAL) * 100}%` },
            ]}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.page, { backgroundColor: c.page, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={6} style={[styles.round, { backgroundColor: c.chip }, webPointer]}>
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke={c.ink} strokeWidth={2.1} strokeLinecap="round" />
          </Svg>
        </Pressable>
        <View style={styles.titles}>
          <Text style={[styles.film, { color: c.ink }]}>North by Night</Text>
          <Text style={[styles.meta, { color: c.muted }]}>Episode 2 · {Math.round(TOTAL / 60)} min</Text>
        </View>
        <View style={styles.round} />
      </View>
      <Filmstrip data={CHAPTERS} renderImage={renderImage} defaultIndex={2} renderCaption={caption} thumbHeight={48} scheme={scheme} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  round: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  titles: { flex: 1, alignItems: 'center' },
  film: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  captionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kicker: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  range: { fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
  chapterTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3, marginTop: 4 },
  track: { height: 3, borderRadius: 1.5, marginTop: 12, marginBottom: 4, overflow: 'hidden' },
  span: { position: 'absolute', top: 0, bottom: 0, borderRadius: 1.5 },
});

/** The demo with a safe-area provider of its own, so it runs anywhere (UpFork's preview gives it none). */
export default function ChaptersDemo({ scheme }: { scheme?: Scheme }) {
  return (
    <SafeAreaProvider>
      <ChaptersScreen scheme={scheme} />
    </SafeAreaProvider>
  );
}
