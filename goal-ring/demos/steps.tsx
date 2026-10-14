import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GoalRing } from '../components/goal-ring';
import type { Scheme } from '../lib/use-scheme';

const COLORS = {
  light: { page: '#F4F5F2', card: '#FFFFFF', text: '#0C0D10', muted: '#6E7179', line: 'rgba(12,13,16,0.07)' },
  dark: { page: '#09090B', card: '#141518', text: '#F2F3F5', muted: '#8E929A', line: 'rgba(255,255,255,0.07)' },
} as const;

const GOAL = 10000;

/** A daily steps goal you can drag round; the numbers below follow it. */
export default function Steps({ scheme = 'light' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const [progress, setProgress] = useState(0.742);
  const steps = Math.round(progress * GOAL);

  return (
    <View style={[styles.page, { backgroundColor: c.page }]}>
      <View>
        <Text style={[styles.title, { color: c.text }]}>Today</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>Drag round the ring to set your steps.</Text>
      </View>

      <View style={styles.ring}>
        <GoalRing progress={progress} onChange={setProgress} interactive step={0.001} size={272} scheme={scheme}>
          <Text style={[styles.big, { color: c.text }]}>{steps.toLocaleString('en-US')}</Text>
          <Text style={[styles.small, { color: c.muted }]}>of {GOAL.toLocaleString('en-US')} steps</Text>
        </GoalRing>
      </View>

      <View style={styles.stats}>
        <Stat label="Distance" value={`${(steps * 0.00075).toFixed(1)} km`} colors={c} />
        <Stat label="Active" value={`${Math.round(steps / 150)} min`} colors={c} />
        <Stat label="Energy" value={`${Math.round(steps * 0.042)} kcal`} colors={c} />
      </View>
    </View>
  );
}

function Stat({ label, value, colors }: { label: string; value: string; colors: (typeof COLORS)[Scheme] }) {
  return (
    <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.line }]}>
      <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 20, paddingTop: 72, paddingBottom: 34, justifyContent: 'space-between' },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.6 },
  subtitle: { fontSize: 15, marginTop: 4 },
  ring: { alignItems: 'center' },
  big: { fontSize: 40, fontWeight: '700', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  small: { fontSize: 14, marginTop: 2 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 12, paddingHorizontal: 12, gap: 4 },
  statLabel: { fontSize: 12, fontWeight: '500' },
  statValue: { fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
