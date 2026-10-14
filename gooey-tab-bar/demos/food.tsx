import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

import { GooeyIcons, GooeyTabBar, type GooeyIcon, type GooeyTab } from '../components/gooey-tab-bar';
import type { Scheme } from '../lib/use-scheme';

const COLORS = {
  light: {
    page: '#F6EFE6',
    card: '#FFFDF9',
    ink: '#2A1D16',
    muted: '#8C7A6E',
    line: 'rgba(42, 29, 22, 0.08)',
    chip: '#FFFDF9',
    accent: '#FF5A4E',
    bar: '#FFFDF9',
    icon: '#A8968A',
    center: '#2A1D16',
    onCenter: '#FFF6EC',
  },
  dark: {
    page: '#16100D',
    card: '#221915',
    ink: '#F7EDE4',
    muted: '#A6958A',
    line: 'rgba(247, 237, 228, 0.08)',
    chip: '#221915',
    accent: '#FF6A5C',
    bar: '#2A1F1A',
    icon: '#8F7D71',
    center: '#FFF1E4',
    onCenter: '#2A1D16',
  },
} as const;

const ReorderIcon: GooeyIcon = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M4 4.5v3.8h3.8" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 8.5V12l2.5 1.6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const ScanIcon: GooeyIcon = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M7.5 12h9" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);
const GroupIcon: GooeyIcon = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={9} cy={9} r={3.2} stroke={color} strokeWidth={2} />
    <Path d="M3.5 19a5.5 5.5 0 0 1 11 0" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M15.5 6.2a3 3 0 0 1 0 5.6M17.5 14.3a5.2 5.2 0 0 1 3 4.7" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

/** A food-delivery app: the bar's bubble floats on a liquid neck, and "Order" blooms three quick actions. */
function FoodScreen({ scheme = 'light' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const [tab, setTab] = useState(0);
  const [cart, setCart] = useState(3);
  const tabs: GooeyTab[] = [
    { key: 'home', label: 'Home', icon: GooeyIcons.home },
    { key: 'search', label: 'Search', icon: GooeyIcons.search },
    { key: 'cart', label: 'Cart', icon: GooeyIcons.bag, badge: cart },
    { key: 'profile', label: 'Profile', icon: GooeyIcons.user },
  ];

  return (
    <View style={[styles.page, { backgroundColor: c.page }]}>
      {/* Every screen stays mounted: switching only cross-fades, so the bar's flight never waits for a render. */}
      <Fade active={tab === 0}>
        <Home scheme={scheme} onAdd={() => setCart((n) => n + 1)} />
      </Fade>
      <Fade active={tab === 1}>
        <SearchScreen scheme={scheme} />
      </Fade>
      <Fade active={tab === 2}>
        <CartScreen scheme={scheme} count={cart} />
      </Fade>
      <Fade active={tab === 3}>
        <ProfileScreen scheme={scheme} />
      </Fade>
      <GooeyTabBar
        scheme={scheme}
        tabs={tabs}
        index={tab}
        onChange={setTab}
        colors={{ bar: c.bar, bubble: c.accent, icon: c.icon, label: c.icon, center: c.center, onCenter: c.onCenter }}
        centerAction={{
          label: 'Order',
          actions: [
            { key: 'reorder', label: 'Reorder', icon: ReorderIcon, onPress: () => setTab(2) },
            { key: 'scan', label: 'Scan menu', icon: ScanIcon, onPress: () => undefined },
            { key: 'group', label: 'Group order', icon: GroupIcon, onPress: () => undefined },
          ],
        }}
      />
    </View>
  );
}

function Screen({ scheme, title, kicker, children }: { scheme: Scheme; title: string; kicker?: string; children: ReactNode }) {
  const c = COLORS[scheme];
  const insets = useSafeAreaInsets();
  return (
    <ScrollView contentContainerStyle={[styles.screen, { paddingTop: insets.top + 18, paddingBottom: 150 + insets.bottom }]}>
      {kicker ? <Text style={[styles.kicker, { color: c.muted }]}>{kicker}</Text> : null}
      <Text style={[styles.title, { color: c.ink }]}>{title}</Text>
      {children}
    </ScrollView>
  );
}

const CUISINES = [
  { label: 'Bowls', tint: '#7FB069' },
  { label: 'Pizza', tint: '#E8613C' },
  { label: 'Sushi', tint: '#E89BA8' },
  { label: 'Curry', tint: '#E4A73A' },
  { label: 'Sweets', tint: '#B07CD8' },
];

function Home({ scheme, onAdd }: { scheme: Scheme; onAdd: () => void }) {
  const c = COLORS[scheme];
  return (
    <Screen scheme={scheme} kicker="Deliver to · 12 Flower Street" title="Good evening, Sam">
      <View style={[styles.search, { backgroundColor: c.card, borderColor: c.line }]}>
        {GooeyIcons.search({ color: c.muted, size: 18, focused: false })}
        <Text style={[styles.searchText, { color: c.muted }]}>Dishes, restaurants, cravings</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {CUISINES.map((cuisine, i) => (
          <View key={cuisine.label} style={[styles.chip, { backgroundColor: i === 0 ? c.ink : c.chip, borderColor: c.line }]}>
            <View style={[styles.chipDot, { backgroundColor: cuisine.tint }]} />
            <Text style={[styles.chipText, { color: i === 0 ? c.page : c.ink }]}>{cuisine.label}</Text>
          </View>
        ))}
      </ScrollView>
      <Text style={[styles.section, { color: c.ink }]}>Near you</Text>
      <Restaurant scheme={scheme} name="Bowl & Basil" meta="4.8 · 20–30 min · Free delivery" dish="bowl" onAdd={onAdd} />
      <Restaurant scheme={scheme} name="Forno Rosa" meta="4.7 · 25–35 min · €1.49 delivery" dish="pizza" onAdd={onAdd} />
    </Screen>
  );
}

function Restaurant({ scheme, name, meta, dish, onAdd }: { scheme: Scheme; name: string; meta: string; dish: 'bowl' | 'pizza'; onAdd: () => void }) {
  const c = COLORS[scheme];
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.line }]}>
      <View style={[styles.art, { backgroundColor: dish === 'bowl' ? '#F4E3C9' : '#F7D6C8' }]}>
        {dish === 'bowl' ? <BowlArt /> : <PizzaArt />}
      </View>
      <View style={styles.cardRow}>
        <View style={styles.fill}>
          <Text style={[styles.cardTitle, { color: c.ink }]}>{name}</Text>
          <Text style={[styles.cardMeta, { color: c.muted }]}>{meta}</Text>
        </View>
        <Text accessibilityRole="button" onPress={onAdd} style={[styles.add, { backgroundColor: c.accent }]}>
          Add
        </Text>
      </View>
    </View>
  );
}

