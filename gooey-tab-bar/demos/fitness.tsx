import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { GooeyIcons, GooeyTabBar, type GooeyIcon, type GooeyTab } from '../components/gooey-tab-bar';
import type { Scheme } from '../lib/use-scheme';

const COLORS = {
  dark: {
    page: '#0A0C0A',
    card: '#141814',
    ink: '#F1F5EC',
    muted: '#8B9486',
    line: 'rgba(241, 245, 236, 0.07)',
    lime: '#C6FF3D',
    onLime: '#0E1206',
    bar: '#121612',
    icon: '#6F786B',
    center: '#F1F5EC',
    onCenter: '#0E1206',
    ring2: '#58D3FF',
    ring3: '#FF6B8B',
  },
  light: {
    page: '#F2F4EE',
    card: '#FFFFFF',
    ink: '#121612',
    muted: '#6B7466',
    line: 'rgba(18, 22, 18, 0.07)',
    lime: '#9BE000',
    onLime: '#0E1206',
    bar: '#FFFFFF',
    icon: '#8C9488',
    center: '#121612',
    onCenter: '#F1F5EC',
    ring2: '#1BA9E0',
    ring3: '#F0476E',
  },
} as const;

const svg = (children: (c: string) => ReactNode): GooeyIcon =>
  function Icon({ color, size }) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {children(color)}
      </Svg>
    );
  };

const TodayIcon: GooeyIcon = ({ color, size, focused }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={8} stroke={color} strokeWidth={focused ? 2.6 : 1.75} />
    <Circle cx={12} cy={12} r={4} stroke={color} strokeWidth={focused ? 2.6 : 1.75} />
  </Svg>
);
const WorkoutIcon = svg((c) => (
  <>
    <Path d="M4 9.5v5M7 7.5v9M17 7.5v9M20 9.5v5M7 12h10" stroke={c} strokeWidth={2} strokeLinecap="round" />
  </>
));
const PlayIcon: GooeyIcon = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M8.5 5.8v12.4a.9.9 0 0 0 1.38.76l9.8-6.2a.9.9 0 0 0 0-1.52l-9.8-6.2A.9.9 0 0 0 8.5 5.8Z" fill={color} />
  </Svg>
);
const RunIcon = svg((c) => (
  <>
    <Circle cx={14.5} cy={4.8} r={1.8} fill={c} />
    <Path d="m6 20 3.5-4.5 2.5 1.5 1-4 3 2.5h3M9 10.5l3-2.5 3 .5 1.5 3" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </>
));
const RideIcon = svg((c) => (
  <>
    <Circle cx={6} cy={16} r={3.6} stroke={c} strokeWidth={2} />
    <Circle cx={18} cy={16} r={3.6} stroke={c} strokeWidth={2} />
    <Path d="M6 16 9.5 9h5l3.5 7M9.5 9 8.5 6.5H7M14 6.5h2" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </>
));
const SwimIcon = svg((c) => (
  <>
    <Path d="M3 17c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1" stroke={c} strokeWidth={2} strokeLinecap="round" />
    <Path d="m7 13 4-4 3 2.5" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx={16.5} cy={8} r={1.8} fill={c} />
  </>
));

/** A training app on the cradle: the bubble sits in a notch that flows along the bar, and "Start" blooms sports. */
function FitnessScreen({ scheme = 'dark' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const [tab, setTab] = useState(0);
  const tabs: GooeyTab[] = [
    { key: 'today', label: 'Today', icon: TodayIcon },
    { key: 'workouts', label: 'Workouts', icon: WorkoutIcon },
    { key: 'stats', label: 'Stats', icon: GooeyIcons.chart, badge: 'dot' },
    { key: 'me', label: 'Me', icon: GooeyIcons.user },
  ];
  return (
    <View style={[styles.page, { backgroundColor: c.page }]}>
      {/* Every screen stays mounted: switching only cross-fades, so the bar's flight never waits for a render. */}
      <Fade active={tab === 0}>
        <Today scheme={scheme} />
      </Fade>
      {['Workouts', 'Stats', 'Me'].map((title, i) => (
        <Fade key={title} active={tab === i + 1}>
          <Placeholder scheme={scheme} title={title} />
        </Fade>
      ))}
      <GooeyTabBar
        scheme={scheme}
        variant="cradle"
        tabs={tabs}
        index={tab}
        onChange={setTab}
        colors={{ bar: c.bar, bubble: c.lime, onBubble: c.onLime, icon: c.icon, label: c.icon, center: c.center, onCenter: c.onCenter }}
        centerAction={{
          label: 'Start',
          icon: PlayIcon,
          actions: [
            { key: 'run', label: 'Run', icon: RunIcon, onPress: () => setTab(1) },
            { key: 'ride', label: 'Ride', icon: RideIcon, onPress: () => setTab(1) },
            { key: 'swim', label: 'Swim', icon: SwimIcon, onPress: () => setTab(1) },
          ],
        }}
      />
    </View>
  );
}

function Today({ scheme }: { scheme: Scheme }) {
  const c = COLORS[scheme];
  const insets = useSafeAreaInsets();
  const week = [0.5, 0.8, 0.35, 0.95, 0.7, 0.2, 0.62];
  return (
    <ScrollView contentContainerStyle={[styles.screen, { paddingTop: insets.top + 18, paddingBottom: 160 + insets.bottom }]}>
      <Text style={[styles.kicker, { color: c.muted }]}>Tuesday · Week 42</Text>
      <Text style={[styles.title, { color: c.ink }]}>Today</Text>
      <View style={[styles.card, styles.rings, { backgroundColor: c.card, borderColor: c.line }]}>
        <Rings scheme={scheme} />
        <View style={styles.fill}>
          {[
            ['Move', '486 / 600 kcal', c.lime],
            ['Exercise', '32 / 45 min', c.ring2],
            ['Stand', '9 / 12 h', c.ring3],
          ].map(([label, value, color]) => (
            <View key={label} style={styles.ringRow}>
              <View style={[styles.swatch, { backgroundColor: color }]} />
              <View>
                <Text style={[styles.ringLabel, { color: c.muted }]}>{label}</Text>
                <Text style={[styles.ringValue, { color: c.ink }]}>{value}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.line }]}>
        <Text style={[styles.cardTitle, { color: c.ink }]}>This week</Text>
        <Svg width="100%" height={110} viewBox="0 0 300 110">
          {week.map((v, i) => (
            <Rect key={i} x={10 + i * 42} y={100 - v * 90} width={22} height={v * 90} rx={8} fill={i === 3 ? c.lime : c.line} />
          ))}
        </Svg>
        <View style={styles.days}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <Text key={i} style={[styles.day, { color: i === 3 ? c.ink : c.muted }]}>{d}</Text>
          ))}
        </View>
      </View>
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.line }]}>
        <Text style={[styles.cardTitle, { color: c.ink }]}>Today's plan</Text>
        <Text style={[styles.plan, { color: c.muted }]}>Tempo run · 6 km at 5:10 /km, then 10 min of mobility.</Text>
      </View>
    </ScrollView>
  );
}

