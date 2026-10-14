import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmbientCarousel, hexToLab, labToRgba } from '../components/ambient-carousel';
import type { Scheme } from '../lib/use-scheme';

type Theme = {
  key: string;
  name: string;
  note: string;
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  accent: string;
  onAccent: string;
  colors: [string, string, string];
};

const THEMES: Theme[] = [
  { key: 'paper', name: 'Paper', note: 'Warm and quiet', bg: '#FAF7F0', surface: '#FFFFFF', ink: '#2A241C', muted: '#9A8F80', accent: '#B8472A', onAccent: '#FFFFFF', colors: ['#E2643D', '#F4C9A8', '#FAF7F0'] },
  { key: 'midnight', name: 'Midnight', note: 'Deep blue, soft light', bg: '#0E1220', surface: '#181E33', ink: '#E8EBFF', muted: '#7D86AE', accent: '#7C8CFF', onAccent: '#0E1220', colors: ['#7C8CFF', '#3A4A9E', '#B8C2FF'] },
  { key: 'forest', name: 'Forest', note: 'Calm greens', bg: '#0F1F17', surface: '#183026', ink: '#E2F5EA', muted: '#7FA693', accent: '#5BD48A', onAccent: '#0F1F17', colors: ['#5BD48A', '#1E7A4E', '#B9F2CF'] },
  { key: 'lagoon', name: 'Lagoon', note: 'Fresh and bright', bg: '#E9FBF8', surface: '#FFFFFF', ink: '#0E3B38', muted: '#5E8F8A', accent: '#0B7A71', onAccent: '#FFFFFF', colors: ['#11A79C', '#7FE3D6', '#E9FBF8'] },
  { key: 'plum', name: 'Plum', note: 'Moody violet', bg: '#1C1022', surface: '#2A1A33', ink: '#F6E8FF', muted: '#A88BB8', accent: '#D46BFF', onAccent: '#1C1022', colors: ['#D46BFF', '#7A2FA3', '#F0C2FF'] },
  { key: 'sand', name: 'Sand', note: 'Sunlit neutrals', bg: '#F3EAD9', surface: '#FBF6EC', ink: '#3A2E1C', muted: '#9C8A6C', accent: '#8F6526', onAccent: '#FFFFFF', colors: ['#D4A24C', '#B98A3B', '#F3EAD9'] },
  { key: 'coral', name: 'Coral', note: 'Playful and warm', bg: '#FFF1EE', surface: '#FFFFFF', ink: '#3B1714', muted: '#B07A72', accent: '#D93A34', onAccent: '#FFFFFF', colors: ['#FF5E57', '#FFB3A8', '#FFF1EE'] },
];
const ACCENTS = THEMES.map((t) => hexToLab(t.accent));
const START = 1;

const COLORS = {
  dark: { stage: '#0A0A0D', ink: '#F5F5F7', sub: 'rgba(245, 245, 247, 0.65)', chip: 'rgba(255, 255, 255, 0.07)', line: 'rgba(255, 255, 255, 0.08)' },
  light: { stage: '#F6F5F2', ink: '#141418', sub: 'rgba(20, 20, 24, 0.65)', chip: 'rgba(20, 20, 24, 0.06)', line: 'rgba(20, 20, 24, 0.08)' },
} as const;

const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;

/** A phone's screen in a theme: status bar, a header, a chart card, a list and a button, all in views. */
function MiniPhone({ theme, width, height }: { theme: Theme; width: number; height: number }) {
  const u = width / 160;
  const bars = [0.42, 0.68, 0.5, 0.86, 0.62, 0.74, 0.95];
  return (
    <View style={{ width, height, backgroundColor: theme.bg, paddingHorizontal: 12 * u, paddingTop: 10 * u }}>
      <View style={styles.statusRow}>
        <Text style={{ color: theme.ink, fontSize: 7 * u, fontWeight: '700' }}>9:41</Text>
        <View style={{ flexDirection: 'row', gap: 2 * u }}>
          {[3, 5, 7].map((h) => (
            <View key={h} style={{ width: 2.4 * u, height: h * u, borderRadius: u, backgroundColor: theme.ink, alignSelf: 'flex-end' }} />
          ))}
        </View>
      </View>
      <Text style={{ color: theme.muted, fontSize: 7.5 * u, fontWeight: '600', marginTop: 14 * u }}>Good morning</Text>
      <Text style={{ color: theme.ink, fontSize: 15 * u, fontWeight: '800', letterSpacing: -0.3 * u }}>Your week</Text>
      <View style={{ backgroundColor: theme.surface, borderRadius: 12 * u, padding: 9 * u, marginTop: 10 * u }}>
        <Text style={{ color: theme.muted, fontSize: 6.5 * u, fontWeight: '600' }}>Focus time</Text>
        <Text style={{ color: theme.ink, fontSize: 13 * u, fontWeight: '800' }}>18 h 40 m</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 * u, height: 40 * u, marginTop: 6 * u }}>
          {bars.map((b, i) => (
            <View key={i} style={{ flex: 1, height: `${b * 100}%`, borderRadius: 3 * u, backgroundColor: theme.accent, opacity: i === 6 ? 1 : 0.35 + b * 0.4 }} />
          ))}
        </View>
      </View>
      {['Design review', 'Long walk', 'Read: chapter 4'].map((row, i) => (
        <View key={row} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 * u, marginTop: 8 * u }}>
          <View style={{ width: 16 * u, height: 16 * u, borderRadius: 8 * u, backgroundColor: i === 0 ? theme.accent : theme.surface, borderWidth: i === 0 ? 0 : u, borderColor: theme.muted }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.ink, fontSize: 7.5 * u, fontWeight: '700' }}>{row}</Text>
            <View style={{ height: 3 * u, width: `${70 - i * 15}%`, borderRadius: 2 * u, backgroundColor: theme.muted, opacity: 0.35, marginTop: 3 * u }} />
          </View>
        </View>
      ))}
      <View style={{ marginTop: 'auto', marginBottom: 12 * u, height: 26 * u, borderRadius: 13 * u, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: theme.onAccent, fontSize: 8 * u, fontWeight: '800' }}>Start a session</Text>
      </View>
    </View>
  );
}

