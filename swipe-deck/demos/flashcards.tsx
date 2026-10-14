import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type GestureResponderEvent, type ViewStyle } from 'react-native';
import Animated, { Easing, Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { SwipeDeck, type SwipeDeckHandle } from '../components/swipe-deck';
import type { Scheme } from '../lib/use-scheme';

const COLORS = {
  light: { page: '#F6F4EE', text: '#14130F', muted: '#76716A', card: '#FFFFFF', back: '#14130F', backText: '#F6F4EE', track: '#E6E2D8', line: 'rgba(20,19,15,0.08)' },
  dark: { page: '#0B0B09', text: '#F3F1EA', muted: '#9A958C', card: '#18171A', back: '#F3F1EA', backText: '#14130F', track: '#24232A', line: 'rgba(255,255,255,0.08)' },
} as const;

const KNOW = '#16A34A';
const AGAIN = '#F08C1A';

type Word = { word: string; kind: string; meaning: string; example: string; hue: string };

const WORDS: Word[] = [
  { word: 'la sobremesa', kind: 'noun', meaning: 'the time spent talking at the table after a meal', example: 'La sobremesa duró tres horas.', hue: '#F08C1A' },
  { word: 'madrugar', kind: 'verb', meaning: 'to get up very early', example: 'Mañana tengo que madrugar.', hue: '#6D4AFF' },
  { word: 'el desvelo', kind: 'noun', meaning: 'sleeplessness; staying up out of care for something', example: 'Su desvelo por los hijos es enorme.', hue: '#0EA5A4' },
  { word: 'la añoranza', kind: 'noun', meaning: 'longing for something or someone far away', example: 'Siento añoranza de mi pueblo.', hue: '#E5484D' },
  { word: 'chispear', kind: 'verb', meaning: 'to drizzle; to give off sparks', example: 'Empieza a chispear, lleva paraguas.', hue: '#2F80ED' },
  { word: 'estrenar', kind: 'verb', meaning: 'to use or wear something for the first time', example: 'Hoy estreno zapatos.', hue: '#C2410C' },
];

const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;

/** Spanish flashcards: tap a card to turn it over, swipe right if you knew it, left to see it again. */
export default function Flashcards({ scheme = 'light' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const deck = useRef<SwipeDeckHandle>(null);
  const [done, setDone] = useState(0);
  const [known, setKnown] = useState(0);
  const [round, setRound] = useState(0);
  const total = WORDS.length;

  return (
    <View style={[styles.page, { backgroundColor: c.page }]}>
      <View style={styles.header}>
        <Text style={[styles.kicker, { color: c.muted }]}>Spanish · Everyday words</Text>
        <Text style={[styles.title, { color: c.text }]}>Review</Text>
        <View style={[styles.track, { backgroundColor: c.track }]}>
          <View style={[styles.fill, { backgroundColor: c.text, width: `${(done / total) * 100}%` }]} />
        </View>
        <View style={styles.counts}>
          <Text style={[styles.count, { color: c.muted }]}>
            {Math.min(done + 1, total)} of {total}
          </Text>
          <Text style={[styles.count, { color: KNOW }]}>{known} known</Text>
        </View>
      </View>

      <SwipeDeck
        key={round}
        ref={deck}
        scheme={scheme}
        style={styles.deck}
        data={WORDS}
        keyExtractor={(w) => w.word}
        stamps={{ right: { label: 'Knew it', color: KNOW }, left: { label: 'Again', color: AGAIN } }}
        onSwipe={(_, direction) => {
          setDone((n) => n + 1);
          if (direction === 'right') setKnown((n) => n + 1);
        }}
        onUndo={(_, direction) => {
          setDone((n) => Math.max(0, n - 1));
          if (direction === 'right') setKnown((n) => Math.max(0, n - 1));
        }}
        renderCard={(word) => <FlipCard word={word} colors={c} />}
        renderEmpty={() => (
          <View style={styles.empty}>
            <Text style={[styles.emptyBig, { color: c.text }]}>
              {known}/{total}
            </Text>
            <Text style={[styles.emptyText, { color: c.muted }]}>words you knew this round.</Text>
            <Pressable
              onPress={() => {
                setDone(0);
                setKnown(0);
                setRound((r) => r + 1);
              }}
              style={[styles.again, { backgroundColor: c.text }, webPointer]}>
              <Text style={[styles.againText, { color: c.page }]}>Go again</Text>
            </Pressable>
          </View>
        )}
      />

      <View style={styles.actions}>
        <Button label="Again" color={AGAIN} line={c.line} background={c.card} onPress={() => deck.current?.swipe('left')} />
        <Pressable
          onPress={() => deck.current?.undo()}
          accessibilityRole="button"
          accessibilityLabel="Undo"
          style={[styles.undo, { borderColor: c.line, backgroundColor: c.card }, webPointer]}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path d="M9 7 4.5 11.5 9 16M5 11.5h9.5a5 5 0 0 1 0 10H12" stroke={c.text} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
        <Button label="Knew it" color={KNOW} line={c.line} background={c.card} onPress={() => deck.current?.swipe('right')} />
      </View>
    </View>
  );
}

function Button({ label, color, line, background, onPress }: { label: string; color: string; line: string; background: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, { borderColor: line, backgroundColor: background }, pressed && styles.pressed, webPointer]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.buttonText, { color }]}>{label}</Text>
    </Pressable>
  );
}

