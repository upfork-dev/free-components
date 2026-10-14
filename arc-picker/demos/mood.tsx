import { Canvas, Circle, LinearGradient, RadialGradient, Rect, vec } from '@shopify/react-native-skia';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArcPicker } from '../components/arc-picker';
import { MOODS, MoodGlyph } from '../lib/moods';
import { hexToLab, mixLabs } from '../lib/oklab';
import type { Scheme } from '../lib/use-scheme';

const TOPS = { dark: MOODS.map((m) => hexToLab(m.dark[0])), light: MOODS.map((m) => hexToLab(m.light[0])) };
const BOTTOMS = { dark: MOODS.map((m) => hexToLab(m.dark[1])), light: MOODS.map((m) => hexToLab(m.light[1])) };
const GLOWS = MOODS.map((m) => hexToLab(m.glyph));

const COLORS = {
  light: { ink: '#17161D', muted: 'rgba(23, 22, 29, 0.62)', card: 'rgba(255, 255, 255, 0.72)', line: 'rgba(23, 22, 29, 0.08)', chip: 'rgba(23, 22, 29, 0.06)', chipOn: '#17161D', onChipOn: '#FFFFFF', button: '#17161D', onButton: '#FFFFFF', glow: 0.5 },
  dark: { ink: '#F4F3F8', muted: 'rgba(244, 243, 248, 0.62)', card: 'rgba(255, 255, 255, 0.06)', line: 'rgba(255, 255, 255, 0.08)', chip: 'rgba(255, 255, 255, 0.08)', chipOn: '#F4F3F8', onChipOn: '#121216', button: '#F4F3F8', onButton: '#121216', glow: 0.32 },
} as const;

const TAGS = ['Sleep', 'Work', 'Friends', 'Outdoors', 'Exercise', 'Family'];
const ITEM = 64;
const START = 4; // Good
const DIAL_TOP = 150;
const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;

/** A journal check-in: a dial of moods on a rising arc, and the whole screen takes the mood's colour as it turns. */
function MoodScreen({ scheme = 'dark' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [tags, setTags] = useState(['Sleep', 'Outdoors']);
  const [note, setNote] = useState('Slept well for once. A long walk before work, and the light was lovely.');
  const progress = useSharedValue(START);

  const top = useDerivedValue(() => mixLabs(TOPS[scheme], progress.value, false));
  const bottom = useDerivedValue(() => mixLabs(BOTTOMS[scheme], progress.value, false));
  const gradient = useDerivedValue(() => [top.value, bottom.value]);
  const glow = useDerivedValue(() => mixLabs(GLOWS, progress.value, false));
  const glowColors = useDerivedValue(() => [glow.value, 'rgba(0, 0, 0, 0)']);
  const dialY = insets.top + DIAL_TOP + 140;

  return (
    <View style={styles.page}>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Rect x={0} y={0} width={width} height={height} dither>
          <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={gradient} />
        </Rect>
        <Circle cx={width / 2} cy={dialY} r={width * 0.75} opacity={c.glow} dither>
          <RadialGradient c={vec(width / 2, dialY)} r={width * 0.75} colors={glowColors} />
        </Circle>
      </Canvas>

      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={[styles.date, { color: c.muted }]}>Tuesday, 14 October · Morning</Text>
        <Text style={[styles.title, { color: c.ink }]}>How are you feeling?</Text>
      </View>

      <View style={[styles.dial, { top: insets.top + DIAL_TOP }]}>
        <ArcPicker
          data={MOODS}
          keyExtractor={(m) => m.key}
          getLabel={(m) => m.name}
          accessibilityLabel="Mood"
          accessibilityLabelForItem={(m) => m.name}
          defaultIndex={START}
          progress={progress}
          position="top"
          radius={380}
          itemSize={ITEM}
          spacing={14}
          scheme={scheme}
          renderItem={({ index }) => <MoodGlyph mood={index} size={ITEM} />}
        />
      </View>

      <View style={[styles.body, { paddingBottom: insets.bottom + 18 }]}>
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.line }]}>
          <Text style={[styles.cardLabel, { color: c.muted }]}>Note</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            accessibilityLabel="Note"
            placeholder="What's on your mind?"
            placeholderTextColor={c.muted}
            style={[styles.note, { color: c.ink }]}
          />
        </View>
        <Text style={[styles.section, { color: c.muted }]}>What's behind it?</Text>
        <View style={styles.tags}>
          {TAGS.map((tag) => {
            const on = tags.includes(tag);
            return (
              <Pressable
                key={tag}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                hitSlop={4}
                onPress={() => setTags((list) => (on ? list.filter((t) => t !== tag) : [...list, tag]))}
                style={[styles.tag, { backgroundColor: on ? c.chipOn : c.chip }, webPointer]}>
                <Text style={[styles.tagText, { color: on ? c.onChipOn : c.ink }]}>{tag}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, { backgroundColor: c.button, opacity: pressed ? 0.85 : 1 }, webPointer]}>
          <Text style={[styles.buttonText, { color: c.onButton }]}>Save check-in</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: { paddingHorizontal: 24 },
  date: { fontSize: 13, fontWeight: '600' },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8, marginTop: 6 },
  dial: { position: 'absolute', left: 0, right: 0 },
  body: { position: 'absolute', left: 20, right: 20, bottom: 0 },
  card: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 16 },
  cardLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  note: { fontSize: 16, lineHeight: 23, minHeight: 92, marginTop: 6, textAlignVertical: 'top', outlineStyle: 'none' } as never,
  section: { fontSize: 13, fontWeight: '600', marginTop: 18, marginBottom: 10, marginLeft: 4 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { height: 38, borderRadius: 19, paddingHorizontal: 14, justifyContent: 'center' },
  tagText: { fontSize: 14, fontWeight: '600' },
  button: { height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  buttonText: { fontSize: 16, fontWeight: '700' },
});

/** The demo with a safe-area provider of its own, so it runs anywhere (UpFork's preview gives it none). */
export default function Mood({ scheme }: { scheme?: Scheme }) {
  return (
    <SafeAreaProvider>
      <MoodScreen scheme={scheme} />
    </SafeAreaProvider>
  );
}
