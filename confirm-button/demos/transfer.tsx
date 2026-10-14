import { useId, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { ConfirmButton } from '../components/confirm-button';
import type { Scheme } from '../lib/use-scheme';

const COLORS = {
  light: { page: '#F6F5F2', card: '#FFFFFF', ink: '#17171B', muted: '#6C6C75', line: 'rgba(23, 23, 27, 0.08)', chip: '#EFEDE8', accent: '#4F46E5' },
  dark: { page: '#0B0B0E', card: '#16161B', ink: '#F3F3F6', muted: '#94949E', line: 'rgba(255, 255, 255, 0.08)', chip: '#1F1F26', accent: '#A39DFF' },
} as const;

// A white thumb on every platform (React Native Web's own is teal when on).
const thumb = { thumbColor: '#FFFFFF', ...(Platform.OS === 'web' ? { activeThumbColor: '#FFFFFF' } : null) } as object;
const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;

/** A transfer: hold to send, a liquid fill as you hold; a switch makes the next one fail, to show the error. */
function TransferScreen({ scheme = 'light' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const insets = useSafeAreaInsets();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [failNext, setFailNext] = useState(false);
  const failRef = useRef(failNext);
  failRef.current = failNext;

  const send = () =>
    new Promise<void>((resolve, reject) =>
      setTimeout(() => {
        if (failRef.current) {
          setFailNext(false);
          reject(new Error('Your bank declined the transfer'));
        } else resolve();
      }, 1200),
    );

  return (
    <View style={[styles.page, { backgroundColor: c.page, paddingTop: insets.top + 6, paddingBottom: insets.bottom + 18 }]}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" style={[styles.round, webPointer]}>
          <Svg width={20} height={20} viewBox="0 0 24 24">
            <Path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke={c.ink} strokeWidth={2.1} strokeLinecap="round" />
          </Svg>
        </Pressable>
        <Text style={[styles.barTitle, { color: c.ink }]}>Send money</Text>
        <View style={styles.round} />
      </View>

      <View style={styles.to}>
        <Svg width={72} height={72} viewBox="0 0 72 72">
          <Defs>
            <LinearGradient id={`${uid}j`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#FFD3A8" />
              <Stop offset="1" stopColor="#E8798F" />
            </LinearGradient>
          </Defs>
          <Circle cx={36} cy={36} r={36} fill={`url(#${uid}j)`} />
          <Circle cx={36} cy={29} r={11} fill="#FFFFFF" opacity={0.92} />
          <Path d="M15 60c4-11 12-15 21-15s17 4 21 15" fill="#FFFFFF" opacity={0.92} />
        </Svg>
        <Text style={[styles.toLabel, { color: c.muted }]}>To</Text>
        <Text style={[styles.toName, { color: c.ink }]}>Jonas Albers</Text>
        <Text style={[styles.toIban, { color: c.muted }]}>Account •••• 3307</Text>
      </View>

      <View style={styles.amountBlock}>
        <Text style={[styles.amount, { color: c.ink }]}>€120.00</Text>
        <View style={[styles.note, { backgroundColor: c.chip }]}>
          <Text style={[styles.noteText, { color: c.ink }]}>Concert tickets</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: c.card }]}>
        <Row label="From" value="Everyday · €2,418.60" c={c} />
        <Row label="Arrives" value="Instantly" c={c} divider />
        <Row label="Fee" value="Free" c={c} divider />
      </View>

      <View style={styles.flex} />

      <View style={styles.fail}>
        <Text style={[styles.failText, { color: c.muted }]}>Make the next transfer fail</Text>
        <Switch value={failNext} onValueChange={setFailNext} trackColor={{ true: c.accent }} {...thumb} />
      </View>

      <View style={styles.send}>
        <ConfirmButton
          label="Hold to send €120"
          busyLabel="Sending €120 to Jonas"
          doneLabel="Sent to Jonas"
          errorLabel={(e) => (e instanceof Error ? e.message : 'Transfer failed')}
          mode="hold"
          tone="primary"
          size="lg"
          fullWidth
          resetAfter={1800}
          onConfirm={send}
          scheme={scheme}
        />
      </View>
    </View>
  );
}

function Row({ label, value, c, divider }: { label: string; value: string; c: (typeof COLORS)[Scheme]; divider?: boolean }) {
  return (
    <View style={[styles.row, divider && { borderTopWidth: 1, borderTopColor: c.line }]}>
      <Text style={[styles.rowLabel, { color: c.muted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: c.ink }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  flex: { flex: 1 },
  bar: { height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  round: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  barTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' },
  to: { alignItems: 'center', marginTop: 14 },
  toLabel: { fontSize: 13, fontWeight: '600', marginTop: 12 },
  toName: { fontSize: 20, fontWeight: '800', marginTop: 2 },
  toIban: { fontSize: 13, marginTop: 2 },
  amountBlock: { alignItems: 'center', marginTop: 22 },
  amount: { fontSize: 52, fontWeight: '800', letterSpacing: -1.6 },
  note: { marginTop: 8, height: 32, borderRadius: 16, paddingHorizontal: 14, justifyContent: 'center' },
  noteText: { fontSize: 14, fontWeight: '600' },
  card: { marginHorizontal: 16, marginTop: 24, borderRadius: 20, paddingHorizontal: 16 },
  row: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { fontSize: 14 },
  rowValue: { fontSize: 14, fontWeight: '600' },
  fail: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 24, marginBottom: 14 },
  failText: { fontSize: 13, fontWeight: '600' },
  send: { marginHorizontal: 20 },
});

/** The demo with a safe-area provider of its own, so it runs anywhere (UpFork's preview gives it none). */
export default function TransferDemo({ scheme }: { scheme?: Scheme }) {
  return (
    <SafeAreaProvider>
      <TransferScreen scheme={scheme} />
    </SafeAreaProvider>
  );
}
