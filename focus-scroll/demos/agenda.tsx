import { Circle, Group, Line, RoundedRect, vec, type SkTypefaceFontProvider } from '@shopify/react-native-skia';
import { useCallback, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle as SvgCircle, Path } from 'react-native-svg';

import { FocusParagraph, FocusScroll, useFocusFont, withAlpha, type FocusScrollHandle } from '../components/focus-scroll';
import type { Scheme } from '../lib/use-scheme';

type Slot = {
  key: string;
  start: string;
  end: string;
  title: string;
  place: string;
  minutes: number;
  tone: 'coral' | 'violet' | 'teal' | 'amber' | 'blue' | 'green';
};

const DAY: Slot[] = [
  { key: 'run', start: '7:00', end: '7:45', title: 'Morning run', place: 'River path · 6 km', minutes: 45, tone: 'green' },
  { key: 'standup', start: '9:00', end: '9:15', title: 'Team stand-up', place: 'Call · 8 people', minutes: 15, tone: 'blue' },
  { key: 'focus', start: '9:30', end: '11:30', title: 'Deep work: onboarding flow', place: 'Do not disturb', minutes: 120, tone: 'violet' },
  { key: 'lunch', start: '12:30', end: '13:30', title: 'Lunch with Ines', place: 'Casa Verde, 2nd floor', minutes: 60, tone: 'amber' },
  { key: 'review', start: '14:00', end: '15:30', title: 'Design review', place: 'Room 4 · with Theo and Mai', minutes: 90, tone: 'coral' },
  { key: 'call', start: '16:00', end: '16:30', title: 'Call with the print shop', place: 'Phone', minutes: 30, tone: 'teal' },
  { key: 'gym', start: '17:30', end: '18:30', title: 'Strength class', place: 'North gym · Studio B', minutes: 60, tone: 'green' },
  { key: 'dinner', start: '19:30', end: '21:00', title: 'Dinner at Sol', place: 'Table for four', minutes: 90, tone: 'amber' },
  { key: 'read', start: '22:00', end: '22:30', title: 'Read', place: 'Chapter 9', minutes: 30, tone: 'violet' },
];

const NOW = 4;

const TONES = {
  coral: '#F2655A',
  violet: '#7B61FF',
  teal: '#14B8A6',
  amber: '#F59E0B',
  blue: '#3B82F6',
  green: '#22A06B',
} as const;

const COLORS = {
  light: { page: '#F6F5F2', ink: '#14131A', muted: '#7A7884', line: 'rgba(20, 19, 26, 0.1)', card: '#FFFFFF', chip: '#14131A', onChip: '#FFFFFF' },
  dark: { page: '#0C0C10', ink: '#F2F2F6', muted: '#8C8A96', line: 'rgba(242, 242, 246, 0.1)', card: '#17171D', chip: '#F2F2F6', onChip: '#0C0C10' },
} as const;

const TIME_COLUMN = 76;
const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;

function slotHeight(slot: Slot) {
  return Math.round(64 + Math.min(slot.minutes, 120) * 0.62);
}

