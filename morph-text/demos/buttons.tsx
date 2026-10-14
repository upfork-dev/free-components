import { useEffect, useId, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { MorphButton, MorphNumber, MorphText, type MorphButtonState } from '../components/morph-text';
import { Avatar, BagIcon, BellIcon, ChevronLeft, MoreIcon, PlusIcon, SwapIcon, TokenMark, VaseArt } from '../lib/demo-icons';
import type { Scheme } from '../lib/use-scheme';

const COLORS = {
  light: {
    page: '#F4F3EF',
    card: '#FFFFFF',
    ink: '#111114',
    muted: '#6A6A73',
    faint: '#9A9AA3',
    line: 'rgba(17, 17, 20, 0.07)',
    well: '#F4F3EF',
    pill: '#111114',
    pillText: '#FFFFFF',
    badge: '#111114',
    badgeText: '#FFFFFF',
  },
  dark: {
    page: '#0B0B0E',
    card: '#16161B',
    ink: '#F4F4F6',
    muted: '#90909B',
    faint: '#6E6E79',
    line: 'rgba(255, 255, 255, 0.07)',
    well: '#0F0F13',
    pill: '#F4F4F6',
    pillText: '#0B0B0E',
    badge: '#F4F4F6',
    badgeText: '#0B0B0E',
  },
} as const;

const BALANCE = 1284.5;
const RATE = 2.6604; // NMB per KLP
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;

/** A potter's profile and shop: follow, subscribe, add to bag and a swap card, every label morphing. */
function ButtonsScreen({ scheme = 'light' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const dark = scheme === 'dark';
  const insets = useSafeAreaInsets();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');

  const [following, setFollowing] = useState(false);
  const [subscription, setSubscription] = useState<MorphButtonState>('success');
  const [bag, setBag] = useState(1);
  const [usingMax, setUsingMax] = useState(false);
  const pay = usingMax ? BALANCE : 250;

  const subscribe = () => {
    if (subscription === 'success') {
      setSubscription('idle');
      return;
    }
    setSubscription('loading');
    setTimeout(() => setSubscription('success'), 900);
  };

  return (
    <View style={[styles.page, { backgroundColor: c.page }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 6, paddingBottom: insets.bottom + 28 }} showsVerticalScrollIndicator={false}>
        <View style={styles.bar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" style={[styles.round, webPointer]} hitSlop={6}>
            <ChevronLeft color={c.ink} />
          </Pressable>
          <Text style={[styles.barTitle, { color: c.ink }]}>Profile</Text>
          <View style={styles.barEnd}>
            <View accessible accessibilityLabel={`Bag, ${bag} items`} style={styles.round}>
              <BagIcon color={c.ink} />
              <View style={[styles.badge, { backgroundColor: c.badge, borderColor: c.page }]}>
                <MorphNumber value={bag} style={[styles.badgeText, { color: c.badgeText }]} align="center" />
              </View>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="More" style={[styles.round, webPointer]} hitSlop={6}>
              <MoreIcon color={c.ink} />
            </Pressable>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: c.card }]}>
          <View style={styles.who}>
            <Avatar size={64} id={`${uid}a`} />
            <View style={styles.whoText}>
              <Text style={[styles.name, { color: c.ink }]}>Noa Kim</Text>
              <Text style={[styles.handle, { color: c.muted }]}>@noakim · Ceramics & light</Text>
            </View>
          </View>
          <Text style={[styles.bio, { color: c.muted }]}>
            Small-batch stoneware from a studio by the river. Glazes mixed by hand, fired twice.
          </Text>
          <View style={[styles.stats, { borderColor: c.line }]}>
            <View style={styles.stat}>
              <MorphNumber value={12480 + (following ? 1 : 0)} style={[styles.statValue, { color: c.ink }]} align="center" live />
              <Text style={[styles.statLabel, { color: c.muted }]}>Followers</Text>
            </View>
            <View style={[styles.statRule, { backgroundColor: c.line }]} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: c.ink }]}>312</Text>
              <Text style={[styles.statLabel, { color: c.muted }]}>Following</Text>
            </View>
            <View style={[styles.statRule, { backgroundColor: c.line }]} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: c.ink }]}>86</Text>
              <Text style={[styles.statLabel, { color: c.muted }]}>Pieces</Text>
            </View>
          </View>
          <View style={styles.actions}>
            <MorphButton
              label={following ? 'Following' : 'Follow'}
              variant="tinted"
              icon={following ? undefined : PlusIcon}
              onPress={() => setFollowing((f) => !f)}
              scheme={scheme}
            />
            <MorphButton
              label="Subscribe"
              successLabel="Subscribed"
              state={subscription}
              icon={BellIcon}
              onPress={subscribe}
              scheme={scheme}
            />
          </View>
        </View>

        <Text style={[styles.section, { color: c.faint }]}>FROM THE STUDIO</Text>
        <View style={[styles.card, styles.product, { backgroundColor: c.card }]}>
          <VaseArt size={64} id={`${uid}v`} dark={dark} />
          <View style={styles.productText}>
            <Text style={[styles.productName, { color: c.ink }]}>Dune vase</Text>
            <Text style={[styles.productMeta, { color: c.muted }]}>Stoneware · €68</Text>
          </View>
          <MorphButton
            label={bag > 1 ? `In bag (${bag})` : 'Add to bag'}
            successLabel="Added"
            size="sm"
            variant="solid"
            resetAfter={1100}
            onPress={async () => {
              await wait(900);
              setBag((n) => n + 1);
            }}
            scheme={scheme}
          />
        </View>

        <Text style={[styles.section, { color: c.faint }]}>SWAP</Text>
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <View style={[styles.leg, { backgroundColor: c.well }]}>
            <View style={styles.legTop}>
              <Text style={[styles.legLabel, { color: c.muted }]}>You pay</Text>
              <UseMax active={usingMax} onPress={() => setUsingMax((u) => !u)} scheme={scheme} />
            </View>
            <View style={styles.legRow}>
              <MorphNumber
                value={pay}
                format={{ minimumFractionDigits: 2, maximumFractionDigits: 2, locale: 'en-US' }}
                style={[styles.amount, { color: c.ink }]}
              />
              <Token id={`${uid}k`} name="KLP" from="#3FB7A0" to="#1F6F8B" shape="wave" scheme={scheme} />
            </View>
            <Text style={[styles.legNote, { color: c.faint }]}>Balance 1,284.50 KLP</Text>
          </View>
          <View style={[styles.swap, { backgroundColor: c.card, borderColor: c.card }]}>
            <View style={[styles.swapInner, { backgroundColor: c.well }]}>
              <SwapIcon color={c.ink} size={18} />
            </View>
          </View>
          <View style={[styles.leg, { backgroundColor: c.well, marginTop: 6 }]}>
            <Text style={[styles.legLabel, { color: c.muted }]}>You receive</Text>
            <View style={styles.legRow}>
              <MorphNumber
                value={Math.round(pay * RATE * 100) / 100}
                format={{ minimumFractionDigits: 2, maximumFractionDigits: 2, locale: 'en-US' }}
                style={[styles.amount, { color: c.ink }]}
              />
              <Token id={`${uid}n`} name="NMB" from="#B79CFF" to="#5B4BD6" shape="drop" scheme={scheme} />
            </View>
            <Text style={[styles.legNote, { color: c.faint }]}>1 KLP ≈ 2.6604 NMB</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/** The text pill from the idea this kit grew from: "Use max" ↔ "Using max", dimmed while on. */