function BowlArt() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 320 140" preserveAspectRatio="xMidYMid slice">
      <Path d="M140 30c-6 10 6 16 0 26M160 22c-6 12 6 18 0 30M180 30c-6 10 6 16 0 26" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={4} strokeLinecap="round" fill="none" />
      <Ellipse cx={160} cy={84} rx={86} ry={20} fill="#3E7D4F" />
      <Circle cx={128} cy={78} r={14} fill="#F2B84B" />
      <Circle cx={152} cy={72} r={10} fill="#E05A47" />
      <Circle cx={182} cy={76} r={16} fill="#7FB069" />
      <Circle cx={204} cy={84} r={9} fill="#F7E7C6" />
      <Path d="M74 86c4 34 38 48 86 48s82-14 86-48Z" fill="#E86F4C" />
      <Path d="M74 86c4 34 38 48 86 48s82-14 86-48" stroke="#C9543A" strokeWidth={3} fill="none" />
    </Svg>
  );
}

function PizzaArt() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 320 140" preserveAspectRatio="xMidYMid slice">
      <Circle cx={160} cy={74} r={58} fill="#E9A75A" />
      <Circle cx={160} cy={74} r={50} fill="#D9452F" />
      <Circle cx={160} cy={74} r={44} fill="#F6D27A" />
      {[[140, 58], [176, 52], [184, 86], [146, 92], [162, 74]].map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={7} fill="#C8382B" />
      ))}
      {[[130, 76], [192, 66], [158, 100]].map(([x, y], i) => (
        <Ellipse key={i} cx={x} cy={y} rx={6} ry={3.5} fill="#4E8F45" transform={`rotate(${i * 50} ${x} ${y})`} />
      ))}
    </Svg>
  );
}

