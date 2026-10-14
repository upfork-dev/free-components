import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChipCounter, ChoiceChips, type ChipOption } from '../components/choice-chips';
import type { Scheme } from '../lib/use-scheme';

const COLORS = {
  light: { page: '#FAF8F5', ink: '#17151A', muted: '#7D7A83', track: 'rgba(23, 21, 26, 0.08)', accent: '#FF6B3D', button: '#17151A', onButton: '#FFFFFF', off: 'rgba(23, 21, 26, 0.1)', offText: '#9A97A0' },
  dark: { page: '#0E0D10', ink: '#F4F2F6', muted: '#8E8B95', track: 'rgba(244, 242, 246, 0.1)', accent: '#FF7A4F', button: '#F4F2F6', onButton: '#0E0D10', off: 'rgba(244, 242, 246, 0.1)', offText: '#6F6C76' },
} as const;

const GROUPS: { title: string; options: ChipOption[] }[] = [
  {
    title: 'Create',
    options: [
      { value: 'photo', label: 'Photography', emoji: '📷' },
      { value: 'design', label: 'Design', emoji: '🎨' },
      { value: 'writing', label: 'Writing', emoji: '✍️' },
      { value: 'music', label: 'Music', emoji: '🎧' },
      { value: 'film', label: 'Film', emoji: '🎬' },
      { value: 'cooking', label: 'Cooking', emoji: '🍳' },
      { value: 'crafts', label: 'Crafts', emoji: '🧶' },
      { value: 'code', label: 'Code', emoji: '💻' },
    ],
  },
  {
    title: 'Move',
    options: [
      { value: 'running', label: 'Running', emoji: '🏃' },
      { value: 'yoga', label: 'Yoga', emoji: '🧘' },
      { value: 'climbing', label: 'Climbing', emoji: '🧗' },
      { value: 'cycling', label: 'Cycling', emoji: '🚲' },
      { value: 'swimming', label: 'Swimming', emoji: '🏊' },
      { value: 'dance', label: 'Dance', emoji: '💃' },
      { value: 'hiking', label: 'Hiking', emoji: '🥾' },
      { value: 'tennis', label: 'Tennis', emoji: '🎾' },
    ],
  },
  {
    title: 'Explore',
    options: [
      { value: 'travel', label: 'Travel', emoji: '✈️' },
      { value: 'books', label: 'Books', emoji: '📚' },
      { value: 'space', label: 'Space', emoji: '🔭' },
      { value: 'history', label: 'History', emoji: '🏛️' },
      { value: 'plants', label: 'Plants', emoji: '🌿' },
      { value: 'coffee', label: 'Coffee', emoji: '☕' },
      { value: 'games', label: 'Games', emoji: '🎲' },
      { value: 'markets', label: 'Markets', emoji: '🛍️' },
      { value: 'languages', label: 'Languages', emoji: '🗣️' },
      { value: 'wine', label: 'Wine', emoji: '🍷' },
    ],
  },
];

const MAX = 5;
const NEED = 3;
const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;

/** Onboarding: pick up to five interests across three groups; Continue wakes up at three. */
function InterestsScreen({ scheme = 'light' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const insets = useSafeAreaInsets();
  // One selection across every group, so the limit counts them all.
  const [picked, setPicked] = useState<string[]>(['design', 'climbing', 'coffee']);
  const ready = picked.length >= NEED;
  const left = NEED - picked.length;

  const button = useAnimatedStyle(
    () => ({ backgroundColor: withTiming(ready ? c.button : c.off, { duration: 220 }) }),
    [ready, c],
  );

  return (
    <View style={[styles.page, { backgroundColor: c.page }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 130 + insets.bottom }]}>
        <View style={styles.progressRow}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.progress, { backgroundColor: i <= 1 ? c.ink : c.track }]} />
          ))}
        </View>
        <Text style={[styles.step, { color: c.muted }]}>Step 2 of 4</Text>
        <Text style={[styles.title, { color: c.ink }]}>What are you into?</Text>
        <View style={styles.subRow}>
          <Text style={[styles.subtitle, { color: c.muted }]}>Pick up to 5 — we'll tune your feed.</Text>
          <ChipCounter count={picked.length} max={MAX} color={c.muted} accent={c.accent} />
        </View>

        {GROUPS.map((group) => (
          <View key={group.title} style={styles.group}>
            <Text style={[styles.groupTitle, { color: c.muted }]}>{group.title.toUpperCase()}</Text>
            <ChoiceChips
              scheme={scheme}
              accessibilityLabel={`${group.title} interests`}
              options={group.options}
              accent={c.accent}
              value={picked.filter((v) => group.options.some((o) => o.value === v))}
              max={MAX - picked.filter((v) => !group.options.some((o) => o.value === v)).length}
              onChange={(next) => {
                const others = picked.filter((v) => !group.options.some((o) => o.value === v));
                setPicked([...others, ...next]);
              }}
              gap={9}
            />
          </View>
        ))}
        <Text style={[styles.limit, { color: picked.length >= MAX ? c.accent : c.muted }]}>
          {picked.length >= MAX ? 'That’s five — unpick one to swap it.' : 'You can change these later in Settings.'}
        </Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 18, backgroundColor: c.page }]}>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !ready }} disabled={!ready} style={webPointer}>
          <Animated.View style={[styles.button, button]}>
            <Text style={[styles.buttonText, { color: ready ? c.onButton : c.offText }]}>
              {ready ? 'Continue' : `Pick ${left} more`}
            </Text>
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingHorizontal: 20 },
  progressRow: { flexDirection: 'row', gap: 6 },
  progress: { flex: 1, height: 4, borderRadius: 2 },
  step: { fontSize: 13, fontWeight: '600', marginTop: 18 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8, marginTop: 4 },
  subRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, marginBottom: 6 },
  subtitle: { fontSize: 15, flex: 1 },
  group: { marginTop: 18 },
  groupTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10 },
  limit: { fontSize: 13, fontWeight: '600', marginTop: 18 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12 },
  button: { height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 16, fontWeight: '700' },
});

/** The demo with a safe-area provider of its own, so it runs anywhere (UpFork's preview gives it none). */
export default function Interests({ scheme }: { scheme?: Scheme }) {
  return (
    <SafeAreaProvider>
      <InterestsScreen scheme={scheme} />
    </SafeAreaProvider>
  );
}
