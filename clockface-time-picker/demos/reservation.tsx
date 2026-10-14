import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Clockface, formatTime, toMinutes, type TimeValue } from '../components/clockface-time-picker';
import type { Scheme } from '../lib/use-scheme';

const COLORS = {
  light: { page: '#F7F3EE', card: '#FFFFFF', ink: '#1D1714', muted: '#776B63', line: 'rgba(29, 23, 20, 0.08)', chip: '#FFFFFF', chipOn: '#1D1714', onChipOn: '#FFFFFF', accent: '#C2410C', onAccent: '#FFFFFF', tile: '#F3E3D3', dot: '#2F9E6A' },
  dark: { page: '#0C0A09', card: '#171412', ink: '#F5EFEA', muted: '#A39589', line: 'rgba(245, 239, 234, 0.08)', chip: '#171412', chipOn: '#F5EFEA', onChipOn: '#0C0A09', accent: '#F97316', onAccent: '#1A0B02', tile: '#2A201A', dot: '#3DBB7E' },
} as const;

// Tables already taken on the evening (every 15 minutes from 17:30 to 22:30).
const TAKEN = new Set(['18:00', '18:15', '18:45', '19:00', '19:15', '19:30', '20:30', '20:45', '21:00', '21:30', '22:15']);
const isTaken = (t: TimeValue) => TAKEN.has(`${t.hours}:${t.minutes < 10 ? `0${t.minutes}` : t.minutes}`);
const PARTY = [1, 2, 3, 4, 5, 6];
const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;

