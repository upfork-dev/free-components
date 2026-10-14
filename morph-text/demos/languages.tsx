import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { MorphText } from '../components/morph-text';
import { CloudIcon } from '../lib/demo-icons';
import type { Scheme } from '../lib/use-scheme';

const COLORS = {
  light: {
    page: '#F3F2EE',
    card: '#FFFFFF',
    ink: '#111114',
    muted: '#6A6A73',
    faint: '#9A9AA3',
    line: 'rgba(17, 17, 20, 0.08)',
    chip: 'rgba(17, 17, 20, 0.06)',
    accent: '#3D5AFE',
    accentText: '#2F45D0',
    field: '#F6F5F2',
    saved: '#15803D',
  },
  dark: {
    page: '#0B0B0E',
    card: '#16161B',
    ink: '#F4F4F6',
    muted: '#90909B',
    faint: '#6E6E79',
    line: 'rgba(255, 255, 255, 0.08)',
    chip: 'rgba(255, 255, 255, 0.07)',
    accent: '#8C9BFF',
    accentText: '#A8B3FF',
    field: '#0F0F13',
    saved: '#4ADE80',
  },
} as const;

const GREETINGS = [
  { text: 'Hello, friend', language: 'English', mode: 'letters' },
  { text: 'سلام دوست من', language: 'فارسی', mode: 'words' },
  { text: 'مرحبا يا صديقي', language: 'العربية', mode: 'words' },
  { text: 'Hola, amigo', language: 'Español', mode: 'letters' },
  { text: 'こんにちは、友よ', language: '日本語', mode: 'letters' },
] as const;

const PAIR = ['سلام دنیا', 'سلام دوست'] as const;

const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;
const webField = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null;

/** One component for every script: letters glide in Latin and kana, whole words in Persian and Arabic. */
function LanguagesScreen({ scheme = 'light' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [pair, setPair] = useState(0);
  const [note, setNote] = useState('Ferry at 7:40, not 8. Pack the blue jacket.');
  const [status, setStatus] = useState<'old' | 'saving' | 'saved'>('old');
  const [typed, setTyped] = useState('Morph me');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (paused) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % GREETINGS.length), 2400);
    return () => clearInterval(timer);
  }, [paused]);

  useEffect(() => {
    const timer = setInterval(() => setPair((p) => 1 - p), 2000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  const edit = (value: string) => {
    setNote(value);
    setStatus('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setStatus('saved'), 900);
  };

  const greeting = GREETINGS[index];
  const statusText = status === 'old' ? 'Saved 2 min ago' : status === 'saving' ? 'Saving…' : 'Saved just now';

  return (
    <View style={[styles.page, { backgroundColor: c.page }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: insets.bottom + 28 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.kicker, { color: c.faint }]}>ONE COMPONENT, EVERY SCRIPT</Text>
        <Text style={[styles.title, { color: c.ink }]}>Say hello</Text>

        <Pressable
          onPress={() => setIndex((i) => (i + 1) % GREETINGS.length)}
          onLongPress={() => setPaused((p) => !p)}
          accessibilityRole="button"
          accessibilityHint="Shows the next language. Long press to pause."
          style={[styles.card, styles.hero, { backgroundColor: c.card }, webPointer]}
        >
          <MorphText text={greeting.text} align="center" style={[styles.greeting, { color: c.ink }]} live />
          <View style={styles.chips}>
            <View style={[styles.chip, { backgroundColor: c.chip }]}>
              <MorphText text={greeting.language} align="center" style={[styles.chipText, { color: c.ink }]} />
            </View>
            <View style={[styles.chip, { backgroundColor: c.chip }]}>
              <MorphText
                text={greeting.mode === 'words' ? 'moves whole words' : 'moves letters'}
                align="center"
                style={[styles.chipText, { color: c.muted }]}
              />
            </View>
          </View>
          <View style={styles.dots}>
            {GREETINGS.map((g, i) => (
              <View key={g.language} style={[styles.dot, { backgroundColor: i === index ? c.ink : c.line, width: i === index ? 16 : 6 }]} />
            ))}
          </View>
        </Pressable>

        <View style={[styles.card, { backgroundColor: c.card }]}>
          <Text style={[styles.cardTitle, { color: c.ink }]}>Joined letters stay joined</Text>
          <Text style={[styles.cardBody, { color: c.muted }]}>
            Persian and Arabic letters change shape with their neighbours, so they move as words: the shared word stays,
            the other one changes, and every letter keeps its shape.
          </Text>
          <View style={[styles.pairRow, { backgroundColor: c.field }]}>
            <MorphText text={PAIR[pair]} align="center" style={[styles.pair, { color: c.ink }]} />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: c.card }]}>
          <View style={styles.noteHead}>
            <Text style={[styles.cardTitle, { color: c.ink }]}>Trip notes</Text>
            <View style={styles.status}>
              <CloudIcon color={status === 'saved' ? c.saved : c.muted} size={16} />
              <MorphText
                text={statusText}
                style={[styles.statusText, { color: status === 'saved' ? c.saved : c.muted }]}
                live
              />
            </View>
          </View>
          <TextInput
            value={note}
            onChangeText={edit}
            multiline
            accessibilityLabel="Note"
            style={[styles.note, { color: c.ink, backgroundColor: c.field, borderColor: c.line }, webField]}
          />
        </View>

        <View style={[styles.card, { backgroundColor: c.card }]}>
          <Text style={[styles.cardTitle, { color: c.ink }]}>Type to see it morph</Text>
          <View style={[styles.mirror, { backgroundColor: c.field }]}>
            <MorphText text={typed} align="center" style={[styles.mirrorText, { color: c.accentText }]} />
          </View>
          <TextInput
            value={typed}
            onChangeText={(v) => setTyped(v.slice(0, 28))}
            placeholder="Type anything"
            placeholderTextColor={c.faint}
            accessibilityLabel="Text to morph"
            style={[styles.input, { color: c.ink, borderColor: c.line }, webField]}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  kicker: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginHorizontal: 22 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8, marginHorizontal: 22, marginTop: 4, marginBottom: 14 },
  card: { marginHorizontal: 16, marginBottom: 12, borderRadius: 24, padding: 18 },
  hero: { alignItems: 'center', paddingVertical: 28 },
  greeting: { fontSize: 36, fontWeight: '800', letterSpacing: -0.6 },
  chips: { flexDirection: 'row', gap: 8, marginTop: 16 },
  chip: { height: 30, borderRadius: 15, paddingHorizontal: 12, justifyContent: 'center' },
  chipText: { fontSize: 13, fontWeight: '600' },
  dots: { flexDirection: 'row', gap: 5, marginTop: 18 },
  dot: { height: 6, borderRadius: 3 },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  cardBody: { fontSize: 13, lineHeight: 19, marginTop: 6 },
  pairRow: { marginTop: 14, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pair: { fontSize: 28, fontWeight: '700' },
  noteHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { fontSize: 13, fontWeight: '600' },
  note: { marginTop: 12, minHeight: 74, borderRadius: 14, borderWidth: 1, padding: 12, fontSize: 15, lineHeight: 21, textAlignVertical: 'top' },
  mirror: { marginTop: 12, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  mirrorText: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  input: { marginTop: 10, height: 46, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, fontSize: 15 },
});

/** The demo with a safe-area provider of its own, so it runs anywhere (UpFork's preview gives it none). */
export default function LanguagesDemo({ scheme }: { scheme?: Scheme }) {
  return (
    <SafeAreaProvider>
      <LanguagesScreen scheme={scheme} />
    </SafeAreaProvider>
  );
}
