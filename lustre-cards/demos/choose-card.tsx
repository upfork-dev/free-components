import { Canvas, RadialGradient, Rect, vec } from '@shopify/react-native-skia';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { LustreCarousel, type PaymentCard } from '../components/lustre-cards';
import type { Scheme } from '../lib/use-scheme';

const CARDS: (PaymentCard & { plan: string; price: string; per: string; perks: [Perk, string][] })[] = [
  {
    id: 'steel',
    material: 'steel',
    label: 'Steel',
    holder: 'Maya Ortiz',
    last4: '4821',
    expiry: '08/29',
    cvv: '317',
    plan: 'Steel',
    price: '€0',
    per: 'a month',
    perks: [
      ['card', 'A metal card, free for good'],
      ['cash', '2 free cash withdrawals a month'],
      ['bell', 'Instant alerts for every payment'],
    ],
  },
  {
    id: 'gold',
    material: 'gold',
    label: 'Champagne',
    holder: 'Maya Ortiz',
    last4: '7302',
    expiry: '11/29',
    cvv: '508',
    plan: 'Champagne',
    price: '€4.90',
    per: 'a month',
    perks: [
      ['back', '1% back on everything you buy'],
      ['plane', 'Travel insurance, worldwide'],
      ['chat', 'Priority support, day and night'],
    ],
  },
  {
    id: 'titanium',
    material: 'titanium',
    label: 'Titanium',
    holder: 'Maya Ortiz',
    last4: '0954',
    expiry: '03/30',
    cvv: '246',
    plan: 'Titanium',
    price: '€9.90',
    per: 'a month',
    perks: [
      ['back', '1.5% back on everything you buy'],
      ['plane', 'Four airport lounge visits a year'],
      ['globe', 'No fees on other currencies'],
    ],
  },
  {
    id: 'holo',
    material: 'holo',
    label: 'Prism',
    holder: 'Maya Ortiz',
    last4: '6618',
    expiry: '06/30',
    cvv: '871',
    plan: 'Prism',
    price: '€14.90',
    per: 'a month',
    perks: [
      ['back', '2% back on everything you buy'],
      ['chat', 'A personal concierge'],
      ['card', 'Two extra virtual cards'],
    ],
  },
];

type Perk = 'card' | 'cash' | 'bell' | 'back' | 'plane' | 'chat' | 'globe';

const COLORS = {
  dark: {
    page: '#0B0B0E',
    spot: 'rgba(120, 130, 170, 0.22)',
    ink: '#F2F2F5',
    muted: '#8C8D96',
    line: 'rgba(242, 242, 245, 0.08)',
    button: '#F2F2F5',
    onButton: '#0B0B0E',
    icon: '#C9CAD3',
  },
  light: {
    page: '#F3F2EF',
    spot: 'rgba(255, 255, 255, 0.9)',
    ink: '#14141A',
    muted: '#6E6F78',
    line: 'rgba(20, 20, 26, 0.08)',
    button: '#14141A',
    onButton: '#F3F2EF',
    icon: '#3D3E46',
  },
} as const;

const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;