/** A day timeline: the hour you're in is sharp, the rest of the day falls away above and below. */
function AgendaScreen({ scheme = 'light' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const insets = useSafeAreaInsets();
  const fonts = useFocusFont();
  const list = useRef<FocusScrollHandle>(null);
  const [focused, setFocused] = useState(NOW);
  // Stable, so the "Now" chip updating doesn't redraw every row.
  const renderSlot = useCallback(
    ({ item, index, width, height }: { item: Slot; index: number; width: number; height: number }) =>
      fonts ? <SlotRow slot={item} now={index === NOW} width={width} height={height} fonts={fonts} scheme={scheme} /> : null,
    [fonts, scheme],
  );

  return (
    <View style={[styles.page, { backgroundColor: c.page }]}>
      <View style={[styles.header, { paddingTop: insets.top + 18 }]}>
        <View style={styles.fill}>
          <Text style={[styles.kicker, { color: c.muted }]}>Tuesday, 14 October</Text>
          <Text style={[styles.title, { color: c.ink }]}>Today</Text>
        </View>
        <View style={styles.weather}>
          <Svg width={26} height={26} viewBox="0 0 24 24">
            <SvgCircle cx={9} cy={9} r={4} fill="#F5B83D" />
            <Path d="M7.5 18.5h9a3.5 3.5 0 0 0 .3-6.99A4.5 4.5 0 0 0 8.2 12.6 3 3 0 0 0 7.5 18.5Z" fill={c.muted} opacity={0.55} />
          </Svg>
          <Text style={[styles.temp, { color: c.ink }]}>19°</Text>
        </View>
      </View>

      <View style={styles.summary}>
        <Text style={[styles.summaryText, { color: c.muted }]}>9 events · 6 h 45 min booked</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to now"
          onPress={() => list.current?.scrollToIndex(NOW)}
          style={({ pressed }) => [
            styles.now,
            { backgroundColor: focused === NOW ? c.line : c.chip, opacity: pressed ? 0.75 : 1 },
            webPointer,
          ]}>
          <View style={[styles.nowDot, { backgroundColor: TONES.coral }]} />
          <Text style={[styles.nowText, { color: focused === NOW ? c.ink : c.onChip }]}>Now</Text>
        </Pressable>
      </View>

      <View style={styles.timeline}>
        {fonts ? (
          <FocusScroll
            ref={list}
            data={DAY}
            keyExtractor={(slot) => slot.key}
            getItemHeight={slotHeight}
            initialIndex={NOW}
            focalPoint={0.42}
            edgeFade={56}
            onFocusChange={setFocused}
            depth={{ blur: 6, scale: 0.95, opacity: 0.42, tilt: 0, spread: 2.6 }}
            accessibilityLabelForItem={(slot) => `${slot.start} to ${slot.end}, ${slot.title}, ${slot.place}`}
            renderItem={renderSlot}
          />
        ) : null}
      </View>
      <View style={{ height: insets.bottom + 8 }} />
    </View>
  );
}

function SlotRow({
  slot,
  now,
  width,
  height,
  fonts,
  scheme,
}: {
  slot: Slot;
  now: boolean;
  width: number;
  height: number;
  fonts: SkTypefaceFontProvider;
  scheme: Scheme;
}) {
  const c = COLORS[scheme];
  const tone = TONES[slot.tone];
  const cardX = TIME_COLUMN + 4;
  const cardW = width - cardX - 20;
  const cardH = height - 12;
  return (
    <Group>
      <Line p1={vec(TIME_COLUMN - 10, 0)} p2={vec(TIME_COLUMN - 10, height)} color={c.line} strokeWidth={1} />
      <Circle cx={TIME_COLUMN - 10} cy={20} r={now ? 5 : 3.5} color={now ? tone : c.muted} />
      {now ? <Circle cx={TIME_COLUMN - 10} cy={20} r={10} color={withAlpha(tone, 0.22)} /> : null}
      <FocusParagraph text={slot.start} fonts={fonts} width={TIME_COLUMN - 28} x={6} y={10} fontSize={14} weight={600} align="right" tabular color={now ? c.ink : c.muted} />
      <RoundedRect x={cardX} y={4} width={cardW} height={cardH} r={18} color={c.card} />
      <RoundedRect x={cardX} y={4} width={cardW} height={cardH} r={18} color={withAlpha(tone, scheme === 'dark' ? 0.16 : 0.1)} />
      <RoundedRect x={cardX + 10} y={16} width={4} height={Math.max(cardH - 24, 12)} r={2} color={tone} />
      <FocusParagraph text={slot.title} fonts={fonts} width={cardW - 40} x={cardX + 26} y={15} fontSize={17} weight={600} letterSpacing={-0.2} lineHeight={1.2} maxLines={2} color={c.ink} />
      <FocusParagraph text={`${slot.start} – ${slot.end}  ·  ${slot.place}`} fonts={fonts} width={cardW - 40} x={cardX + 26} y={cardH - 22} fontSize={13} weight={500} maxLines={1} color={withAlpha(scheme === 'dark' ? '#F2F2F6' : '#14131A', 0.62)} />
      {now ? <FocusParagraph text="NOW" fonts={fonts} width={60} x={cardX + cardW - 74} y={16} fontSize={11} weight={700} letterSpacing={1.4} align="right" color={tone} /> : null}
    </Group>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 24 },
  kicker: { fontSize: 14, fontWeight: '600' },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -1, marginTop: 2 },
  weather: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  temp: { fontSize: 18, fontWeight: '700' },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginTop: 14, marginBottom: 6 },
  summaryText: { fontSize: 13, fontWeight: '500' },
  now: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 16 },
  nowDot: { width: 7, height: 7, borderRadius: 4 },
  nowText: { fontSize: 13, fontWeight: '700' },
  timeline: { flex: 1 },
});

/** The demo with a safe-area provider of its own, so it runs anywhere (UpFork's preview gives it none). */
export default function Agenda({ scheme }: { scheme?: Scheme }) {
  return (
    <SafeAreaProvider>
      <AgendaScreen scheme={scheme} />
    </SafeAreaProvider>
  );
}