function SearchScreen({ scheme }: { scheme: Scheme }) {
  const c = COLORS[scheme];
  const recent = ['Green curry', 'Margherita', 'Poke bowl', 'Cinnamon buns'];
  return (
    <Screen scheme={scheme} title="Search">
      <View style={[styles.search, { backgroundColor: c.card, borderColor: c.line }]}>
        {GooeyIcons.search({ color: c.muted, size: 18, focused: false })}
        <Text style={[styles.searchText, { color: c.muted }]}>What are you craving?</Text>
      </View>
      <Text style={[styles.section, { color: c.ink }]}>Recent</Text>
      {recent.map((item) => (
        <View key={item} style={[styles.row, { borderColor: c.line }]}>
          <ReorderIcon color={c.muted} size={18} focused={false} />
          <Text style={[styles.rowText, { color: c.ink }]}>{item}</Text>
        </View>
      ))}
    </Screen>
  );
}

function CartScreen({ scheme, count }: { scheme: Scheme; count: number }) {
  const c = COLORS[scheme];
  const items = [
    ['Harvest bowl', '€11.50'],
    ['Miso soup', '€4.20'],
    ['Margherita', '€9.80'],
    ['Lemon tart', '€5.10'],
    ['Sparkling water', '€2.40'],
  ].slice(0, Math.max(1, Math.min(count, 5)));
  return (
    <Screen scheme={scheme} title="Your cart" kicker={`${count} items`}>
      {items.map(([name, price]) => (
        <View key={name} style={[styles.row, { borderColor: c.line }]}>
          <View style={[styles.qty, { backgroundColor: c.card, borderColor: c.line }]}>
            <Text style={[styles.qtyText, { color: c.ink }]}>1</Text>
          </View>
          <Text style={[styles.rowText, styles.fill, { color: c.ink }]}>{name}</Text>
          <Text style={[styles.rowText, { color: c.ink }]}>{price}</Text>
        </View>
      ))}
    </Screen>
  );
}

function ProfileScreen({ scheme }: { scheme: Scheme }) {
  const c = COLORS[scheme];
  return (
    <Screen scheme={scheme} title="Sam Okafor" kicker="Member since 2024">
      <View style={styles.stats}>
        {[['42', 'Orders'], ['€38', 'Saved'], ['9', 'Favourites']].map(([value, label]) => (
          <View key={label} style={[styles.stat, { backgroundColor: c.card, borderColor: c.line }]}>
            <Text style={[styles.statValue, { color: c.ink }]}>{value}</Text>
            <Text style={[styles.cardMeta, { color: c.muted }]}>{label}</Text>
          </View>
        ))}
      </View>
      {['Addresses', 'Payment', 'Notifications', 'Help'].map((item) => (
        <View key={item} style={[styles.row, { borderColor: c.line }]}>
          <Text style={[styles.rowText, styles.fill, { color: c.ink }]}>{item}</Text>
          <Text style={{ color: c.muted, fontSize: 18 }}>›</Text>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  fill: { flex: 1 },
  screen: { paddingHorizontal: 20 },
  kicker: { fontSize: 13, fontWeight: '600' },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8, marginTop: 4, marginBottom: 16 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, borderRadius: 16, paddingHorizontal: 16, borderWidth: StyleSheet.hairlineWidth },
  searchText: { fontSize: 15 },
  chips: { gap: 8, paddingVertical: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 38, paddingHorizontal: 14, borderRadius: 19, borderWidth: StyleSheet.hairlineWidth },
  chipDot: { width: 10, height: 10, borderRadius: 5 },
  chipText: { fontSize: 14, fontWeight: '600' },
  section: { fontSize: 19, fontWeight: '700', marginTop: 4, marginBottom: 12 },
  card: { borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', marginBottom: 14 },
  art: { height: 130 },
  cardRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  cardMeta: { fontSize: 13, marginTop: 3 },
  add: { color: '#FFFFFF', fontWeight: '700', fontSize: 14, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 16, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth },
  rowText: { fontSize: 16, fontWeight: '500' },
  qty: { width: 30, height: 30, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 14, fontWeight: '700' },
  stats: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  stat: { flex: 1, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 14 },
  statValue: { fontSize: 22, fontWeight: '800' },
});

function Fade({ active, children }: { active: boolean; children: ReactNode }) {
  const style = useAnimatedStyle(() => ({ opacity: withTiming(active ? 1 : 0, { duration: 220 }) }), [active]);
  return (
    <Animated.View pointerEvents={active ? 'auto' : 'none'} style={[StyleSheet.absoluteFill, style]}>
      {children}
    </Animated.View>
  );
}

/** The demo with a safe-area provider of its own, so it runs anywhere (UpFork's preview gives it none). */
export default function Food({ scheme }: { scheme?: Scheme }) {
  return (
    <SafeAreaProvider>
      <FoodScreen scheme={scheme} />
    </SafeAreaProvider>
  );
}
