import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { ChoiceChips, type ChipOption } from '../components/choice-chips';
import type { Scheme } from '../lib/use-scheme';

const COLORS = {
  light: { page: '#F4F6F2', card: '#FFFFFF', ink: '#15191A', muted: '#6F7774', line: 'rgba(21, 25, 26, 0.08)', accent: '#1F9D6B' },
  dark: { page: '#0B0E0D', card: '#141917', ink: '#EEF3F0', muted: '#86918C', line: 'rgba(238, 243, 240, 0.08)', accent: '#3CC98F' },
} as const;

type IconProps = { color: string; size: number };
const icon = (draw: (color: string) => React.ReactNode) =>
  function Icon({ color, size }: IconProps) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {draw(color)}
      </Svg>
    );
  };
const line = { strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const NEEDS: ChipOption[] = [
  { value: 'vegan', label: 'Vegan', icon: icon((c) => <Path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14Zm0 0 7-7" stroke={c} {...line} />) },
  { value: 'veggie', label: 'Vegetarian', icon: icon((c) => <Path d="M12 20c-4-3-6-7-6-11a6 6 0 0 1 12 0c0 4-2 8-6 11ZM12 20V10" stroke={c} {...line} />) },
  { value: 'gluten', label: 'Gluten-free', icon: icon((c) => <><Path d="M12 20V8M12 8c-2 0-3-1.5-3-3.5M12 8c2 0 3-1.5 3-3.5M12 12c-2 0-3-1.5-3-3.5M12 12c2 0 3-1.5 3-3.5" stroke={c} {...line} /><Path d="M4 20 20 4" stroke={c} {...line} /></>) },
  { value: 'dairy', label: 'Dairy-free', icon: icon((c) => <><Path d="M9 3h6M9.5 3v3L8 9v11h8V9l-1.5-3V3" stroke={c} {...line} /><Path d="M4 20 20 4" stroke={c} {...line} /></>) },
  { value: 'nuts', label: 'Nut allergy', icon: icon((c) => <Path d="M12 4c3 0 5 2 5 5 0 4-2 7-5 11-3-4-5-7-5-11 0-3 2-5 5-5ZM9.5 9h5M9.5 12h5" stroke={c} {...line} />) },
  { value: 'shellfish', label: 'No shellfish', icon: icon((c) => <><Path d="M5 15c0-5 3-9 7-9s7 4 7 9H5ZM8 15l4-9 4 9M12 6v9" stroke={c} {...line} /></>) },
  { value: 'halal', label: 'Halal', icon: icon((c) => <><Circle cx={12} cy={12} r={8} stroke={c} {...line} /><Path d="m8.5 12.5 2.5 2.5 4.5-5" stroke={c} {...line} /></>) },
  { value: 'kids', label: 'Kids’ menu', icon: icon((c) => <><Circle cx={12} cy={8} r={3} stroke={c} {...line} /><Path d="M7 20c0-3 2-6 5-6s5 3 5 6" stroke={c} {...line} /></>) },
];

const SEATING: ChipOption[] = [
  { value: 'window', label: 'Window' },
  { value: 'terrace', label: 'Terrace' },
  { value: 'quiet', label: 'Quiet corner' },
  { value: 'bar', label: 'At the bar' },
];

/** A restaurant booking step: dietary needs as outlined chips that never reflow, and a single seating choice. */
function DietaryScreen({ scheme = 'light' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const insets = useSafeAreaInsets();
  const [needs, setNeeds] = useState<string[]>(['veggie', 'nuts']);
  const [seat, setSeat] = useState<string[]>(['terrace']);
  return (
    <ScrollView style={{ backgroundColor: c.page }} contentContainerStyle={[styles.page, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 30 }]}>
      <View style={[styles.summary, { backgroundColor: c.card, borderColor: c.line }]}>
        <View style={[styles.dot, { backgroundColor: c.accent }]} />
        <View style={styles.fill}>
          <Text style={[styles.place, { color: c.ink }]}>Casa Verde</Text>
          <Text style={[styles.when, { color: c.muted }]}>Friday 18 · 20:00 · Table for 4</Text>
        </View>
      </View>
      <Text style={[styles.title, { color: c.ink }]}>Anything we should know?</Text>
      <Text style={[styles.subtitle, { color: c.muted }]}>The kitchen sees these before you arrive.</Text>
      <ChoiceChips
        scheme={scheme}
        accessibilityLabel="Dietary needs"
        options={NEEDS}
        value={needs}
        onChange={setNeeds}
        variant="outline"
        checkPlacement="reserve"
        accent={c.accent}
        size="lg"
        gap={10}
        helperText={needs.length === 0 ? 'None — great, everything’s on the menu.' : `${needs.length} noted for your table`}
        style={styles.block}
      />
      <Text style={[styles.section, { color: c.ink }]}>Where would you like to sit?</Text>
      <ChoiceChips
        scheme={scheme}
        accessibilityLabel="Seating"
        mode="single"
        options={SEATING}
        value={seat}
        onChange={setSeat}
        accent={c.accent}
        checkPlacement="leading"
        style={styles.block}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20 },
  fill: { flex: 1 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth },
  dot: { width: 10, height: 10, borderRadius: 5 },
  place: { fontSize: 16, fontWeight: '700' },
  when: { fontSize: 13, marginTop: 2 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6, marginTop: 26 },
  subtitle: { fontSize: 15, marginTop: 4 },
  block: { marginTop: 16 },
  section: { fontSize: 18, fontWeight: '700', marginTop: 30 },
});

/** The demo with a safe-area provider of its own, so it runs anywhere (UpFork's preview gives it none). */
export default function Dietary({ scheme }: { scheme?: Scheme }) {
  return (
    <SafeAreaProvider>
      <DietaryScreen scheme={scheme} />
    </SafeAreaProvider>
  );
}
