import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Easing, useAnimatedReaction, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { GoalRing } from '../components/goal-ring';
import type { Scheme } from '../lib/use-scheme';

const COLORS = {
  light: { page: '#F3F2F7', text: '#0C0D10', muted: '#6E7179' },
  dark: { page: '#08080B', text: '#F2F3F5', muted: '#8E929A' },
} as const;

const PHOTOS = 2000;

/** Progress driven by a shared value: a backup that moves on in uneven steps, frame by frame. */
export default function Backup({ scheme = 'dark' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const progress = useSharedValue(0);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      if (stop) return;
      const done = progress.value >= 0.999;
      const target = done ? 0 : Math.min(1, progress.value + 0.08 + Math.random() * 0.14);
      progress.value = done
        ? withDelay(900, withTiming(0, { duration: 900, easing: Easing.inOut(Easing.cubic) }))
        : withTiming(target, { duration: 1100, easing: Easing.inOut(Easing.cubic) });
      timer = setTimeout(next, done ? 2200 : 1500);
    };
    next();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [progress]);

  useAnimatedReaction(
    () => Math.round(progress.value * 100),
    (now, before) => {
      if (now !== before) scheduleOnRN(setPercent, now);
    },
  );

  return (
    <View style={[styles.page, { backgroundColor: c.page }]}>
      <GoalRing progress={progress} size={236} thickness={14} colors={['#8B5CF6', '#EC4899']} scheme={scheme}>
        <Text style={[styles.big, { color: c.text }]}>{percent}%</Text>
      </GoalRing>
      <Text style={[styles.title, { color: c.text }]}>{percent === 100 ? 'Backed up' : 'Backing up'}</Text>
      <Text style={[styles.small, { color: c.muted }]}>
        {Math.round((percent / 100) * PHOTOS).toLocaleString('en-US')} of {PHOTOS.toLocaleString('en-US')} photos
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  big: { fontSize: 44, fontWeight: '700', letterSpacing: -1.2, fontVariant: ['tabular-nums'] },
  title: { fontSize: 20, fontWeight: '600', marginTop: 18 },
  small: { fontSize: 15, fontVariant: ['tabular-nums'] },
});
