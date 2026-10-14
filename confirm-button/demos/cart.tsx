import { useId, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { ConfirmButton } from '../components/confirm-button';
import type { Scheme } from '../lib/use-scheme';

const COLORS = {
  light: { page: '#F5F4F0', card: '#FFFFFF', ink: '#17171B', muted: '#6C6C75', line: 'rgba(23, 23, 27, 0.07)', tile: '#F1EEE8', cta: '#17171B', ctaText: '#FFFFFF' },
  dark: { page: '#0C0C0F', card: '#16161B', ink: '#F3F3F6', muted: '#94949E', line: 'rgba(255, 255, 255, 0.07)', tile: '#202027', cta: '#F3F3F6', ctaText: '#0C0C0F' },
} as const;

type Item = { id: string; name: string; detail: string; price: number; art: 'mug' | 'lamp' | 'plant' };
// Invented goods from an invented shop.
const START: Item[] = [
  { id: 'mug', name: 'Tidewater mug', detail: 'Stoneware · Sea glaze', price: 28, art: 'mug' },
  { id: 'lamp', name: 'Orbit desk lamp', detail: 'Brass · Warm white', price: 124, art: 'lamp' },
  { id: 'plant', name: 'Fern in a clay pot', detail: 'Ø 14 cm · Terracotta', price: 36, art: 'plant' },
];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const euro = (n: number) => `€${n.toFixed(2)}`;
const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;

/** A shopping bag: each row's Remove arms inline; confirmed, the row folds away and the totals follow. */
function CartScreen({ scheme = 'light' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState(START);
  const subtotal = items.reduce((sum, i) => sum + i.price, 0);
  const shipping = items.length ? 4.9 : 0;

  return (
    <View style={[styles.page, { backgroundColor: c.page }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: c.ink }]}>Bag</Text>
        <Text style={[styles.count, { color: c.muted }]}>
          {items.length === 0 ? 'Empty' : `${items.length} ${items.length === 1 ? 'item' : 'items'}`}
        </Text>

        <View style={styles.list}>
          {items.map((item) => (
            <Animated.View
              key={item.id}
              layout={LinearTransition.springify().damping(26).stiffness(260)}
              exiting={FadeOut.duration(180)}
              style={[styles.row, { backgroundColor: c.card }]}
            >
              <View style={[styles.tile, { backgroundColor: c.tile }]}>
                <Art kind={item.art} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.name, { color: c.ink }]}>{item.name}</Text>
                <Text style={[styles.detail, { color: c.muted }]}>{item.detail}</Text>
                <View style={styles.rowBottom}>
                  <Text style={[styles.price, { color: c.ink }]}>{euro(item.price)}</Text>
                  <ConfirmButton
                    label="Remove"
                    armedLabel="Sure?"
                    doneLabel="Removed"
                    busyLabel={`Removing ${item.name}`}
                    size="sm"
                    tone="danger"
                    align="end"
                    armTimeout={3500}
                    persistDone
                    onConfirm={async () => {
                      await wait(650);
                      setTimeout(() => setItems((list) => list.filter((i) => i.id !== item.id)), 520);
                    }}
                    scheme={scheme}
                  />
                </View>
              </View>
            </Animated.View>
          ))}
          {items.length === 0 ? (
            <Animated.View style={[styles.empty, { backgroundColor: c.card }]}>
              <Text style={[styles.emptyText, { color: c.muted }]}>Your bag is empty.</Text>
              <Pressable onPress={() => setItems(START)} accessibilityRole="button" style={webPointer}>
                <Text style={[styles.again, { color: c.ink }]}>Put everything back</Text>
              </Pressable>
            </Animated.View>
          ) : null}
        </View>

        <Animated.View layout={LinearTransition.springify().damping(26).stiffness(260)} style={[styles.summary, { backgroundColor: c.card }]}>
          <Line label="Subtotal" value={euro(subtotal)} c={c} />
          <Line label="Shipping" value={euro(shipping)} c={c} />
          <View style={[styles.rule, { backgroundColor: c.line }]} />
          <Line label="Total" value={euro(subtotal + shipping)} c={c} strong />
          <Pressable accessibilityRole="button" style={[styles.cta, { backgroundColor: c.cta, opacity: items.length ? 1 : 0.4 }, webPointer]}>
            <Text style={[styles.ctaText, { color: c.ctaText }]}>Check out</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function Line({ label, value, c, strong }: { label: string; value: string; c: (typeof COLORS)[Scheme]; strong?: boolean }) {
  return (
    <View style={styles.line}>
      <Text style={[strong ? styles.totalLabel : styles.lineLabel, { color: strong ? c.ink : c.muted }]}>{label}</Text>
      <Text style={[strong ? styles.totalValue : styles.lineValue, { color: c.ink }]}>{value}</Text>
    </View>
  );
}

/** Small product pictures, drawn for the demo. */
function Art({ kind }: { kind: Item['art'] }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  if (kind === 'mug') {
    return (
      <Svg width={46} height={46} viewBox="0 0 48 48">
        <Defs>
          <LinearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#7CC6C1" />
            <Stop offset="1" stopColor="#2F7C86" />
          </LinearGradient>
        </Defs>
        <Ellipse cx={22} cy={40} rx={13} ry={2.5} fill="#000" opacity={0.12} />
        <Path d="M33 18h3.5a5 5 0 0 1 0 10H33" stroke="#2F7C86" strokeWidth={3} fill="none" />
        <Rect x={10} y={12} width={24} height={27} rx={5} fill={`url(#${id}g)`} />
        <Ellipse cx={22} cy={12.5} rx={12} ry={2.5} fill="#A9DDD8" />
      </Svg>
    );
  }
  if (kind === 'lamp') {
    return (
      <Svg width={46} height={46} viewBox="0 0 48 48">
        <Ellipse cx={24} cy={42} rx={11} ry={2.2} fill="#000" opacity={0.12} />
        <Rect x={15} y={38} width={18} height={3} rx={1.5} fill="#B58B3E" />
        <Path d="M24 38V22l9-9" stroke="#C99A45" strokeWidth={2.4} strokeLinecap="round" fill="none" />
        <Circle cx={24} cy={22} r={2.2} fill="#C99A45" />
        <Path d="M26 8.5 38 20.5l-4 4-12-12z" fill="#D9B263" />
        <Circle cx={33} cy={22} r={3} fill="#FFE7A8" opacity={0.9} />
      </Svg>
    );
  }
  return (
    <Svg width={46} height={46} viewBox="0 0 48 48">
      <Ellipse cx={24} cy={43} rx={11} ry={2.2} fill="#000" opacity={0.12} />
      <Path d="M15 30h18l-2.5 12h-13z" fill="#C8693F" />
      <Rect x={14} y={28} width={20} height={4} rx={1.5} fill="#D9794D" />
      <Path d="M24 28c0-8-3-14-9-18M24 28c0-7 3-13 9-16M24 28c-1-6-6-9-11-9M24 28c1-5 5-9 11-9M24 28V9" stroke="#3F8A4E" strokeWidth={2.2} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.7, marginHorizontal: 20 },
  count: { fontSize: 14, marginHorizontal: 20, marginTop: 2 },
  list: { marginTop: 16, gap: 10 },
  row: { marginHorizontal: 16, borderRadius: 20, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 14 },
  tile: { width: 76, height: 76, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700' },
  detail: { fontSize: 12, marginTop: 2 },
  price: { fontSize: 15, fontWeight: '700' },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  empty: { marginHorizontal: 16, borderRadius: 20, padding: 20, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 15 },
  again: { fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },
  summary: { marginHorizontal: 16, marginTop: 16, borderRadius: 20, padding: 16 },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  lineLabel: { fontSize: 14 },
  lineValue: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  rule: { height: 1, marginVertical: 8 },
  totalLabel: { fontSize: 16, fontWeight: '700' },
  totalValue: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  cta: { height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  ctaText: { fontSize: 16, fontWeight: '700' },
});

/** The demo with a safe-area provider of its own, so it runs anywhere (UpFork's preview gives it none). */
export default function CartDemo({ scheme }: { scheme?: Scheme }) {
  return (
    <SafeAreaProvider>
      <CartScreen scheme={scheme} />
    </SafeAreaProvider>
  );
}
