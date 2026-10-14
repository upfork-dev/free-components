import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { LustreTiltCard, type PaymentCard } from '../components/lustre-cards';
import type { Scheme } from '../lib/use-scheme';

const COLORS = {
  dark: { page: '#0B0B0E', card: '#15151A', ink: '#F2F2F5', muted: '#8C8D96', line: 'rgba(242, 242, 245, 0.08)', accent: '#8FB4FF', track: 'rgba(242, 242, 245, 0.1)' },
  light: { page: '#F3F2EF', card: '#FFFFFF', ink: '#14141A', muted: '#6E6F78', line: 'rgba(20, 20, 26, 0.08)', accent: '#2F5BEA', track: 'rgba(20, 20, 26, 0.08)' },
} as const;

const MOVES = [
  ['Corner Bakery', 'Food & drink', '−€6.40', 'Today, 8:12', 'food'],
  ['Metro pass', 'Transport', '−€32.00', 'Today, 7:50', 'transit'],
  ['Harbor Books', 'Shopping', '−€18.90', 'Yesterday', 'bag'],
  ['Salary', 'Income', '+€2,350.00', 'Mon', 'in'],
  ['Night Market', 'Food & drink', '−€24.10', 'Sun', 'food'],
] as const;

const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;

/** One card, close up: tilt it, freeze it, turn it over to hold-reveal the security code. */
function CardDetailScreen({ scheme = 'dark' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [frozen, setFrozen] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const card: PaymentCard = {
    id: 'main',
    material: 'titanium',
    label: 'Titanium',
    holder: 'Maya Ortiz',
    last4: '0954',
    expiry: '03/30',
    cvv: '246',
    frozen,
  };
  const cardWidth = Math.min(width - 48, 340);
  return (
    <ScrollView style={{ backgroundColor: c.page }} contentContainerStyle={[styles.page, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 28 }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.ink }]}>Titanium card</Text>
        <Text style={[styles.status, { color: frozen ? c.accent : c.muted }]}>{frozen ? 'Frozen' : 'Active'}</Text>
      </View>
      <View style={styles.cardWrap}>
        <LustreTiltCard card={card} width={cardWidth} orientation="landscape" flipped={flipped} onPress={() => setFlipped((v) => !v)} />
      </View>
      <Text style={[styles.hint, { color: c.muted }]}>Drag across the card to tilt it · tap to turn it over</Text>

      <View style={styles.balanceRow}>
        <View>
          <Text style={[styles.kicker, { color: c.muted }]}>Balance</Text>
          <Text style={[styles.balance, { color: c.ink }]}>€2,418.60</Text>
        </View>
        <Text style={[styles.kicker, { color: c.muted }]}>Available</Text>
      </View>

      <View style={[styles.panel, { backgroundColor: c.card, borderColor: c.line }]}>
        <View style={styles.row}>
          <Glyph kind="snow" color={c.ink} />
          <View style={styles.fill}>
            <Text style={[styles.rowTitle, { color: c.ink }]}>Freeze card</Text>
            <Text style={[styles.rowNote, { color: c.muted }]}>Stops payments until you unfreeze it</Text>
          </View>
          <Switch value={frozen} onValueChange={setFrozen} trackColor={{ true: c.accent, false: c.track }} thumbColor="#FFFFFF" />
        </View>
        <View style={[styles.rule, { backgroundColor: c.line }]} />
        <Pressable accessibilityRole="button" onPress={() => setFlipped((v) => !v)} style={[styles.row, webPointer]}>
          <Glyph kind="eye" color={c.ink} />
          <View style={styles.fill}>
            <Text style={[styles.rowTitle, { color: c.ink }]}>{flipped ? 'Hide details' : 'Show details'}</Text>
            <Text style={[styles.rowNote, { color: c.muted }]}>Turn the card over, then hold the code</Text>
          </View>
          <Text style={[styles.chevron, { color: c.muted }]}>›</Text>
        </Pressable>
        <View style={[styles.rule, { backgroundColor: c.line }]} />
        <View style={styles.row}>
          <Glyph kind="gauge" color={c.ink} />
          <View style={styles.fill}>
            <Text style={[styles.rowTitle, { color: c.ink }]}>Monthly limit</Text>
            <View style={[styles.limitTrack, { backgroundColor: c.track }]}>
              <View style={[styles.limitFill, { backgroundColor: c.accent, width: '42%' }]} />
            </View>
            <Text style={[styles.rowNote, { color: c.muted }]}>€1,260 of €3,000 spent</Text>
          </View>
        </View>
      </View>

      <Text style={[styles.section, { color: c.ink }]}>Recent</Text>
      <View style={[styles.panel, { backgroundColor: c.card, borderColor: c.line }]}>
        {MOVES.map(([name, kind, amount, when, glyph], i) => (
          <View key={name}>
            {i > 0 ? <View style={[styles.rule, { backgroundColor: c.line }]} /> : null}
            <View style={styles.row}>
              <View style={[styles.badge, { backgroundColor: c.track }]}>
                <Glyph kind={glyph} color={c.ink} />
              </View>
              <View style={styles.fill}>
                <Text style={[styles.rowTitle, { color: c.ink }]}>{name}</Text>
                <Text style={[styles.rowNote, { color: c.muted }]}>{kind} · {when}</Text>
              </View>
              <Text style={[styles.amount, { color: amount.startsWith('+') ? '#2EBD6B' : c.ink }]}>{amount}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function Glyph({ kind, color }: { kind: string; color: string }) {
  const s = { stroke: color, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      {kind === 'snow' ? (
        <Path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5" {...s} />
      ) : kind === 'eye' ? (
        <>
          <Path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" {...s} />
          <Circle cx={12} cy={12} r={3} {...s} />
        </>
      ) : kind === 'gauge' ? (
        <>
          <Path d="M4 16a8 8 0 1 1 16 0" {...s} />
          <Path d="m12 16 3.5-4.5" {...s} />
        </>
      ) : kind === 'food' ? (
        <Path d="M7 3v8a2 2 0 0 0 4 0V3M9 11v10M16 3c-1.7 1-2.5 3-2.5 6v3H17v9" {...s} />
      ) : kind === 'transit' ? (
        <>
          <Rect x={5} y={3.5} width={14} height={14} rx={3} {...s} />
          <Path d="M5 11h14M8.5 21l1.5-3.5M15.5 21 14 17.5" {...s} />
        </>
      ) : kind === 'bag' ? (
        <Path d="M5.5 8.5h13l-.9 10.7a1.5 1.5 0 0 1-1.5 1.3H7.9a1.5 1.5 0 0 1-1.5-1.3L5.5 8.5ZM9 10.5V7a3 3 0 0 1 6 0v3.5" {...s} />
      ) : (
        <Path d="M12 19V5M6 11l6-6 6 6" {...s} />
      )}
    </Svg>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 24 },
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6 },
  status: { fontSize: 14, fontWeight: '700' },
  cardWrap: { alignItems: 'center', marginTop: 22 },
  hint: { fontSize: 12, textAlign: 'center', marginTop: 14 },
  balanceRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 22 },
  kicker: { fontSize: 13, fontWeight: '600' },
  balance: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8, marginTop: 2, fontVariant: ['tabular-nums'] },
  panel: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, marginTop: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowNote: { fontSize: 12.5, marginTop: 2 },
  rule: { height: StyleSheet.hairlineWidth },
  chevron: { fontSize: 22 },
  limitTrack: { height: 6, borderRadius: 3, marginTop: 8, marginBottom: 4, overflow: 'hidden' },
  limitFill: { height: 6, borderRadius: 3 },
  section: { fontSize: 18, fontWeight: '700', marginTop: 22 },
  badge: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  amount: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
});

/** The demo with a safe-area provider of its own, so it runs anywhere (UpFork's preview gives it none). */
export default function CardDetail({ scheme }: { scheme?: Scheme }) {
  return (
    <SafeAreaProvider>
      <CardDetailScreen scheme={scheme} />
    </SafeAreaProvider>
  );
}