/** A card with the word on its face; a tap pours the meaning over it in a circle from where you tapped, and back. */
function FlipCard({ word, colors }: { word: Word; colors: (typeof COLORS)[Scheme] }) {
  const t = useSharedValue(0);
  const [back, setBack] = useState(false);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [origin, setOrigin] = useState({ x: 0, y: 0 });

  function toggle(event: GestureResponderEvent) {
    const next = !back;
    if (next) setOrigin({ x: event.nativeEvent.locationX, y: event.nativeEvent.locationY });
    setBack(next);
    t.value = withTiming(next ? 1 : 0, { duration: next ? 520 : 380, easing: Easing.inOut(Easing.cubic) });
  }

  // The circle reaches the card's farthest corner from where it starts.
  const reach = Math.hypot(Math.max(origin.x, box.width - origin.x), Math.max(origin.y, box.height - origin.y));
  const pour = useAnimatedStyle(() => ({ transform: [{ scale: Math.max(0.0001, t.value) }] }));
  const meaning = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0.45, 0.9], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(t.value, [0.45, 1], [10, 0], Extrapolation.CLAMP) }],
  }));
  const face = useAnimatedStyle(() => ({ opacity: interpolate(t.value, [0, 0.5], [1, 0], Extrapolation.CLAMP) }));

  return (
    <Pressable
      onPress={toggle}
      onLayout={(event) => setBox({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}
      accessibilityRole="button"
      accessibilityLabel={back ? word.meaning : `${word.word}, tap for its meaning`}
      style={[styles.flip, { backgroundColor: colors.card }]}>
      <Animated.View style={[styles.face, face]}>
        <View style={[styles.tag, { backgroundColor: word.hue }]}>
          <Text style={styles.tagText}>{word.kind}</Text>
        </View>
        <Text style={[styles.word, { color: colors.text }]}>{word.word}</Text>
        <Text style={[styles.hint, { color: colors.muted }]}>Tap to see what it means</Text>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pour,
          { left: origin.x - reach, top: origin.y - reach, width: reach * 2, height: reach * 2, borderRadius: reach, backgroundColor: colors.back },
          pour,
        ]}
      />
      <Animated.View pointerEvents="none" style={[styles.face, meaning]}>
        <Text style={[styles.meaningKicker, { color: word.hue }]}>{word.word}</Text>
        <Text style={[styles.meaning, { color: colors.backText }]}>{word.meaning}</Text>
        <View style={[styles.rule, { backgroundColor: colors.backText }]} />
        <Text style={[styles.example, { color: colors.backText }]}>“{word.example}”</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingTop: 64, paddingBottom: 30 },
  header: { paddingHorizontal: 20 },
  kicker: { fontSize: 13, fontWeight: '600' },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.6, marginTop: 2 },
  track: { height: 6, borderRadius: 3, marginTop: 16, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  counts: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  count: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  deck: { marginHorizontal: 20, marginTop: 18, marginBottom: 24 },
  flip: { flex: 1 },
  face: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    padding: 26,
    justifyContent: 'center',
  },
  pour: { position: 'absolute' },
  tag: { position: 'absolute', top: 24, left: 24, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', letterSpacing: 0.6 },
  word: { fontSize: 38, fontWeight: '800', letterSpacing: -1, textAlign: 'center' },
  hint: { position: 'absolute', bottom: 26, left: 0, right: 0, textAlign: 'center', fontSize: 14 },
  meaningKicker: { fontSize: 15, fontWeight: '700' },
  meaning: { fontSize: 26, fontWeight: '700', letterSpacing: -0.4, lineHeight: 32, marginTop: 8 },
  rule: { height: StyleSheet.hairlineWidth, opacity: 0.25, marginVertical: 20 },
  example: { fontSize: 17, lineHeight: 24, fontStyle: 'italic', opacity: 0.85 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 20 },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: 27,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  buttonText: { fontSize: 16, fontWeight: '700' },
  pressed: { transform: [{ scale: 0.96 }] },
  undo: { width: 54, height: 54, borderRadius: 27, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  emptyBig: { fontSize: 54, fontWeight: '800', letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  emptyText: { fontSize: 15 },
  again: { marginTop: 14, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 999 },
  againText: { fontSize: 15, fontWeight: '600' },
});
