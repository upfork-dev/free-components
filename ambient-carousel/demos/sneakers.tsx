import { useId, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Ellipse, G, Path, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { AmbientCarousel, hexToLab, labToRgba } from '../components/ambient-carousel';
import type { Scheme } from '../lib/use-scheme';

type Colorway = {
  key: string;
  name: string;
  price: string;
  upper: string;
  shade: string;
  sole: string;
  accent: string;
  tile: string;
  colors: [string, string, string];
};

// One shoe (drawn here, no marks of any maker) in six colourways.
const COLORWAYS: Colorway[] = [
  { key: 'glacier', name: 'Glacier', price: '$148', upper: '#E7EEF5', shade: '#CBD8E6', sole: '#FFFFFF', accent: '#3E8BFF', tile: '#DCE9FA', colors: ['#3E8BFF', '#9CC8FF', '#E7EEF5'] },
  { key: 'ember', name: 'Ember', price: '$152', upper: '#2B2B2F', shade: '#1C1C20', sole: '#F2EEE6', accent: '#FF5A36', tile: '#F3D9CF', colors: ['#FF5A36', '#FFB199', '#2B2B2F'] },
  { key: 'moss', name: 'Moss', price: '$148', upper: '#5C7A4A', shade: '#48623A', sole: '#EDE6D6', accent: '#D8F05C', tile: '#E1E9CF', colors: ['#7FA35A', '#D8F05C', '#EDE6D6'] },
  { key: 'dune', name: 'Dune', price: '$140', upper: '#D9C4A3', shade: '#C2AA84', sole: '#F7F1E6', accent: '#A3561A', tile: '#F1E5D2', colors: ['#D59A54', '#A3561A', '#F7F1E6'] },
  { key: 'nightfall', name: 'Nightfall', price: '$158', upper: '#1E2440', shade: '#151A31', sole: '#2E3452', accent: '#8A7CFF', tile: '#D9D6F7', colors: ['#8A7CFF', '#4B57C9', '#C5C0FF'] },
  { key: 'bloom', name: 'Bloom', price: '$148', upper: '#F7C5D6', shade: '#EDA9C0', sole: '#FFFFFF', accent: '#E2457A', tile: '#F9DCE6', colors: ['#E2457A', '#F7A5C3', '#FFE3EC'] },
];
const LABS = COLORWAYS.map((c) => hexToLab(c.accent));
const SIZES = [7, 8, 9, 10, 11, 12];

const COLORS = {
  light: { stage: '#F6F5F2', ink: '#141418', sub: 'rgba(20, 20, 24, 0.65)', chip: '#FFFFFF', line: 'rgba(20, 20, 24, 0.08)', chipOn: '#141418', onChipOn: '#FFFFFF' },
  dark: { stage: '#0A0A0D', ink: '#F5F5F7', sub: 'rgba(245, 245, 247, 0.65)', chip: 'rgba(255, 255, 255, 0.06)', line: 'rgba(255, 255, 255, 0.08)', chipOn: '#F5F5F7', onChipOn: '#0A0A0D' },
} as const;

const SANS = Platform.select({ web: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', default: undefined });
const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;

/** The shoe, side on, in a colourway, on its own tile. */
function SneakerCard({ way, width, height, index }: { way: Colorway; width: number; height: number; index: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <Svg width={width} height={height} viewBox="0 0 200 244" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <RadialGradient id={`tile-${id}`} cx="100" cy="110" r="150" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.9} />
          <Stop offset="0.55" stopColor={way.tile} />
          <Stop offset="1" stopColor={way.tile} />
        </RadialGradient>
      </Defs>
      <Rect width={200} height={244} fill={`url(#tile-${id})`} />
      <SvgText x={16} y={32} fontSize={11} fontWeight="800" letterSpacing={2} fill={way.accent} fontFamily={SANS}>
        DRIFT RUNNER
      </SvgText>
      <SvgText x={184} y={226} fontSize={44} fontWeight="900" textAnchor="end" fill={way.accent} opacity={0.12} fontFamily={SANS}>
        {`0${index + 1}`}
      </SvgText>
      <Ellipse cx={100} cy={168} rx={80} ry={6} fill="rgba(0, 0, 0, 0.14)" />
      <G transform="rotate(-5 100 120) translate(2 53) scale(0.8)">
        <Path d="M18 128c0-6 4-9 10-9h186c8 0 14 4 14 9s-5 8-12 8H30c-7 0-12-3-12-8Z" fill={way.shade} />
        <Path d="M24 102c-6-16-6-36 0-48 2-6 6-10 12-10 8 2 16 12 26 14 8 2 16-8 22-20 2-4 8-6 12-2l8 10c18 10 38 20 58 28 24 8 48 14 60 22 4 3 4 6 2 6Z" fill={way.upper} />
        <Path d="M190 86c16 4 28 8 32 12l2 4h-28c0-6-2-12-6-16Z" fill={way.shade} />
        <Path d="M24 102c-6-16-6-36 0-48 8 8 16 18 20 30 2 8 2 14 2 18Z" fill={way.shade} />
        <Path d="M46 98c26-14 60-22 94-20 20 1 36 6 48 14-20 2-42 2-64 4-26 2-52 4-78 6Z" fill={way.accent} />
        <Path d="M22 44c-2-8 2-12 8-10l4 10Z" fill={way.accent} />
        <Path d="M28 52c10-2 22 6 34 8" stroke={way.shade} strokeWidth={2} strokeLinecap="round" fill="none" />
        {[[104.0, 47.5, 99.0, 57.5], [118.0, 54.5, 113.0, 64.5], [132.1, 61.6, 127.1, 71.6], [146.2, 68.6, 141.2, 78.6]].map(([x1, y1, x2, y2], i) => (
          <Path key={i} d={`M${x1} ${y1}L${x2} ${y2}`} stroke={way.sole} strokeWidth={3.2} strokeLinecap="round" />
        ))}
        {[[198, 92], [205, 94], [212, 96], [202, 97], [209, 99]].map(([x, y], i) => (
          <Circle key={i} cx={x} cy={y} r={1.1} fill={way.upper} opacity={0.7} />
        ))}
        <Path d="M16 112c0-6 4-10 10-10h182c12 0 22 6 22 14 0 4-4 6-8 6H24c-5 0-8-4-8-10Z" fill={way.sole} />
        <Path d="M30 112c50-4 110 4 184-2" stroke={way.accent} strokeWidth={1.6} strokeLinecap="round" fill="none" opacity={0.6} />
      </G>
    </Svg>
  );
}

/** A colourway picker: the shoe on every cover, the stage glowing in the colourway's colours. */
function SneakersScreen({ scheme = 'light' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(1);
  const [size, setSize] = useState(9);
  const progress = useSharedValue(1);
  const coverW = Math.round(width * 0.58);
  const coverH = Math.round(coverW / 0.82);

  // "Add to bag" takes the colourway's accent, blended as you swipe, with its text dark or light to keep contrast.
  const bag = useAnimatedStyle(() => {
    const p = Math.min(Math.max(progress.value, 0), LABS.length - 1);
    const base = Math.floor(p);
    const t = p - base;
    const a = LABS[base];
    const b = LABS[Math.min(base + 1, LABS.length - 1)];
    const lab: [number, number, number] = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    return { backgroundColor: labToRgba(lab) };
  });
  const bagText = useAnimatedStyle(() => {
    const p = Math.min(Math.max(progress.value, 0), LABS.length - 1);
    const base = Math.floor(p);
    const t = p - base;
    const l = LABS[base][0] + (LABS[Math.min(base + 1, LABS.length - 1)][0] - LABS[base][0]) * t;
    // Above this lightness dark text reads better than white (4.5:1 or more for every colourway).
    return { color: l > 0.6 ? '#0B0B0E' : '#FFFFFF' };
  });

  return (
    <View style={[styles.page, { backgroundColor: c.stage, paddingTop: insets.top + 14, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.header}>
        <Text style={[styles.kicker, { color: c.sub }]}>Running · Road</Text>
        <Text style={[styles.title, { color: c.ink }]}>Drift Runner</Text>
      </View>

      <AmbientCarousel
        data={COLORWAYS}
        defaultIndex={1}
        progress={progress}
        onChange={setIndex}
        scheme={scheme}
        itemWidth={coverW}
        aspectRatio={0.82}
        accessibilityLabel="Colourway"
        accessibilityLabelForItem={(w) => `${w.name}, ${w.price}`}
        renderCover={({ item, index: i }) => <SneakerCard way={item} width={coverW} height={coverH} index={i} />}
        renderMeta={(w) => (
          <View style={styles.meta}>
            <Text style={[styles.name, { color: c.ink }]}>{w.name}</Text>
            <Text style={[styles.price, { color: c.sub }]}>
              {w.price} · Men’s road running shoe
            </Text>
          </View>
        )}
      />

      <Text style={[styles.section, { color: c.sub }]}>Size (US)</Text>
      <View style={styles.sizes}>
        {SIZES.map((s) => (
          <Pressable
            key={s}
            accessibilityRole="button"
            accessibilityLabel={`Size ${s}`}
            accessibilityState={{ selected: size === s }}
            onPress={() => setSize(s)}
            style={[styles.size, { backgroundColor: size === s ? c.chipOn : c.chip, borderColor: c.line }, webPointer]}>
            <Text style={[styles.sizeText, { color: size === s ? c.onChipOn : c.ink }]}>{s}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Add ${COLORWAYS[index].name}, size ${size}, to bag`} style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }, webPointer]}>
        <Animated.View style={[styles.bag, bag]}>
          <Animated.Text style={[styles.bagText, bagText]}>Add to bag · {COLORWAYS[index].price}</Animated.Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: { paddingHorizontal: 24 },
  kicker: { fontSize: 13, fontWeight: '600' },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8, marginTop: 2 },
  meta: { alignItems: 'center' },
  name: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  price: { fontSize: 15, marginTop: 4 },
  section: { fontSize: 13, fontWeight: '700', marginLeft: 24, marginBottom: 8, marginTop: 'auto' },
  sizes: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  size: { flex: 1, height: 44, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  sizeText: { fontSize: 15, fontWeight: '800' },
  bag: { height: 54, borderRadius: 27, marginHorizontal: 16, marginTop: 14, alignItems: 'center', justifyContent: 'center' },
  bagText: { fontSize: 16, fontWeight: '800' },
});

/** The demo with a safe-area provider of its own, so it runs anywhere (UpFork's preview gives it none). */
export default function Sneakers({ scheme }: { scheme?: Scheme }) {
  return (
    <SafeAreaProvider>
      <SneakersScreen scheme={scheme} />
    </SafeAreaProvider>
  );
}
