import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useAnimatedReaction, useSharedValue } from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { FilmstripStrip, FilmstripViewer, SwapText, type FilmItem, type RenderImage } from '../components/filmstrip';
import { SceneImage } from '../lib/scene-image';
import { SCENES, type Scene } from '../lib/scenes';
import type { Scheme } from '../lib/use-scheme';

type Shot = FilmItem & { scene: Scene };

// An invented stay. The pictures are painted (see lib/scenes.ts).
const SHOTS: Shot[] = [
  [0, 'Dunes on the walk to the beach'],
  [10, 'The lagoon below the house'],
  [7, 'Rice fields behind the village'],
  [12, 'The harbour at golden hour'],
  [3, 'Cliffs at the end of the bay'],
  [8, 'Lavender along the lane'],
  [13, 'Hills inland, in autumn'],
].map(([id, label]) => {
  const scene = SCENES[id as number];
  return { key: `s${id}`, width: scene.w, height: scene.h, scene, accessibilityLabel: label as string };
});

const COLORS = {
  light: { page: '#FFFFFF', ink: '#121215', muted: '#6B6B74', line: 'rgba(18, 18, 21, 0.08)', chip: '#F3F2EF', cta: '#121215', ctaText: '#FFFFFF', star: '#121215', heart: '#E5384B' },
  dark: { page: '#0C0C0F', ink: '#F4F4F6', muted: '#9898A3', line: 'rgba(255, 255, 255, 0.08)', chip: '#18181D', cta: '#F4F4F6', ctaText: '#0C0C0F', star: '#F4F4F6', heart: '#FF5A6A' },
} as const;

const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;
const renderImage: RenderImage<Shot> = ({ item }) => <SceneImage scene={item.scene} />;

/** A stay: the gallery fills the top, its strip overlapping the photo's bottom edge, then the details. */
function ListingScreen({ scheme = 'light' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const insets = useSafeAreaInsets();
  const position = useSharedValue(0);
  const [index, setIndex] = useState(0);
  const [saved, setSaved] = useState(false);
  useAnimatedReaction(
    () => Math.min(Math.max(Math.round(position.value), 0), SHOTS.length - 1),
    (now, before) => {
      if (now !== before) scheduleOnRN(setIndex, now);
    },
  );

  return (
    <View style={[styles.page, { backgroundColor: c.page }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 96 }} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={styles.hero}>
          <FilmstripViewer data={SHOTS} position={position} renderImage={renderImage} fit="cover" style={styles.viewer} />
          {/* The strip sits over the photo's lower edge, on a band of its own. */}
          <View style={styles.stripSlot} pointerEvents="box-none">
            <FilmstripStrip data={SHOTS} position={position} renderImage={renderImage} thumbHeight={46} scheme="dark" style={styles.strip} />
          </View>
          <View style={[styles.heroBar, { top: insets.top + 8 }]} pointerEvents="box-none">
            <Pressable accessibilityRole="button" accessibilityLabel="Back" style={[styles.float, webPointer]} hitSlop={6}>
              <Svg width={20} height={20} viewBox="0 0 24 24">
                <Path d="M14.5 5.5 8 12l6.5 6.5" stroke="#111114" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </Svg>
            </Pressable>
            <View style={styles.counter}>
              <SwapText text={`${index + 1} / ${SHOTS.length}`} style={styles.counterText} />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save"
              accessibilityState={{ selected: saved }}
              onPress={() => setSaved((s) => !s)}
              style={[styles.float, webPointer]}
              hitSlop={6}
            >
              <Svg width={19} height={19} viewBox="0 0 24 24">
                <Path
                  d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"
                  stroke={saved ? c.heart : '#111114'}
                  fill={saved ? c.heart : 'none'}
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
              </Svg>
            </Pressable>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={[styles.kicker, { color: c.muted }]}>ENTIRE HOUSE · COMPORTA</Text>
          <Text style={[styles.title, { color: c.ink }]}>Casa Alva</Text>
          <View style={styles.rating}>
            <Svg width={14} height={14} viewBox="0 0 24 24">
              <Path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z" fill={c.star} />
            </Svg>
            <Text style={[styles.ratingText, { color: c.ink }]}>4.92</Text>
            <Text style={[styles.ratingMuted, { color: c.muted }]}>· 128 reviews · Superhost</Text>
          </View>
          <View style={[styles.facts, { borderColor: c.line }]}>
            {[
              ['6', 'guests'],
              ['3', 'bedrooms'],
              ['4', 'beds'],
              ['2', 'baths'],
            ].map(([n, label]) => (
              <View key={label} style={styles.fact}>
                <Text style={[styles.factN, { color: c.ink }]}>{n}</Text>
                <Text style={[styles.factLabel, { color: c.muted }]}>{label}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.copy, { color: c.muted }]}>
            A whitewashed house between the rice fields and the dunes, ten minutes on foot from the beach. Wide
            windows, a shaded terrace, bikes in the shed.
          </Text>
          <View style={styles.tags}>
            {['Sea view', 'Terrace', 'Bikes', 'Fast wifi'].map((t) => (
              <View key={t} style={[styles.tag, { backgroundColor: c.chip }]}>
                <Text style={[styles.tagText, { color: c.ink }]}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + 12, backgroundColor: c.page, borderTopColor: c.line }]}>
        <View>
          <Text style={[styles.price, { color: c.ink }]}>
            €214 <Text style={[styles.night, { color: c.muted }]}>night</Text>
          </Text>
          <Text style={[styles.dates, { color: c.muted }]}>12–17 May · 5 nights</Text>
        </View>
        <Pressable accessibilityRole="button" style={[styles.cta, { backgroundColor: c.cta }, webPointer]}>
          <Text style={[styles.ctaText, { color: c.ctaText }]}>Reserve</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  hero: { height: 440, backgroundColor: '#050506' },
  viewer: { flex: 1 },
  stripSlot: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  strip: { backgroundColor: 'rgba(5, 5, 6, 0.42)' },
  heroBar: { position: 'absolute', left: 14, right: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  float: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 255, 255, 0.92)', alignItems: 'center', justifyContent: 'center' },
  counter: { height: 26, borderRadius: 13, paddingHorizontal: 10, justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.45)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255, 255, 255, 0.14)' },
  counterText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  body: { paddingHorizontal: 20, paddingTop: 18 },
  kicker: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.6, marginTop: 4 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  ratingText: { fontSize: 14, fontWeight: '700' },
  ratingMuted: { fontSize: 14 },
  facts: { flexDirection: 'row', marginTop: 16, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1 },
  fact: { flex: 1, alignItems: 'center' },
  factN: { fontSize: 17, fontWeight: '800' },
  factLabel: { fontSize: 12, marginTop: 1 },
  copy: { fontSize: 14, lineHeight: 21, marginTop: 14 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  tag: { height: 30, borderRadius: 15, paddingHorizontal: 12, justifyContent: 'center' },
  tagText: { fontSize: 13, fontWeight: '600' },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1 },
  price: { fontSize: 18, fontWeight: '800' },
  night: { fontSize: 14, fontWeight: '500' },
  dates: { fontSize: 12, marginTop: 2 },
  cta: { height: 48, borderRadius: 24, paddingHorizontal: 28, justifyContent: 'center' },
  ctaText: { fontSize: 16, fontWeight: '700' },
});

/** The demo with a safe-area provider of its own, so it runs anywhere (UpFork's preview gives it none). */
export default function ListingDemo({ scheme }: { scheme?: Scheme }) {
  return (
    <SafeAreaProvider>
      <ListingScreen scheme={scheme} />
    </SafeAreaProvider>
  );
}
