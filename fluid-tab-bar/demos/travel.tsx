import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { FluidTabBar, TabIcons, type FluidTab } from '../components/fluid-tab-bar';
import type { Scheme } from '../lib/use-scheme';

const ACCENT = '#FF5A36';

const COLORS = {
  light: { page: '#FBF8F4', card: '#FFFFFF', text: '#17120E', muted: '#7A716A', line: 'rgba(23,18,14,0.07)' },
  dark: { page: '#0D0B0A', card: '#171412', text: '#F6F1EC', muted: '#968C84', line: 'rgba(255,255,255,0.07)' },
} as const;

const PLACES = {
  explore: { title: 'Dolomites', meta: 'Italy · 6 days', sky: ['#FFB38A', '#FF7A59'], hills: ['#5B3A6B', '#2E1E40'] },
  saved: { title: 'Lofoten', meta: 'Norway · saved in June', sky: ['#9FD3FF', '#5B8CFF'], hills: ['#1F3B57', '#0E1C2B'] },
  trips: { title: 'Kyoto', meta: 'Japan · 12 – 19 Nov', sky: ['#FFD6E0', '#FF8FAB'], hills: ['#4B2C3A', '#24141C'] },
  profile: { title: 'Atacama', meta: 'Chile · your next one?', sky: ['#FFE29A', '#FFAA4C'], hills: ['#6B3A1F', '#3A1E10'] },
} as const;

type Key = keyof typeof PLACES;

const NEARBY = [
  { title: 'Faroe Islands', meta: '4.9 · cliffs and puffins', price: '$1,240', sky: ['#BDE3F2', '#6FA8C7'], hills: ['#2F4A3A', '#17261D'] },
  { title: 'Wadi Rum', meta: '4.8 · nights under the stars', price: '$860', sky: ['#FFC48A', '#E9714A'], hills: ['#8A3F24', '#4A1F12'] },
] as const;

/** A travel app: the focused tab grows to show its label, in a warm accent of its own. */
export default function Travel({ scheme = 'light' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const [tab, setTab] = useState<Key>('explore');
  const place = PLACES[tab];

  const tabs: FluidTab[] = [
    { key: 'explore', label: 'Explore', icon: TabIcons.Compass },
    { key: 'saved', label: 'Saved', icon: TabIcons.Heart, badge: 2 },
    { key: 'trips', label: 'Trips', icon: TabIcons.Ticket },
    { key: 'profile', label: 'Profile', icon: TabIcons.User },
  ];
  const heading = { explore: 'Where to next?', saved: 'Saved places', trips: 'Upcoming trips', profile: 'Your travels' }[tab];

  return (
    <View style={[styles.page, { backgroundColor: c.page }]}>
      <Fade key={tab}>
        <Text style={[styles.kicker, { color: ACCENT }]}>{tabs.find((t) => t.key === tab)?.label}</Text>
        <Text style={[styles.title, { color: c.text }]}>{heading}</Text>

        <View style={styles.hero}>
          <Landscape name={place.title} sky={place.sky} hills={place.hills} />
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>{place.title}</Text>
            <Text style={styles.heroMeta}>{place.meta}</Text>
          </View>
        </View>

        <View style={styles.row}>
          {['Flights', 'Stays', 'Guides'].map((label, i) => (
            <View key={label} style={[styles.chip, { backgroundColor: c.card, borderColor: c.line }]}>
              <Text style={[styles.chipValue, { color: c.text }]}>{[3, 2, 5][i]}</Text>
              <Text style={[styles.chipLabel, { color: c.muted }]}>{label}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.section, { color: c.text }]}>Popular this week</Text>
        {NEARBY.map((spot) => (
          <View key={spot.title} style={[styles.spot, { backgroundColor: c.card, borderColor: c.line }]}>
            <View style={styles.thumb}>
              <Landscape name={spot.title} sky={spot.sky} hills={spot.hills} />
            </View>
            <View style={styles.spotText}>
              <Text style={[styles.spotTitle, { color: c.text }]}>{spot.title}</Text>
              <Text style={[styles.spotMeta, { color: c.muted }]}>{spot.meta}</Text>
            </View>
            <Text style={[styles.price, { color: c.text }]}>{spot.price}</Text>
          </View>
        ))}
      </Fade>

      <View style={styles.dock}>
        <FluidTabBar
          scheme={scheme}
          variant="expand"
          tint={ACCENT}
          tabs={tabs}
          value={tab}
          onChange={(key) => setTab(key as Key)}
        />
      </View>
    </View>
  );
}

/** A sky, a sun and two ridges, drawn in code. */
function Landscape({ name, sky, hills }: { name: string; sky: readonly [string, string]; hills: readonly [string, string] }) {
  // Gradient ids are the page's on the web: each landscape needs its own.
  const id = (part: string) => `${name.replace(/\W+/g, '-')}-${part}`;
  return (
    <Svg width="100%" height="100%" viewBox="0 0 335 230" preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={sky[0]} />
          <Stop offset="1" stopColor={sky[1]} />
        </LinearGradient>
        <LinearGradient id={id('far')} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={hills[0]} />
          <Stop offset="1" stopColor={hills[1]} />
        </LinearGradient>
        <LinearGradient id={id('near')} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={hills[1]} />
          <Stop offset="1" stopColor={hills[1]} />
        </LinearGradient>
      </Defs>
      <Rect width="335" height="230" fill={`url(#${id('sky')})`} />
      <Circle cx="236" cy="92" r="34" fill="#FFF6E8" opacity={0.92} />
      <Circle cx="236" cy="92" r="58" fill="#FFF6E8" opacity={0.12} />
      <Path d="M0 160 L52 112 L92 140 L150 84 L206 134 L252 104 L335 150 L335 230 L0 230 Z" fill={`url(#${id('far')})`} />
      <Path d="M0 192 L70 150 L128 176 L190 136 L262 178 L335 160 L335 230 L0 230 Z" fill={`url(#${id('near')})`} />
    </Svg>
  );
}

function Fade({ children }: { children: ReactNode }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
  }, [t]);
  const style = useAnimatedStyle(() => ({ opacity: t.value, transform: [{ translateY: (1 - t.value) * 10 }] }));
  return <Animated.View style={[styles.fade, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingTop: 64 },
  fade: { paddingHorizontal: 20 },
  kicker: { fontSize: 13, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.6, marginTop: 6 },
  hero: { height: 250, borderRadius: 28, overflow: 'hidden', marginTop: 22 },
  heroText: { position: 'absolute', left: 20, bottom: 18, gap: 2 },
  heroTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: '700', letterSpacing: -0.4 },
  heroMeta: { color: 'rgba(255,255,255,0.82)', fontSize: 14, fontWeight: '500' },
  row: { flexDirection: 'row', gap: 10, marginTop: 14 },
  chip: { flex: 1, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 14, paddingHorizontal: 14, gap: 2 },
  chipValue: { fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  chipLabel: { fontSize: 13, fontWeight: '500' },
  section: { fontSize: 17, fontWeight: '700', marginTop: 24, marginBottom: 10 },
  spot: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 10, marginBottom: 10 },
  thumb: { width: 52, height: 52, borderRadius: 13, overflow: 'hidden' },
  spotText: { flex: 1, gap: 2 },
  spotTitle: { fontSize: 15, fontWeight: '600' },
  spotMeta: { fontSize: 13 },
  price: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'], marginRight: 6 },
  dock: { position: 'absolute', left: 20, right: 20, bottom: 30 },
});
