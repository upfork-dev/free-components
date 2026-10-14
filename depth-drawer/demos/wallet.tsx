import { useEffect, useId, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { Drawer, DrawerFooter, DrawerHeader, DrawerItem, DrawerMenu, DrawerSection, MenuButton } from '../components/depth-drawer';
import {
  AccountsIcon,
  BellIcon,
  CardsIcon,
  GridIcon,
  HelpIcon,
  InsightsIcon,
  PaymentsIcon,
  RequestIcon,
  SendIcon,
  SettingsIcon,
  TopUpIcon,
} from '../lib/icons';
import type { Scheme } from '../lib/use-scheme';

const COLORS = {
  light: { screen: '#FFFFFF', ink: '#15151A', muted: '#6C6C76', line: 'rgba(21, 21, 26, 0.07)', chip: '#F3F2EE', plus: '#15803D' },
  dark: { screen: '#16161B', ink: '#F2F2F5', muted: '#94949F', line: 'rgba(255, 255, 255, 0.07)', chip: '#202027', plus: '#4ADE80' },
} as const;

// Invented merchants and people.
const ACTIVITY = [
  { name: 'Fern & Field Market', when: 'Today · 18:20', amount: '−€42.60', hue: ['#7ED6A5', '#2F8F6A'], glyph: 'M9 15c0-4 2-6 6-7-1 4-3 6-6 7Zm0 0-2 2' },
  { name: 'Salary · Harbor Atelier', when: 'Today · 09:00', amount: '+€3,250.00', hue: ['#A9B7FF', '#5B67D8'], glyph: 'M8 16V9l4-2 4 2v7M11 16v-3h2v3' },
  { name: 'Night Line Transit', when: 'Yesterday · 23:41', amount: '−€2.80', hue: ['#FFC48A', '#E07A3B'], glyph: 'M9 8h6a1 1 0 0 1 1 1v5H8V9a1 1 0 0 1 1-1Zm0 8-1 1.5M15 16l1 1.5' },
  { name: 'Ember Corner Café', when: 'Yesterday · 08:12', amount: '−€6.40', hue: ['#F7A6B9', '#C9486C'], glyph: 'M8 11h7v2a3 3 0 0 1-3 3h-1a3 3 0 0 1-3-3v-2Zm7 0h1a1.5 1.5 0 0 1 0 3h-1' },
  { name: 'Pellucid Print Studio', when: 'Mon · 14:05', amount: '−€58.00', hue: ['#9FE3F2', '#2C93B5'], glyph: 'M8.5 10V7.5h7V10M8 10h8a1 1 0 0 1 1 1v3h-2.5v2h-5v-2H7v-3a1 1 0 0 1 1-1Z' },
];

const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;
const SVG_FONT = Platform.OS === 'web' ? 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' : undefined;

/** A finance app whose screen steps back into depth (two ghost layers) to show the menu. It starts open. */
function WalletScreen({ scheme: initial = 'light' }: { scheme?: Scheme }) {
  const [scheme, setScheme] = useState<Scheme>(initial);
  useEffect(() => setScheme(initial), [initial]);
  const [active, setActive] = useState('accounts');
  const c = COLORS[scheme];
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');

  const menu = () => (
    <DrawerMenu>
      <DrawerHeader
        order={0}
        name="Maya Ortiz"
        badge="Premium"
        detail="Personal"
        avatar={
          <Svg width={46} height={46} viewBox="0 0 46 46">
            <Defs>
              <LinearGradient id={`${uid}av`} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#FFC9A8" />
                <Stop offset="1" stopColor="#E0739A" />
              </LinearGradient>
            </Defs>
            <Circle cx={23} cy={23} r={23} fill={`url(#${uid}av)`} />
            <SvgText x={23} y={28.5} textAnchor="middle" fontSize={16} fontWeight="700" fill="#FFFFFF" fontFamily={SVG_FONT}>
              MO
            </SvgText>
          </Svg>
        }
      />
      <DrawerSection title="Money" order={1}>
        <DrawerItem order={2} label="Accounts" icon={AccountsIcon} active={active === 'accounts'} onPress={() => setActive('accounts')} />
        <DrawerItem order={3} label="Cards" icon={CardsIcon} active={active === 'cards'} onPress={() => setActive('cards')} />
        <DrawerItem order={4} label="Payments" icon={PaymentsIcon} badge={2} active={active === 'payments'} onPress={() => setActive('payments')} />
        <DrawerItem order={5} label="Insights" icon={InsightsIcon} active={active === 'insights'} onPress={() => setActive('insights')} />
      </DrawerSection>
      <DrawerSection title="You" order={6}>
        <DrawerItem order={7} label="Settings" icon={SettingsIcon} active={active === 'settings'} onPress={() => setActive('settings')} />
        <DrawerItem order={8} label="Help" icon={HelpIcon} active={active === 'help'} onPress={() => setActive('help')} />
      </DrawerSection>
      <DrawerFooter order={9} scheme={scheme} onSchemeChange={setScheme} onSignOut={() => undefined} />
    </DrawerMenu>
  );

  return (
    <Drawer renderMenu={menu} variant="scale" ghostLayers={2} defaultOpen scheme={scheme} screenBackground={c.screen}>
      <Screen scheme={scheme} uid={uid} />
    </Drawer>
  );
}

function Screen({ scheme, uid }: { scheme: Scheme; uid: string }) {
  const c = COLORS[scheme];
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { backgroundColor: c.screen }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 6, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        <View style={styles.bar}>
          <MenuButton color={c.ink} />
          <Text style={[styles.barTitle, { color: c.ink }]}>Wallet</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Notifications" style={[styles.round, webPointer]}>
            <BellIcon color={c.ink} size={22} />
          </Pressable>
        </View>

        <View style={styles.cardWrap}>
          <Svg width="100%" height={188} style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id={`${uid}card`} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#2B2D6E" />
                <Stop offset="0.55" stopColor="#4A3F9E" />
                <Stop offset="1" stopColor="#B65E8C" />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width="100%" height={188} rx={24} fill={`url(#${uid}card)`} />
            <Circle cx="88%" cy={-10} r={110} fill="#FFFFFF" opacity={0.06} />
            <Circle cx="96%" cy={170} r={70} fill="#FFFFFF" opacity={0.05} />
          </Svg>
          <View style={styles.cardBody}>
            <Text style={styles.cardLabel}>Total balance</Text>
            <Text style={styles.cardBalance}>€12,480.20</Text>
            <View style={styles.cardRow}>
              <Text style={styles.cardNote}>+€320.40 this month</Text>
              <Text style={styles.cardNumber}>•••• 4821</Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          {[
            ['Send', SendIcon],
            ['Request', RequestIcon],
            ['Top up', TopUpIcon],
            ['More', GridIcon],
          ].map(([label, Icon]) => {
            const I = Icon as typeof SendIcon;
            return (
              <Pressable key={label as string} accessibilityRole="button" style={[styles.action, webPointer]}>
                <View style={[styles.actionIcon, { backgroundColor: c.chip }]}>
                  <I color={c.ink} size={20} />
                </View>
                <Text style={[styles.actionLabel, { color: c.ink }]}>{label as string}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.listHead}>
          <Text style={[styles.listTitle, { color: c.ink }]}>Recent activity</Text>
          <Text style={[styles.listMore, { color: c.muted }]}>See all</Text>
        </View>
        {ACTIVITY.map((a, i) => (
          <View key={a.name} style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: c.line }]}>
            <Svg width={42} height={42} viewBox="0 0 24 24">
              <Defs>
                <LinearGradient id={`${uid}m${i}`} x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={a.hue[0]} />
                  <Stop offset="1" stopColor={a.hue[1]} />
                </LinearGradient>
              </Defs>
              <Rect x={0} y={0} width={24} height={24} rx={8} fill={`url(#${uid}m${i})`} />
              <Path d={a.glyph} stroke="#FFFFFF" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </Svg>
            <View style={styles.rowText}>
              <Text style={[styles.rowName, { color: c.ink }]} numberOfLines={1}>
                {a.name}
              </Text>
              <Text style={[styles.rowWhen, { color: c.muted }]}>{a.when}</Text>
            </View>
            <Text style={[styles.rowAmount, { color: a.amount.startsWith('+') ? c.plus : c.ink }]}>{a.amount}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { height: 50, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  barTitle: { flex: 1, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  round: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  cardWrap: { marginHorizontal: 16, marginTop: 8, height: 188, borderRadius: 24, overflow: 'hidden' },
  cardBody: { flex: 1, padding: 22, justifyContent: 'space-between' },
  cardLabel: { color: 'rgba(255, 255, 255, 0.78)', fontSize: 14, fontWeight: '600' },
  cardBalance: { color: '#FFFFFF', fontSize: 34, fontWeight: '800', letterSpacing: -0.8 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardNote: { color: 'rgba(255, 255, 255, 0.85)', fontSize: 13, fontWeight: '600' },
  cardNumber: { color: 'rgba(255, 255, 255, 0.75)', fontSize: 13, fontWeight: '600', letterSpacing: 1 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 22, marginTop: 20 },
  action: { alignItems: 'center', gap: 6, width: 64 },
  actionIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 12, fontWeight: '600' },
  listHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 20, marginTop: 24, marginBottom: 6 },
  listTitle: { fontSize: 17, fontWeight: '800' },
  listMore: { fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, paddingVertical: 11 },
  rowText: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600' },
  rowWhen: { fontSize: 12, marginTop: 2 },
  rowAmount: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
});

/** The demo with a safe-area provider of its own, so it runs anywhere (UpFork's preview gives it none). */
export default function WalletDemo({ scheme }: { scheme?: Scheme }) {
  return (
    <SafeAreaProvider>
      <WalletScreen scheme={scheme} />
    </SafeAreaProvider>
  );
}
