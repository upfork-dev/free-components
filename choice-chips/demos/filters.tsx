import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { ChoiceChips, type ChipOption } from '../components/choice-chips';
import type { Scheme } from '../lib/use-scheme';

const COLORS = {
  light: { page: '#E9E7E3', sheet: '#FAF9F7', ink: '#17171C', muted: '#7C7C86', line: 'rgba(23, 23, 28, 0.08)', accent: '#2F5BEA', grab: 'rgba(23, 23, 28, 0.16)' },
  dark: { page: '#050506', sheet: '#121216', ink: '#F2F2F6', muted: '#8B8B96', line: 'rgba(242, 242, 246, 0.08)', accent: '#6E8FFF', grab: 'rgba(242, 242, 246, 0.2)' },
} as const;

const SORT: ChipOption[] = [
  { value: 'popular', label: 'Popular' },
  { value: 'new', label: 'Newest' },
  { value: 'low', label: 'Price: low to high' },
  { value: 'high', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
];

const SIZES: ChipOption[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((size) => ({
  value: size,
  label: size,
  disabled: size === 'XS' || size === 'XXL',
  accessibilityHint: size === 'XS' || size === 'XXL' ? 'Sold out' : undefined,
}));

// A colour dot with a faint ring in the label's colour, so black shows on dark chips and white on light ones.
const swatch = (fill: string) =>
  function Swatch({ color, size }: { color: string; size: number }) {
    return (
      <Svg width={size} height={size} viewBox="0 0 20 20">
        <Circle cx={10} cy={10} r={8} fill={fill} stroke={color} strokeOpacity={0.35} strokeWidth={1.2} />
      </Svg>
    );
  };

const COLOURS: ChipOption[] = [
  { value: 'black', label: 'Black', icon: swatch('#17171C'), color: '#3A3A44' },
  { value: 'sand', label: 'Sand', icon: swatch('#D8C3A0'), color: '#B08A4E' },
  { value: 'olive', label: 'Olive', icon: swatch('#6F7A44'), color: '#5E6A30' },
  { value: 'navy', label: 'Navy', icon: swatch('#22325E'), color: '#2A3F7A' },
  { value: 'rust', label: 'Rust', icon: swatch('#B4532A'), color: '#B4532A' },
  { value: 'white', label: 'White', icon: swatch('#FFFFFF'), color: '#6A6A74' },
];

const BRANDS: ChipOption[] = [
  ['north', 'Northfold', 48],
  ['loam', 'Loam & Co', 31],
  ['ridge', 'Ridgeline', 27],
  ['pale', 'Pale Harbor', 19],
  ['tide', 'Tidewater', 14],
  ['oak', 'Oakmoor', 12],
  ['fable', 'Fable Supply', 9],
  ['kite', 'Kite Studio', 6],
].map(([value, label, count]) => ({ value: value as string, label: label as string, count: count as number }));

const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;

/** A shop's filter sheet: a single sort, a grid of sizes, colour swatches and searchable brands. */
function FiltersScreen({ scheme = 'light' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const insets = useSafeAreaInsets();
  const [sort, setSort] = useState<string[]>(['popular']);
  const [sizes, setSizes] = useState<string[]>(['M']);
  const [colours, setColours] = useState<string[]>(['sand', 'olive']);
  const [brands, setBrands] = useState<string[]>(['loam']);
  const results = Math.max(6, 212 - sizes.length * 23 - colours.length * 17 - brands.length * 21);
  const clear = () => {
    setSort(['popular']);
    setSizes([]);
    setColours([]);
    setBrands([]);
  };
  return (
    <View style={[styles.page, { backgroundColor: c.page }]}>
      <View style={[styles.sheet, { backgroundColor: c.sheet, marginTop: insets.top + 36 }]}>
        <View style={[styles.grab, { backgroundColor: c.grab }]} />
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.ink }]}>Filters</Text>
          <Pressable accessibilityRole="button" onPress={clear} hitSlop={10} style={webPointer}>
            <Text style={[styles.clear, { color: c.accent }]}>Clear all</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.body}>
          <Section title="Sort by" color={c.muted}>
            <ChoiceChips scheme={scheme} accessibilityLabel="Sort by" mode="single" min={1} layout="scroll" size="sm" variant="solid" accent={c.ink} checkPlacement="leading" options={SORT} value={sort} onChange={setSort} gap={8} />
          </Section>
          <Section title="Size" color={c.muted}>
            <ChoiceChips scheme={scheme} accessibilityLabel="Size" layout="grid" columns={3} size="sm" variant="outline" accent={c.accent} checkPlacement="reserve" options={SIZES} value={sizes} onChange={setSizes} gap={6} />
          </Section>
          <Section title="Colour" color={c.muted}>
            <ChoiceChips scheme={scheme} accessibilityLabel="Colour" options={COLOURS} value={colours} onChange={setColours} size="sm" gap={8} />
          </Section>
          <Section title="Brand" color={c.muted}>
            <ChoiceChips
              scheme={scheme}
              accessibilityLabel="Brand"
              options={BRANDS}
              value={brands}
              onChange={setBrands}
              searchable={{ placeholder: 'Search brands' }}
              accent={c.accent}
              size="sm"
              gap={8}
            />
          </Section>
        </ScrollView>
        <View style={[styles.footer, { borderColor: c.line, paddingBottom: insets.bottom + 14 }]}>
          <Pressable accessibilityRole="button" style={({ pressed }) => [styles.show, { backgroundColor: c.ink, opacity: pressed ? 0.85 : 1 }, webPointer]}>
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Path d="M4 6h16M7 12h10M10 18h4" stroke={c.sheet} strokeWidth={2.2} strokeLinecap="round" />
            </Svg>
            <Text style={[styles.showText, { color: c.sheet }]}>Show {results} results</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  sheet: { flex: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  grab: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  clear: { fontSize: 15, fontWeight: '700' },
  body: { paddingHorizontal: 20, paddingBottom: 20 },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '700', marginBottom: 10 },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  show: { height: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  showText: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
});

/** The demo with a safe-area provider of its own, so it runs anywhere (UpFork's preview gives it none). */
export default function Filters({ scheme }: { scheme?: Scheme }) {
  return (
    <SafeAreaProvider>
      <FiltersScreen scheme={scheme} />
    </SafeAreaProvider>
  );
}