/** Choosing an app theme: each cover a little phone in its palette, the chrome tinting as you swipe. */
function ThemesScreen({ scheme = 'dark' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(START);
  const [applied, setApplied] = useState(THEMES[START].key);
  const progress = useSharedValue(START);
  const coverW = Math.round(width * 0.44);
  const coverH = Math.round(coverW / 0.5);

  // The chrome follows the theme under the finger: OKLab between accents.
  const tint = useAnimatedStyle(() => {
    const p = Math.min(Math.max(progress.value, 0), ACCENTS.length - 1);
    const base = Math.floor(p);
    const t = p - base;
    const a = ACCENTS[base];
    const b = ACCENTS[Math.min(base + 1, ACCENTS.length - 1)];
    return { backgroundColor: labToRgba([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]) };
  });
  const tintText = useAnimatedStyle(() => {
    const p = Math.min(Math.max(progress.value, 0), ACCENTS.length - 1);
    const base = Math.floor(p);
    const t = p - base;
    const l = ACCENTS[base][0] + (ACCENTS[Math.min(base + 1, ACCENTS.length - 1)][0] - ACCENTS[base][0]) * t;
    return { color: l > 0.6 ? '#0B0B0E' : '#FFFFFF' };
  });

  const theme = THEMES[index];
  return (
    <View style={[styles.page, { backgroundColor: c.stage, paddingTop: insets.top + 14, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.kicker, { color: c.sub }]}>Settings · Appearance</Text>
          <Text style={[styles.title, { color: c.ink }]}>Pick a theme</Text>
        </View>
        <Animated.View style={[styles.dot, tint]} />
      </View>

      <AmbientCarousel
        data={THEMES}
        defaultIndex={START}
        progress={progress}
        onChange={setIndex}
        scheme={scheme}
        itemWidth={coverW}
        aspectRatio={0.5}
        visibleCount={5}
        accessibilityLabel="Theme"
        accessibilityLabelForItem={(t) => `${t.name}, ${t.note}`}
        onPress={(t) => setApplied(t.key)}
        renderCover={({ item }) => <MiniPhone theme={item} width={coverW} height={coverH} />}
        renderMeta={(t) => (
          <View style={styles.meta}>
            <Text style={[styles.name, { color: c.ink }]}>{t.name}</Text>
            <Text style={[styles.note, { color: c.sub }]}>{t.note}</Text>
          </View>
        )}
        style={styles.carousel}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={applied === theme.key ? `${theme.name} is your theme` : `Use ${theme.name}`}
        onPress={() => setApplied(theme.key)}
        style={({ pressed }) => [styles.applyWrap, { opacity: pressed ? 0.88 : 1 }, webPointer]}>
        <Animated.View style={[styles.apply, tint]}>
          <Animated.Text style={[styles.applyText, tintText]}>{applied === theme.key ? 'Your theme' : `Use ${theme.name}`}</Animated.Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 24 },
  kicker: { fontSize: 13, fontWeight: '600' },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8, marginTop: 2 },
  dot: { width: 28, height: 28, borderRadius: 14, marginBottom: 6 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  carousel: { marginTop: 'auto' },
  meta: { alignItems: 'center' },
  name: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  note: { fontSize: 15, marginTop: 4 },
  applyWrap: { marginTop: 'auto' },
  apply: { height: 54, borderRadius: 27, marginHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  applyText: { fontSize: 16, fontWeight: '800' },
});

/** The demo with a safe-area provider of its own, so it runs anywhere (UpFork's preview gives it none). */
export default function Themes({ scheme }: { scheme?: Scheme }) {
  return (
    <SafeAreaProvider>
      <ThemesScreen scheme={scheme} />
    </SafeAreaProvider>
  );
}