/** A restaurant booking: the clock beside the wheel, a window from 17:30 to 22:30, and taken tables skipped. */
function ReservationScreen({ scheme = 'light' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const insets = useSafeAreaInsets();
  const [party, setParty] = useState(2);
  const [time, setTime] = useState<TimeValue>({ hours: 19, minutes: 45 });
  const [seat, setSeat] = useState('Terrace');
  const [occasion, setOccasion] = useState('None');
  const label = formatTime(toMinutes(time), 24).time;

  return (
    <View style={[styles.page, { backgroundColor: c.page, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <View style={[styles.place, { backgroundColor: c.card, borderColor: c.line }]}>
        <View style={[styles.tile, { backgroundColor: c.tile }]}>
          <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
            <Path d="M7 3v8a2 2 0 0 0 4 0V3M9 11v10M16.5 3c-1.8 1-2.7 3.1-2.7 6v3.2H17V21" stroke={c.accent} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
        <View style={styles.fill}>
          <Text style={[styles.name, { color: c.ink }]}>Osteria Lume</Text>
          <Text style={[styles.meta, { color: c.muted }]}>Seasonal Italian · Alfama</Text>
          <View style={styles.ratingRow}>
            <Svg width={13} height={13} viewBox="0 0 24 24">
              <Path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" fill="#F5A524" />
            </Svg>
            <Text style={[styles.rating, { color: c.ink }]}>4.8</Text>
            <Text style={[styles.meta, { color: c.muted }]}>· 412 reviews</Text>
          </View>
        </View>
      </View>

      <Text style={[styles.heading, { color: c.ink }]}>Table for {party} · Fri 18</Text>
      <View style={styles.party}>
        {PARTY.map((n) => (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityLabel={`${n} ${n === 1 ? 'guest' : 'guests'}`}
            accessibilityState={{ selected: party === n }}
            onPress={() => setParty(n)}
            style={[styles.partyChip, { backgroundColor: party === n ? c.chipOn : c.chip, borderColor: c.line }, webPointer]}>
            <Text style={[styles.partyText, { color: party === n ? c.onChipOn : c.ink }]}>{n}</Text>
          </Pressable>
        ))}
      </View>

      <Clockface
        value={time}
        onChange={(v) => {
          if ('hours' in v) setTime(v);
        }}
        layout="side"
        clockSize={124}
        step={15}
        hourCycle={24}
        min={{ hours: 17, minutes: 30 }}
        max={{ hours: 22, minutes: 30 }}
        isDisabled={isTaken}
        showNumerals="quarters"
        accent={c.accent}
        accessibilityLabel="Reservation time"
        scheme={scheme}
        style={styles.picker}
      />

      <View style={styles.legend}>
        <View style={[styles.legendDot, { backgroundColor: c.dot }]} />
        <Text style={[styles.legendText, { color: c.muted }]}>Open</Text>
        <Text style={[styles.legendText, styles.struck, { color: c.muted }]}>19:00</Text>
        <Text style={[styles.legendText, { color: c.muted }]}>Taken</Text>
      </View>

      <Choice title="Seating" options={['Inside', 'Terrace', 'Bar counter']} value={seat} onPick={setSeat} colors={c} />
      <Choice title="Occasion" options={['None', 'Birthday', 'Anniversary']} value={occasion} onPick={setOccasion} colors={c} />

      <View style={[styles.confirm, { backgroundColor: c.card, borderColor: c.line }]}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Rect x={3.5} y={5} width={17} height={15} rx={3} stroke={c.muted} strokeWidth={1.7} />
          <Path d="M3.5 10h17M8 3v4M16 3v4" stroke={c.muted} strokeWidth={1.7} strokeLinecap="round" />
          <Circle cx={12} cy={15} r={1.6} fill={c.accent} />
        </Svg>
        <View style={styles.fill}>
          <Text style={[styles.confirmTitle, { color: c.ink }]}>Fri 18 · {label}</Text>
          <Text style={[styles.meta, { color: c.muted }]}>Table for {party} · held for 15 minutes</Text>
        </View>
        <Pressable accessibilityRole="button" style={({ pressed }) => [styles.reserve, { backgroundColor: c.accent, opacity: pressed ? 0.85 : 1 }, webPointer]}>
          <Text style={[styles.reserveText, { color: c.onAccent }]}>Reserve</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Choice({
  title,
  options,
  value,
  onPick,
  colors,
}: {
  title: string;
  options: string[];
  value: string;
  onPick: (v: string) => void;
  colors: (typeof COLORS)[Scheme];
}) {
  return (
    <View style={styles.choice}>
      <Text style={[styles.choiceTitle, { color: colors.muted }]}>{title}</Text>
      <View style={styles.choiceRow}>
        {options.map((option) => {
          const on = option === value;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              hitSlop={4}
              onPress={() => onPick(option)}
              style={[styles.choiceChip, { backgroundColor: on ? colors.chipOn : colors.chip, borderColor: colors.line }, webPointer]}>
              <Text style={[styles.choiceText, { color: on ? colors.onChipOn : colors.ink }]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  choice: { marginTop: 14 },
  choiceTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8, marginLeft: 4 },
  choiceRow: { flexDirection: 'row', gap: 8 },
  choiceChip: { height: 40, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, justifyContent: 'center' },
  choiceText: { fontSize: 14, fontWeight: '700' },
  page: { flex: 1, paddingHorizontal: 16 },
  fill: { flex: 1 },
  place: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, padding: 14 },
  tile: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  meta: { fontSize: 13, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  rating: { fontSize: 13, fontWeight: '800', marginTop: 2 },
  heading: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, marginTop: 20, marginLeft: 4 },
  party: { flexDirection: 'row', gap: 8, marginTop: 12 },
  partyChip: { flex: 1, height: 44, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  partyText: { fontSize: 15, fontWeight: '800' },
  picker: { marginTop: 14 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, marginLeft: 8 },
  legendDot: { width: 7, height: 7, borderRadius: 3.5 },
  legendText: { fontSize: 12, fontWeight: '600', marginRight: 6 },
  struck: { textDecorationLine: 'line-through', marginRight: 0 },
  confirm: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, padding: 14, marginTop: 'auto' },
  confirmTitle: { fontSize: 16, fontWeight: '800' },
  reserve: { height: 46, borderRadius: 23, paddingHorizontal: 20, justifyContent: 'center' },
  reserveText: { fontSize: 15, fontWeight: '800' },
});

/** The demo with a safe-area provider of its own, so it runs anywhere (UpFork's preview gives it none). */
export default function Reservation({ scheme }: { scheme?: Scheme }) {
  return (
    <SafeAreaProvider>
      <ReservationScreen scheme={scheme} />
    </SafeAreaProvider>
  );
}
