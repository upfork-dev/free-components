import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useAnimatedReaction, useSharedValue } from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { Filmstrip, SwapText, type FilmItem, type RenderImage } from '../components/filmstrip';
import { SceneImage } from '../lib/scene-image';
import { SCENES, type Scene } from '../lib/scenes';
import type { Scheme } from '../lib/use-scheme';

type Photo = FilmItem & { scene: Scene; place: string; when: string };

// A trip's photos: places and times invented for the demo, pictures painted (see lib/scenes.ts).
const TRIP: Array<[number, string, string]> = [
  [0, 'Erg dunes', '8 March · 18:51'],
  [3, 'Cabo cliffs', '9 March · 19:20'],
  [12, 'Old harbour', '10 March · 18:05'],
  [8, 'Lavender road', '10 March · 19:12'],
  [4, 'Lisbon', '12 March · 18:42'],
  [7, 'Terraces', '13 March · 08:30'],
  [10, 'Lagoon', '14 March · 12:14'],
  [11, 'Red canyon', '15 March · 16:48'],
  [6, 'Route north', '16 March · 20:02'],
  [9, 'First light', '17 March · 06:41'],
  [1, 'Glass lake', '17 March · 09:15'],
  [2, 'Pine fog', '18 March · 07:58'],
  [13, 'Ochre hills', '19 March · 17:26'],
  [5, 'Green sky', '20 March · 23:40'],
];

const PHOTOS: Photo[] = TRIP.map(([id, place, when]) => {
  const scene = SCENES[id];
  return {
    key: `p${id}`,
    width: scene.w,
    height: scene.h,
    scene,
    place,
    when,
    accessibilityLabel: `${scene.name}, ${place}, ${when.replace(' · ', ' at ')}`,
  };
});

const COLORS = {
  dark: { page: '#050506', ink: '#F4F4F6', muted: '#9A9AA5', button: 'rgba(255, 255, 255, 0.08)', heart: '#FF5A6A' },
  light: { page: '#F7F7F5', ink: '#111114', muted: '#6A6A73', button: 'rgba(0, 0, 0, 0.05)', heart: '#E5384B' },
} as const;

const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;
const renderImage: RenderImage<Photo> = ({ item }) => <SceneImage scene={item.scene} />;

/** A photo app's viewer: the picture, the place and time morphing per photo, and the filmstrip. */
function GalleryScreen({ scheme = 'dark' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(4);
  const [liked, setLiked] = useState<Record<string, boolean>>({ p4: true });
  const photo = PHOTOS[index];
  // The live float index: the header follows the photo under the centre while you scrub.
  const position = useSharedValue(4);
  useAnimatedReaction(
    () => Math.min(Math.max(Math.round(position.value), 0), PHOTOS.length - 1),
    (now, before) => {
      if (now !== before) scheduleOnRN(setIndex, now);
    },
  );

  return (
    <View style={[styles.page, { backgroundColor: c.page, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to album" hitSlop={6} style={[styles.round, { backgroundColor: c.button }, webPointer]}>
          <Svg width={22} height={22} viewBox="0 0 24 24">
            <Path d="M14.5 5.5 8 12l6.5 6.5" stroke={c.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        </Pressable>
        <View style={styles.titles}>
          <SwapText text={photo.place} style={[styles.place, { color: c.ink }]} containerStyle={styles.center} />
          <SwapText text={photo.when} style={[styles.when, { color: c.muted }]} containerStyle={styles.center} />
        </View>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Share" hitSlop={6} style={[styles.round, { backgroundColor: c.button }, webPointer]}>
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path d="M12 3.5v11M7.5 8 12 3.5 16.5 8M5.5 12.5v6a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-6" stroke={c.ink} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </Svg>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Favourite"
            accessibilityState={{ selected: !!liked[photo.key] }}
            onPress={() => setLiked((l) => ({ ...l, [photo.key]: !l[photo.key] }))}
            hitSlop={6}
            style={[styles.round, { backgroundColor: c.button }, webPointer]}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path
                d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"
                stroke={liked[photo.key] ? c.heart : c.ink}
                fill={liked[photo.key] ? c.heart : 'none'}
                strokeWidth={1.9}
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
        </View>
      </View>
      <Filmstrip data={PHOTOS} renderImage={renderImage} position={position} scheme={scheme} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  round: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  titles: { flex: 1, alignItems: 'center' },
  center: { alignItems: 'center' },
  place: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  when: { fontSize: 12, fontWeight: '500', marginTop: 1, textAlign: 'center', fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: 8 },
});

/** The demo with a safe-area provider of its own, so it runs anywhere (UpFork's preview gives it none). */
export default function GalleryDemo({ scheme }: { scheme?: Scheme }) {
  return (
    <SafeAreaProvider>
      <GalleryScreen scheme={scheme} />
    </SafeAreaProvider>
  );
}