function Rings({ scheme }: { scheme: Scheme }) {
  const c = COLORS[scheme];
  const ring = (r: number, p: number, color: string) => {
    const length = 2 * Math.PI * r;
    return (
      <>
        <Circle cx={60} cy={60} r={r} stroke={color} strokeOpacity={0.18} strokeWidth={11} fill="none" />
        <Circle
          cx={60}
          cy={60}
          r={r}
          stroke={color}
          strokeWidth={11}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${length * p} ${length}`}
          transform="rotate(-90 60 60)"
        />
      </>
    );
  };
  return (
    <Svg width={120} height={120} viewBox="0 0 120 120">
      {ring(52, 0.81, c.lime)}
      {ring(38, 0.71, c.ring2)}
      {ring(24, 0.75, c.ring3)}
    </Svg>
  );
}

function Placeholder({ scheme, title }: { scheme: Scheme; title: string }) {
  const c = COLORS[scheme];
  const insets = useSafeAreaInsets();
  const rows = {
    Workouts: ['Tempo run · 38 min', 'Upper body · 45 min', 'Easy ride · 1 h 10 min', 'Pool intervals · 30 min'],
    Stats: ['Resting heart rate · 52 bpm', 'VO₂ max · 48', 'Sleep · 7 h 42 min', 'Weekly distance · 31 km'],
    Me: ['Goals', 'Devices', 'Units', 'Privacy'],
  }[title] ?? [];
  return (
    <ScrollView contentContainerStyle={[styles.screen, { paddingTop: insets.top + 18, paddingBottom: 160 }]}>
      <Text style={[styles.title, { color: c.ink }]}>{title}</Text>
      {rows.map((row) => (
        <View key={row} style={[styles.card, styles.row, { backgroundColor: c.card, borderColor: c.line }]}>
          <Text style={[styles.rowText, { color: c.ink }]}>{row}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  fill: { flex: 1 },
  screen: { paddingHorizontal: 20, gap: 12 },
  kicker: { fontSize: 13, fontWeight: '600' },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8, marginBottom: 4 },
  card: { borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, padding: 16 },
  rings: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  ringRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 5 },
  swatch: { width: 10, height: 10, borderRadius: 5 },
  ringLabel: { fontSize: 12, fontWeight: '600' },
  ringValue: { fontSize: 15, fontWeight: '700', marginTop: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  days: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: '3%' },
  day: { fontSize: 12, fontWeight: '600', width: 22, textAlign: 'center' },
  plan: { fontSize: 15, lineHeight: 21 },
  row: { paddingVertical: 18 },
  rowText: { fontSize: 16, fontWeight: '600' },
});

function Fade({ active, children }: { active: boolean; children: ReactNode }) {
  const style = useAnimatedStyle(() => ({ opacity: withTiming(active ? 1 : 0, { duration: 220 }) }), [active]);
  return (
    <Animated.View pointerEvents={active ? 'auto' : 'none'} style={[StyleSheet.absoluteFill, style]}>
      {children}
    </Animated.View>
  );
}

/** The demo with a safe-area provider of its own, so it runs anywhere (UpFork's preview gives it none). */
export default function Fitness({ scheme }: { scheme?: Scheme }) {
  return (
    <SafeAreaProvider>
      <FitnessScreen scheme={scheme} />
    </SafeAreaProvider>
  );
}
