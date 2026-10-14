import { useEffect, useId, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { MorphNumber, MorphText } from '../components/morph-text';
import type { Scheme } from '../lib/use-scheme';

const COLORS = {
  light: {
    page: '#F5F5F2',
    card: '#FFFFFF',
    ink: '#111114',
    muted: '#6A6A73',
    faint: '#9A9AA3',
    line: 'rgba(17, 17, 20, 0.07)',
    track: 'rgba(17, 17, 20, 0.06)',
    thumb: '#FFFFFF',
    up: '#15803D',
    upBg: 'rgba(22, 163, 74, 0.12)',
    down: '#C02E34',
    downBg: 'rgba(229, 72, 77, 0.11)',
    chart: '#15803D',
  },
  dark: {
    page: '#0A0A0D',
    card: '#141419',
    ink: '#F4F4F6',
    muted: '#90909B',
    faint: '#6E6E79',
    line: 'rgba(255, 255, 255, 0.07)',
    track: 'rgba(255, 255, 255, 0.07)',
    thumb: '#2A2A31',
    up: '#4ADE80',
    upBg: 'rgba(74, 222, 128, 0.13)',
    down: '#FF7A7F',
    downBg: 'rgba(255, 99, 105, 0.14)',
    chart: '#4ADE80',
  },
} as const;

type Asset = { id: string; name: string; kind: string; units: number; price: number; hue: [string, string]; glyph: string };

// Invented holdings: no real companies, funds or tickers.
const ASSETS: Asset[] = [
  { id: 'kelp', name: 'Kelp Index', kind: 'Ocean farms', units: 42, price: 318.42, hue: ['#3FB7A0', '#1F6F8B'], glyph: 'M8 18c2.5-3 5-3 8 0s5.5 3 8 0M8 13c2.5-3 5-3 8 0s5.5 3 8 0' },
  { id: 'nimbus', name: 'Nimbus Bond', kind: 'Weather notes', units: 120, price: 96.18, hue: ['#B79CFF', '#5B4BD6'], glyph: 'M10 20h12a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 10 20Z' },
  { id: 'ember', name: 'Ember Grid', kind: 'Solar storage', units: 18, price: 742.9, hue: ['#FFB36B', '#E5603A'], glyph: 'M16 7c4 4 6 7 6 10a6 6 0 0 1-12 0c0-2 1-3.5 2.5-5 .5 2 1.5 3 3 3-1-3 0-6 .5-8Z' },
  { id: 'quill', name: 'Quill Paper', kind: 'Recycled fibre', units: 260, price: 21.37, hue: ['#9AD8FF', '#3C82D9'], glyph: 'M9 23c5-1 9-5 13-14-6 2-10 6-12 11M9 23l4-4' },
  { id: 'orchard', name: 'Orchard Fund', kind: 'Farmland', units: 55, price: 184.05, hue: ['#A6E07A', '#3E9B4F'], glyph: 'M16 8c-4 0-7 3-7 7s3 8 7 8 7-4 7-8-3-7-7-7Zm0 0c0-2 1-3 3-4' },
  { id: 'juniper', name: 'Juniper Rail', kind: 'Night trains', units: 33, price: 402.6, hue: ['#F3A6C8', '#C2457E'], glyph: 'M10 9h12v10H10zM10 15h12M12 22l-2 3M20 22l2 3' },
];

const PERIODS = [
  { key: '1D', label: 'Past day', pct: 0.0256, seed: 3 },
  { key: '1W', label: 'Past week', pct: 0.0811, seed: 11 },
  { key: '1M', label: 'Past month', pct: -0.0342, seed: 29 },
  { key: '1Y', label: 'Past year', pct: 0.4127, seed: 47 },
] as const;

const POINTS = 40;
const CHART_H = 132;
const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;

/** A small seeded random walk that ends at 1 and starts at 1 / (1 + pct). */
function series(pct: number, seed: number): number[] {
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const start = 1 / (1 + pct);
  const out: number[] = [];
  let noise = 0;
  for (let i = 0; i < POINTS; i++) {
    const t = i / (POINTS - 1);
    noise = noise * 0.7 + (rand() - 0.5) * 0.06;
    const swell = Math.sin(t * Math.PI * (1.4 + (seed % 3) * 0.5)) * 0.018;
    const taper = Math.sin(Math.PI * t); // the walk starts and ends exactly on its values
    out.push(start + (1 - start) * t + (noise + swell) * taper * Math.max(0.15, Math.abs(1 - start) * 2.4));
  }
  return out;
}

/** Heights in the chart, the lowest point near the bottom and the highest near the top. */
function scale(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values.map((v) => CHART_H - 10 - ((v - min) / span) * (CHART_H - 26));
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

function Chart({ points, color, width, id }: { points: number[]; color: string; width: number; id: string }) {
  const from = useSharedValue(points);
  const to = useSharedValue(points);
  const t = useSharedValue(1);
  useEffect(() => {
    const now = from.value.map((y, i) => y + (to.value[i] - y) * t.value);
    from.value = now;
    to.value = points;
    t.value = 0;
    t.value = withTiming(1, { duration: 520, easing: Easing.bezier(0.22, 0.9, 0.24, 1) });
  }, [points, from, to, t]);

  const line = useAnimatedProps(() => ({ d: smooth(from.value, to.value, t.value, width, false) }));
  const area = useAnimatedProps(() => ({ d: smooth(from.value, to.value, t.value, width, true) }));
  return (
    <Svg width={width} height={CHART_H}>
      <Defs>
        <LinearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.22} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <AnimatedPath animatedProps={area} fill={`url(#${id}-fill)`} />
      <AnimatedPath animatedProps={line} stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** A smooth curve through the points (between two sets, at `t`), optionally closed as an area. */
function smooth(a: number[], b: number[], t: number, width: number, closed: boolean): string {
  'worklet';
  const n = a.length;
  const step = width / (n - 1);
  const y = (i: number) => a[i] + (b[i] - a[i]) * t;
  let d = `M0 ${y(0).toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const y0 = y(Math.max(0, i - 1));
    const y1 = y(i);
    const y2 = y(i + 1);
    const y3 = y(Math.min(n - 1, i + 2));
    const x1 = i * step;
    const x2 = (i + 1) * step;
    d += ` C${(x1 + step / 3).toFixed(2)} ${(y1 + (y2 - y0) / 6).toFixed(2)} ${(x2 - step / 3).toFixed(2)} ${(y2 - (y3 - y1) / 6).toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  }
  if (closed) d += ` L${width} ${CHART_H} L0 ${CHART_H} Z`;
  return d;
}

/** A portfolio: a balance and six holdings whose prices tick every 1.2 s, and a period switch. */
function TickerScreen({ scheme = 'light' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const insets = useSafeAreaInsets();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [period, setPeriod] = useState(0);
  const [prices, setPrices] = useState(() => ASSETS.map((a) => a.price));
  const [opens] = useState(() => ASSETS.map((a, i) => a.price * (1 - [0.012, -0.008, 0.031, 0.004, -0.015, 0.022][i])));
  const [chartWidth, setChartWidth] = useState(0);

  useEffect(() => {
    let tick = 0;
    const timer = setInterval(() => {
      tick++;
      setPrices((list) =>
        list.map((p, i) => {
          // Two holdings move each tick, in a pattern that wanders both ways.
          if ((tick + i) % 3 !== 0) return p;
          const drift = Math.sin(tick * 1.7 + i * 2.3) * 0.006 + Math.cos(tick * 0.9 + i) * 0.003;
          return Math.round(p * (1 + drift) * 100) / 100;
        }),
      );
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  const balance = useMemo(() => Math.round(ASSETS.reduce((sum, a, i) => sum + a.units * prices[i], 0) * 100) / 100, [prices]);
  const p = PERIODS[period];
  const change = Math.round((balance - balance / (1 + p.pct)) * 100) / 100;
  const up = change >= 0;
  const points = useMemo(() => scale(series(PERIODS[period].pct, PERIODS[period].seed)), [period]);

  return (
    <View style={[styles.page, { backgroundColor: c.page }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Text style={[styles.title, { color: c.ink }]}>Portfolio</Text>
          <Segments value={period} onChange={setPeriod} scheme={scheme} />
        </View>

        <View style={styles.balanceBlock}>
          <Text style={[styles.caption, { color: c.muted }]}>Total balance</Text>
          <MorphNumber
            value={balance}
            format={{ style: 'currency', currency: 'EUR', locale: 'en-IE' }}
            style={[styles.balance, { color: c.ink }]}
          />
          <View style={styles.changeRow}>
            <View style={[styles.changePill, { backgroundColor: up ? c.upBg : c.downBg }]}>
              <MorphNumber
                value={p.pct}
                format={{ style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'exceptZero', locale: 'en-IE' }}
                style={[styles.changeText, { color: up ? c.up : c.down }]}
              />
            </View>
            <MorphNumber
              value={change}
              format={{ style: 'currency', currency: 'EUR', signDisplay: 'exceptZero', locale: 'en-IE' }}
              style={[styles.changeAbs, { color: up ? c.up : c.down }]}
            />
            <MorphText text={p.label.toLowerCase()} style={[styles.changeWhen, { color: c.muted }]} />
          </View>
        </View>

        <View style={styles.chart} onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}>
          {chartWidth > 0 ? <Chart points={points} color={up ? c.up : c.down} width={chartWidth} id={`${uid}c`} /> : null}
        </View>

        <View style={[styles.card, { backgroundColor: c.card }]}>
          <View style={styles.cardHead}>
            <Text style={[styles.cardTitle, { color: c.ink }]}>Holdings</Text>
            <Text style={[styles.cardNote, { color: c.faint }]}>Live · every 1.2 s</Text>
          </View>
          {ASSETS.map((asset, i) => {
            const day = prices[i] / opens[i] - 1;
            const rising = day >= 0;
            return (
              <View key={asset.id} style={[styles.row, i > 0 && { borderTopColor: c.line, borderTopWidth: 1 }]}>
                <Mark id={`${uid}${asset.id}`} hue={asset.hue} glyph={asset.glyph} />
                <View style={styles.rowText}>
                  <Text style={[styles.rowName, { color: c.ink }]}>{asset.name}</Text>
                  <Text style={[styles.rowKind, { color: c.muted }]}>
                    {asset.units} units · {asset.kind}
                  </Text>
                </View>
                <View style={styles.rowEnd}>
                  <MorphNumber
                    value={prices[i]}
                    format={{ style: 'currency', currency: 'EUR', locale: 'en-IE' }}
                    style={[styles.rowPrice, { color: c.ink }]}
                    align="end"
                    trend
                    scheme={scheme}
                  />
                  <View style={[styles.pct, { backgroundColor: rising ? c.upBg : c.downBg }]}>
                    <MorphNumber
                      value={day}
                      format={{ style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'exceptZero', locale: 'en-IE' }}
                      style={[styles.pctText, { color: rising ? c.up : c.down }]}
                      align="end"
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function Segments({ value, onChange, scheme }: { value: number; onChange: (i: number) => void; scheme: Scheme }) {
  const c = COLORS[scheme];
  const x = useSharedValue(value);
  useEffect(() => {
    x.value = withSpring(value, { stiffness: 320, damping: 30 });
  }, [value, x]);
  const SEG = 40;
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * SEG }] }));
  return (
    <View style={[styles.segments, { backgroundColor: c.track }]} accessibilityRole="tablist">
      <Animated.View style={[styles.segThumb, { width: SEG, backgroundColor: c.thumb }, thumb]} />
      {PERIODS.map((p, i) => (
        <Pressable
          key={p.key}
          onPress={() => onChange(i)}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === i }}
          accessibilityLabel={p.label}
          style={[styles.seg, { width: SEG }, webPointer]}
        >
          <Text style={[styles.segText, { color: value === i ? c.ink : c.muted }]}>{p.key}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Mark({ id, hue, glyph }: { id: string; hue: [string, string]; glyph: string }) {
  return (
    <Svg width={40} height={40} viewBox="0 0 32 32">
      <Defs>
        <LinearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={hue[0]} />
          <Stop offset="1" stopColor={hue[1]} />
        </LinearGradient>
      </Defs>
      <Path d="M16 0a16 16 0 1 1 0 32 16 16 0 0 1 0-32Z" fill={`url(#${id}-g)`} />
      <Path d={glyph} stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 44 },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  segments: { flexDirection: 'row', height: 32, borderRadius: 10, padding: 2 },
  segThumb: { position: 'absolute', top: 2, left: 2, height: 28, borderRadius: 8 },
  seg: { height: 28, alignItems: 'center', justifyContent: 'center' },
  segText: { fontSize: 13, fontWeight: '700' },
  balanceBlock: { paddingHorizontal: 20, marginTop: 18 },
  caption: { fontSize: 14, fontWeight: '600' },
  balance: { fontSize: 40, fontWeight: '800', letterSpacing: -1.2, marginTop: 4 },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  changePill: { height: 26, borderRadius: 13, paddingHorizontal: 9, justifyContent: 'center' },
  changeText: { fontSize: 13, fontWeight: '800' },
  changeAbs: { fontSize: 14, fontWeight: '700' },
  changeWhen: { fontSize: 14, fontWeight: '500' },
  chart: { marginTop: 14, marginHorizontal: 20, height: CHART_H },
  card: { marginHorizontal: 16, marginTop: 14, borderRadius: 24, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  cardHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 },
  cardTitle: { fontSize: 17, fontWeight: '800' },
  cardNote: { fontSize: 12, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  rowText: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '700' },
  rowKind: { fontSize: 12, marginTop: 2 },
  rowEnd: { alignItems: 'flex-end', gap: 4 },
  rowPrice: { fontSize: 15, fontWeight: '700' },
  pct: { height: 22, borderRadius: 11, paddingHorizontal: 7, justifyContent: 'center' },
  pctText: { fontSize: 12, fontWeight: '800' },
});

/** The demo with a safe-area provider of its own, so it runs anywhere (UpFork's preview gives it none). */
export default function TickerDemo({ scheme }: { scheme?: Scheme }) {
  return (
    <SafeAreaProvider>
      <TickerScreen scheme={scheme} />
    </SafeAreaProvider>
  );
}
