import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { SlideToConfirm } from '../components/slide-to-confirm';
import type { Scheme } from '../lib/use-scheme';

const COLORS = {
  light: { page: '#EEF0F6', text: '#0C0D10', muted: '#6E7179' },
  dark: { page: '#07080B', text: '#F2F3F5', muted: '#8E929A' },
} as const;

const VIOLET = '#6D5BF5';
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** A custom tint, and the error state: the first try is turned down on purpose. */
export default function Unlock({ scheme = 'dark' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const tries = useRef(0);
  const now = useRef(new Date()).current;

  const unlock = async () => {
    tries.current += 1;
    await wait(900);
    if (tries.current % 2 === 1) throw new Error('Turned down');
  };

  return (
    <View style={[styles.page, { backgroundColor: c.page }]}>
      <View style={styles.top}>
        <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
          <Rect x={5} y={10.5} width={14} height={10} rx={2.5} stroke={c.text} strokeWidth={1.8} />
          <Path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" stroke={c.text} strokeWidth={1.8} strokeLinecap="round" />
        </Svg>
        <Text style={[styles.time, { color: c.text }]}>
          {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false })}
        </Text>
        <Text style={[styles.date, { color: c.muted }]}>
          {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
      </View>

      <View style={styles.bottom}>
        <SlideToConfirm
          scheme={scheme}
          tint={VIOLET}
          label="Slide to unlock"
          doneLabel="Unlocked"
          failLabel="Not this time"
          resetAfter={2200}
          onConfirm={unlock}
        />
        <Text style={[styles.note, { color: c.muted }]}>Every other try is turned down, to show the error.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 24, paddingTop: 96, paddingBottom: 40, justifyContent: 'space-between' },
  top: { alignItems: 'center', gap: 6 },
  time: { fontSize: 84, fontWeight: '200', letterSpacing: -3, fontVariant: ['tabular-nums'], marginTop: 10 },
  date: { fontSize: 17, fontWeight: '500' },
  bottom: { gap: 14 },
  note: { fontSize: 13, textAlign: 'center' },
});
