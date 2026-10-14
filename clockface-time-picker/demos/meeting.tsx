import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';

import { Clockface, formatDuration, toMinutes, type TimeRange, type TimeValue } from '../components/clockface-time-picker';
import type { Scheme } from '../lib/use-scheme';

const COLORS = {
  light: { page: '#F4F3EF', ink: '#17161D', muted: '#6E6C78', chip: '#FFFFFF', chipLine: 'rgba(23, 22, 29, 0.08)', chipOn: '#17161D', onChipOn: '#FFFFFF', off: '#B6B4BE', button: '#FF7A1A', onButton: '#1B1206' },
  dark: { page: '#0B0B0E', ink: '#F3F3F7', muted: '#9A9AA6', chip: '#16161B', chipLine: 'rgba(255, 255, 255, 0.07)', chipOn: '#F3F3F7', onChipOn: '#0B0B0E', off: '#4C4C57', button: '#FF7A1A', onButton: '#1B1206' },
} as const;

const DAYS = [
  { key: 'mon', day: 'Mon', date: 14, full: false },
  { key: 'tue', day: 'Tue', date: 15, full: false },
  { key: 'wed', day: 'Wed', date: 16, full: true },
  { key: 'thu', day: 'Thu', date: 17, full: false },
  { key: 'fri', day: 'Fri', date: 18, full: true },
];
const LENGTHS = [15, 30, 45, 60];
const BOOKED = new Set([13 * 60 + 30, 13 * 60 + 45]);
const SVG_FONT = Platform.OS === 'web' ? 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' : undefined;
const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;

const isBooked = (t: TimeValue) => BOOKED.has(t.hours * 60 + t.minutes);

/** Booking a call: a day, then a range on the clock, with booked slots skipped and quick lengths. */
function MeetingScreen({ scheme = 'light' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const insets = useSafeAreaInsets();
  const [day, setDay] = useState('tue');
  const [range, setRange] = useState<TimeRange>({ start: { hours: 14, minutes: 0 }, end: { hours: 15, minutes: 0 } });
  const length = (((toMinutes(range.end) - toMinutes(range.start)) % 1440) + 1440) % 1440;

  const setLength = (minutes: number) => {
    const start = toMinutes(range.start);
    const end = (start + minutes) % 1440;
    setRange({ start: range.start, end: { hours: Math.floor(end / 60), minutes: end % 60 } });
  };

  return (
    <View style={[styles.page, { backgroundColor: c.page, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.header}>
        <Svg width={40} height={40} viewBox="0 0 40 40">
          <Circle cx={20} cy={20} r={20} fill="#8B6CF0" />
          <SvgText x={20} y={25} fontSize={14} fontWeight="800" fill="#FFFFFF" textAnchor="middle" fontFamily={SVG_FONT}>
            LB
          </SvgText>
        </Svg>
        <View style={styles.fill}>
          <Text style={[styles.title, { color: c.ink }]}>Schedule a call with Lena</Text>
          <Text style={[styles.subtitle, { color: c.muted }]}>Lena Brandt · Product design review</Text>
        </View>
      </View>

      <View style={styles.days}>
        {DAYS.map((d) => {
          const on = day === d.key;
          return (
            <Pressable
              key={d.key}
              accessibilityRole="button"
              accessibilityState={{ selected: on, disabled: d.full }}
              accessibilityLabel={`${d.day} ${d.date}${d.full ? ', fully booked' : ''}`}
              disabled={d.full}
              onPress={() => setDay(d.key)}
              style={[styles.day, { backgroundColor: on ? c.chipOn : c.chip, borderColor: c.chipLine }, d.full ? null : webPointer]}>
              <Text style={[styles.dayName, { color: on ? c.onChipOn : d.full ? c.off : c.muted }]}>{d.day}</Text>
              <Text style={[styles.dayDate, { color: on ? c.onChipOn : d.full ? c.off : c.ink }, d.full ? styles.struck : null]}>{d.date}</Text>
            </Pressable>
          );
        })}
      </View>

      <Clockface
        mode="range"
        layout="stacked"
        clockSize={220}
        value={range}
        onChange={(v) => {
          if ('start' in v) setRange(v);
        }}
        step={15}
        hourCycle={24}
        isDisabled={isBooked}
        minDuration={15}
        maxDuration={180}
        showNumerals="quarters"
        scheme={scheme}
        style={styles.picker}
      />

      <View style={styles.lengths}>
        {LENGTHS.map((m) => {
          const on = length === m;
          return (
            <Pressable
              key={m}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => setLength(m)}
              style={[styles.length, { backgroundColor: on ? c.chipOn : c.chip, borderColor: c.chipLine }, webPointer]}>
              <Text style={[styles.lengthText, { color: on ? c.onChipOn : c.ink }]}>{m} min</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.zone}>
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
          <Circle cx={12} cy={12} r={8.5} stroke={c.muted} strokeWidth={1.8} />
          <Path d="M3.5 12h17M12 3.5c2.6 2.6 2.6 14.4 0 17M12 3.5c-2.6 2.6-2.6 14.4 0 17" stroke={c.muted} strokeWidth={1.6} />
        </Svg>
        <Text style={[styles.zoneText, { color: c.muted }]}>Times in Lisbon (GMT+1)</Text>
      </View>

      <Pressable accessibilityRole="button" style={({ pressed }) => [styles.cta, { backgroundColor: c.button, opacity: pressed ? 0.85 : 1 }, webPointer]}>
        <Text style={[styles.ctaText, { color: c.onButton }]}>Book {formatDuration(length)} call</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 16 },
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { fontSize: 13, marginTop: 2 },
  days: { flexDirection: 'row', gap: 8, marginTop: 14 },
  day: { flex: 1, height: 56, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  dayName: { fontSize: 12, fontWeight: '600' },
  dayDate: { fontSize: 17, fontWeight: '800', marginTop: 1 },
  struck: { textDecorationLine: 'line-through' },
  picker: { marginTop: 12 },
  lengths: { flexDirection: 'row', gap: 8, marginTop: 12 },
  length: { flex: 1, height: 44, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  lengthText: { fontSize: 14, fontWeight: '700' },
  zone: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginTop: 12 },
  zoneText: { fontSize: 13, fontWeight: '500' },
  cta: { height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', marginTop: 'auto' },
  ctaText: { fontSize: 16, fontWeight: '800' },
});

/** The demo with a safe-area provider of its own, so it runs anywhere (UpFork's preview gives it none). */
export default function Meeting({ scheme }: { scheme?: Scheme }) {
  return (
    <SafeAreaProvider>
      <MeetingScreen scheme={scheme} />
    </SafeAreaProvider>
  );
}