/** Onboarding at an (invented) bank: choose your card. The plan below changes with it. */
function ChooseCardScreen({ scheme = 'dark' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  return (
    <View style={[styles.page, { backgroundColor: c.page }]}>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Rect x={0} y={0} width={width} height={height} dither>
          <RadialGradient c={vec(width / 2, height * 0.38)} r={width * 0.85} colors={[c.spot, withZero(c.spot)]} />
        </Rect>
      </Canvas>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.brand, { color: c.ink }]}>aurel</Text>
        <Text style={[styles.step, { color: c.muted }]}>Step 3 of 4</Text>
      </View>
      <Text style={[styles.title, { color: c.ink }]}>Pick your card</Text>
      <Text style={[styles.subtitle, { color: c.muted }]}>Every one is metal. Switch any time.</Text>

      <LustreCarousel
        scheme={scheme}
        cards={CARDS}
        initialIndex={2}
        cardWidth={Math.min(220, Math.round(width * 0.58))}
        style={styles.carousel}
        renderDetails={(card, index) => {
          const plan = CARDS[index];
          return (
            <View style={styles.details}>
              <View style={styles.planRow}>
                <Text style={[styles.plan, { color: c.ink }]}>{plan.plan}</Text>
                <Text style={[styles.price, { color: c.ink }]}>
                  {plan.price}
                  <Text style={[styles.per, { color: c.muted }]}> {plan.per}</Text>
                </Text>
              </View>
              <View style={[styles.rule, { backgroundColor: c.line }]} />
              {plan.perks.map(([icon, text]) => (
                <View key={text} style={styles.perk}>
                  <PerkIcon kind={icon} color={c.icon} />
                  <Text style={[styles.perkText, { color: c.ink }]}>{text}</Text>
                </View>
              ))}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Choose ${card.label}`}
                style={({ pressed }) => [styles.cta, { backgroundColor: c.button, opacity: pressed ? 0.85 : 1 }, webPointer]}>
                <Text style={[styles.ctaText, { color: c.onButton }]}>Choose {plan.plan}</Text>
              </Pressable>
              <Text style={[styles.note, { color: c.muted, marginBottom: insets.bottom }]}>Tap the card to see its back</Text>
            </View>
          );
        }}
      />
    </View>
  );
}

function withZero(rgba: string) {
  return rgba.replace(/,\s*[\d.]+\)$/, ', 0)');
}

function PerkIcon({ kind, color }: { kind: Perk; color: string }) {
  const s = { stroke: color, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      {kind === 'card' ? (
        <>
          <Path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h13a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-9Z" {...s} />
          <Path d="M3.5 10h17M7 15h3" {...s} />
        </>
      ) : kind === 'cash' ? (
        <>
          <Path d="M3.5 7h17v10h-17Z" {...s} />
          <Circle cx={12} cy={12} r={2.5} {...s} />
        </>
      ) : kind === 'bell' ? (
        <>
          <Path d="M6.5 16.5v-5a5.5 5.5 0 0 1 11 0v5l1.5 1.5H5l1.5-1.5Z" {...s} />
          <Path d="M10 20.5a2.2 2.2 0 0 0 4 0" {...s} />
        </>
      ) : kind === 'back' ? (
        <>
          <Path d="M19 12a7 7 0 1 1-2-4.95" {...s} />
          <Path d="M19 4.5V8h-3.5M9.5 14.5l5-5M10 10h.01M14 14h.01" {...s} />
        </>
      ) : kind === 'plane' ? (
        <Path d="M10.5 13.5 4 11l1.5-1.5 6 1L16 6a1.8 1.8 0 0 1 2.5 2.5L14 13l1 6-1.5 1.5-2.5-6.5L8 17v2l-1 1-1-3-3-1 1-1h2l3-3Z" {...s} />
      ) : kind === 'chat' ? (
        <Path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4.2 3.5V16A1.8 1.8 0 0 1 5 14.2V6.5Z" {...s} />
      ) : (
        <>
          <Circle cx={12} cy={12} r={8.5} {...s} />
          <Path d="M3.5 12h17M12 3.5c2.5 2.6 2.5 14.4 0 17M12 3.5c-2.5 2.6-2.5 14.4 0 17" {...s} />
        </>
      )}
    </Svg>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 },
  brand: { fontSize: 20, fontWeight: '800', letterSpacing: -0.6 },
  step: { fontSize: 13, fontWeight: '600' },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8, marginTop: 18, paddingHorizontal: 24 },
  subtitle: { fontSize: 15, marginTop: 4, paddingHorizontal: 24 },
  carousel: { flex: 1, marginTop: 6 },
  details: { flex: 1, paddingHorizontal: 24, paddingTop: 4 },
  planRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  plan: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  price: { fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  per: { fontSize: 13, fontWeight: '500' },
  rule: { height: StyleSheet.hairlineWidth, marginVertical: 12 },
  perk: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  perkText: { fontSize: 15, fontWeight: '500' },
  cta: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  ctaText: { fontSize: 16, fontWeight: '700' },
  note: { fontSize: 12, textAlign: 'center', marginTop: 10 },
});

/** The demo with a safe-area provider of its own, so it runs anywhere (UpFork's preview gives it none). */
export default function ChooseCard({ scheme }: { scheme?: Scheme }) {
  return (
    <SafeAreaProvider>
      <ChooseCardScreen scheme={scheme} />
    </SafeAreaProvider>
  );
}
