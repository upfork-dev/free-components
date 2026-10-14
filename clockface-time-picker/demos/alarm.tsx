import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Clockface, formatDuration, toMinutes, type TimeValue } from '../components/clockface-time-picker';
import type { Scheme } from '../lib/use-scheme';

const COLORS = {
  dark: { page: '#08080B', card: '#121216', ink: '#F3F3F7', muted: '#9A9AA6', line: 'rgba(255, 255, 255, 0.07)', chip: 'rgba(255, 255, 255, 0.06)', chipOn: '#FFB347', onChipOn: '#1A1104', track: '#FFB347', glow: 'rgba(255, 179, 71, 0.08)' },
  light: { page: '#F6F1E8', card: '#FFFFFF', ink: '#1A1712', muted: '#77705F', line: 'rgba(26, 23, 18, 0.08)', chip: 'rgba(26, 23, 18, 0.06)', chipOn: '#1A1712', onChipOn: '#FFF6E6', track: '#E08A1E', glow: 'rgba(224, 138, 30, 0.08)' },
} as const;

const NOW = 23 * 60 + 25; // the demo's bedtime
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;

/** A bedside alarm: a big clock with the sun or moon in its window, a 12-hour wheel, repeat days and a snooze. */
function AlarmScreen({ scheme = 'dark' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const insets = useSafeAreaInsets();
  const [time, setTime] = useState<TimeValue>({ hours: 6, minutes: 45 });
  const [repeat, setRepeat] = useState([true, true, true, true, true, false, false]);
  const [gentle, setGentle] = useState(true);
  const [snooze, setSnooze] = useState(9);
  const until = (((toMinutes(time) - NOW) % 1440) + 1440) % 1440;

  return (
    <View style={[styles.page, { backgroundColor: c.page, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: c.ink }]}>Alarm</Text>
          <Text style={[styles.subtitle, { color: c.muted }]}>Wakes you in {formatDuration(until)}</Text>
        </View>
        <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
          <Path d="M20 14.2A8.5 8.5 0 0 1 9.8 4a8.5 8.5 0 1 0 10.2 10.2Z" stroke={c.muted} strokeWidth={1.7} strokeLinejoin="round" />
        </Svg>
      </View>

      <Clockface
        value={time}
        onChange={(v) => {
          if ('hours' in v) setTime(v);
        }}
        layout="stacked"
        clockSize={260}
        step={5}
        hourCycle={12}
        showNumerals="quarters"
        dayNight
        accent="#FFB347"
        accessibilityLabel="Alarm time"
        scheme={scheme}
        style={[styles.picker, { backgroundColor: c.card, borderColor: c.line, boxShadow: `0px 30px 80px ${c.glow}` }]}
      />

      <Text style={[styles.section, { color: c.muted }]}>Repeat</Text>
      <View style={styles.days}>
        {DAYS.map((d, i) => (
          <Pressable
            key={DAY_NAMES[i]}
            accessibilityRole="checkbox"
            accessibilityLabel={DAY_NAMES[i]}
            accessibilityState={{ checked: repeat[i] }}
            onPress={() => setRepeat((list) => list.map((on, j) => (j === i ? !on : on)))}
            style={[styles.day, { backgroundColor: repeat[i] ? c.chipOn : c.chip }, webPointer]}>
            <Text style={[styles.dayText, { color: repeat[i] ? c.onChipOn : c.ink }]}>{d}</Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.rows, { backgroundColor: c.card, borderColor: c.line }]}>
        <View style={[styles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.line }]}>
          <View style={styles.fill}>
            <Text style={[styles.rowTitle, { color: c.ink }]}>Gentle wake</Text>
            <Text style={[styles.rowNote, { color: c.muted }]}>Light and sound rise over 10 minutes</Text>
          </View>
          <Switch
            value={gentle}
            onValueChange={setGentle}
            trackColor={{ true: c.track, false: c.chip }}
            thumbColor="#FFFFFF"
            accessibilityLabel="Gentle wake"
            {...({ activeThumbColor: '#FFFFFF' } as object)}
          />
        </View>
        <View style={styles.row}>
          <View style={styles.fill}>
            <Text style={[styles.rowTitle, { color: c.ink }]}>Snooze</Text>
            <Text style={[styles.rowNote, { color: c.muted }]}>{snooze} minutes</Text>
          </View>
          <View style={[styles.stepper, { backgroundColor: c.chip }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Shorter snooze" onPress={() => setSnooze((s) => Math.max(1, s - 1))} style={[styles.stepButton, webPointer]}>
              <Text style={[styles.stepText, { color: c.ink }]}>−</Text>
            </Pressable>
            <Text style={[styles.stepValue, { color: c.ink }]}>{snooze}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Longer snooze" onPress={() => setSnooze((s) => Math.min(30, s + 1))} style={[styles.stepButton, webPointer]}>
              <Text style={[styles.stepText, { color: c.ink }]}>+</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 16 },
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { fontSize: 14, marginTop: 2 },
  picker: { marginTop: 14 },
  section: { fontSize: 13, fontWeight: '700', marginTop: 16, marginBottom: 8, marginLeft: 6 },
  days: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 15, fontWeight: '800' },
  rows: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, marginTop: 14 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 62 },
  rowTitle: { fontSize: 16, fontWeight: '700' },
  rowNote: { fontSize: 13, marginTop: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: 22, height: 44 },
  stepButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 20, fontWeight: '600' },
  stepValue: { fontSize: 15, fontWeight: '800', minWidth: 22, textAlign: 'center', fontVariant: ['tabular-nums'] },
});

/** The demo with a safe-area provider of its own, so it runs anywhere (UpFork's preview gives it none). */
export default function Alarm({ scheme }: { scheme?: Scheme }) {
  return (
    <SafeAreaProvider>
      <AlarmScreen scheme={scheme} />
    </SafeAreaProvider>
  );
}