function UseMax({ active, onPress, scheme }: { active: boolean; onPress: () => void; scheme: Scheme }) {
  const c = COLORS[scheme];
  const on = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    on.value = withTiming(active ? 1 : 0, { duration: 220 });
  }, [active, on]);
  const style = useAnimatedStyle(() => ({ opacity: 1 - 0.38 * on.value }));
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityState={{ checked: active }}
      accessibilityLabel="Use max"
      hitSlop={8}
      style={[styles.max, { backgroundColor: c.pill }, webPointer]}
    >
      <Animated.View style={style}>
        <MorphText text={active ? 'Using max' : 'Use max'} style={[styles.maxText, { color: c.pillText }]} />
      </Animated.View>
    </Pressable>
  );
}

function Token({ id, name, from, to, shape, scheme }: { id: string; name: string; from: string; to: string; shape: 'wave' | 'drop'; scheme: Scheme }) {
  const c = COLORS[scheme];
  return (
    <View style={[styles.token, { backgroundColor: c.card }]}>
      <TokenMark size={22} from={from} to={to} id={id} shape={shape} />
      <Text style={[styles.tokenName, { color: c.ink }]}>{name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  bar: { height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 6 },
  round: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  barTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', marginRight: -40 },
  barEnd: { flexDirection: 'row' },
  badge: {
    position: 'absolute',
    top: 3,
    right: 1,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, fontWeight: '800' },
  card: { marginHorizontal: 16, borderRadius: 24, padding: 18 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  whoText: { flex: 1 },
  name: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  handle: { fontSize: 14, marginTop: 2 },
  bio: { fontSize: 14, lineHeight: 20, marginTop: 14 },
  stats: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1 },
  stat: { flex: 1, alignItems: 'center' },
  statRule: { width: 1, height: 28 },
  statValue: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  statLabel: { fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginHorizontal: 22, marginTop: 22, marginBottom: 8 },
  product: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  productText: { flex: 1 },
  productName: { fontSize: 16, fontWeight: '700' },
  productMeta: { fontSize: 13, marginTop: 2 },
  leg: { borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14 },
  legTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  legLabel: { fontSize: 13, fontWeight: '600' },
  legRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  legNote: { fontSize: 12, marginTop: 6 },
  amount: { fontSize: 30, fontWeight: '700', letterSpacing: -0.8 },
  max: { height: 28, borderRadius: 14, paddingHorizontal: 12, justifyContent: 'center' },
  maxText: { fontSize: 13, fontWeight: '600' },
  token: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, borderRadius: 18, paddingLeft: 7, paddingRight: 12 },
  tokenName: { fontSize: 15, fontWeight: '700' },
  swap: {
    position: 'absolute',
    alignSelf: 'center',
    top: 18 + 106,
    left: '50%',
    marginLeft: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 5,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapInner: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});

/** The demo with a safe-area provider of its own, so it runs anywhere (UpFork's preview gives it none). */
export default function ButtonsDemo({ scheme }: { scheme?: Scheme }) {
  return (
    <SafeAreaProvider>
      <ButtonsScreen scheme={scheme} />
    </SafeAreaProvider>
  );
}
