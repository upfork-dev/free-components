import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { FluidTabBar, TabIcons, type FluidTab } from '../components/fluid-tab-bar';
import type { Scheme } from '../lib/use-scheme';

const COLORS = {
  light: { page: '#F4F4F2', card: '#FFFFFF', text: '#0C0D10', muted: '#6E7179', line: 'rgba(12,13,16,0.07)', soft: '#E9EAEE' },
  dark: { page: '#0A0A0C', card: '#141518', text: '#F2F3F5', muted: '#8E929A', line: 'rgba(255,255,255,0.07)', soft: '#1E1F24' },
} as const;

const PEOPLE = [
  { name: 'Mira Okafor', handle: '@mira', hue: '#F59E0B', text: 'Sunrise run done. 8 km, new best on the hill.' },
  { name: 'Theo Lindqvist', handle: '@theo', hue: '#6366F1', text: 'Shipped the new onboarding today. Small steps, big smiles.' },
  { name: 'Ana Ruiz', handle: '@anaruiz', hue: '#10B981', text: 'Anyone up for the climbing gym on Saturday morning?' },
];

/** A social app: five tabs and a liquid pill; Activity's badge clears once you've looked. */
export default function Social({ scheme = 'light' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const [tab, setTab] = useState('home');
  const [unread, setUnread] = useState(3);

  useEffect(() => {
    if (tab === 'activity') setUnread(0);
  }, [tab]);

  const tabs: FluidTab[] = [
    { key: 'home', label: 'Home', icon: TabIcons.Home },
    { key: 'search', label: 'Search', icon: TabIcons.Search },
    { key: 'activity', label: 'Activity', icon: TabIcons.Bell, badge: unread },
    { key: 'messages', label: 'Messages', icon: TabIcons.Chat, badge: tab === 'messages' ? 0 : true },
    { key: 'profile', label: 'Profile', icon: TabIcons.User },
  ];
  const title = tabs.find((t) => t.key === tab)?.label ?? '';

  return (
    <View style={[styles.page, { backgroundColor: c.page }]}>
      <Fade key={tab}>
        <Text style={[styles.title, { color: c.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>{subtitleFor(tab, unread)}</Text>
        <View style={styles.list}>
          {PEOPLE.map((person, i) => (
            <View key={person.handle} style={[styles.card, { backgroundColor: c.card, borderColor: c.line }]}>
              <View style={styles.cardHead}>
                <View style={[styles.avatar, { backgroundColor: person.hue }]}>
                  <Text style={styles.initials}>{person.name.split(' ').map((w) => w[0]).join('')}</Text>
                </View>
                <View style={styles.who}>
                  <Text style={[styles.name, { color: c.text }]}>{person.name}</Text>
                  <Text style={[styles.handle, { color: c.muted }]}>
                    {person.handle} · {i * 7 + 2}m
                  </Text>
                </View>
              </View>
              <Text style={[styles.body, { color: c.text }]}>{lineFor(tab, person.text, person.name)}</Text>
              {tab === 'home' && i === 0 ? <Strip hue={person.hue} soft={c.soft} /> : null}
            </View>
          ))}
        </View>
      </Fade>

      <View style={styles.dock}>
        <FluidTabBar scheme={scheme} tabs={tabs} value={tab} onChange={setTab} />
      </View>
    </View>
  );
}

function subtitleFor(tab: string, unread: number) {
  if (tab === 'activity') return unread > 0 ? `${unread} new` : 'All caught up';
  if (tab === 'messages') return '2 conversations';
  if (tab === 'search') return 'People and posts';
  if (tab === 'profile') return '@you · 128 following';
  return 'Following';
}

function lineFor(tab: string, text: string, name: string) {
  if (tab === 'activity') return `${name.split(' ')[0]} liked your post.`;
  if (tab === 'messages') return 'See you there!';
  if (tab === 'search') return `Suggested for you, followed by 4 people you know.`;
  if (tab === 'profile') return text;
  return text;
}

/** A run's elevation, drawn in bars: a picture without a picture. */
function Strip({ hue, soft }: { hue: string; soft: string }) {
  const bars = [14, 22, 30, 26, 38, 46, 40, 52, 44, 34, 28, 36, 24, 18];
  return (
    <View style={[styles.strip, { backgroundColor: soft }]}>
      {bars.map((h, i) => (
        <View key={i} style={[styles.bar, { height: h, backgroundColor: hue, opacity: 0.35 + (h / 52) * 0.65 }]} />
      ))}
    </View>
  );
}

/** Each tab's page fades and rises in. */
function Fade({ children }: { children: ReactNode }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });
  }, [t]);
  const style = useAnimatedStyle(() => ({ opacity: t.value, transform: [{ translateY: (1 - t.value) * 8 }] }));
  return (
    <Animated.View style={[styles.fade, style]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingTop: 64 },
  fade: { flex: 1 },
  // Room under the floating bar: the last card scrolls clear of it.
  scroll: { paddingHorizontal: 20, paddingBottom: 130 },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.6 },
  subtitle: { fontSize: 15, marginTop: 4 },
  list: { gap: 12, marginTop: 20 },
  card: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  who: { gap: 1 },
  name: { fontSize: 15, fontWeight: '600' },
  handle: { fontSize: 13 },
  body: { fontSize: 15, lineHeight: 21 },
  strip: { height: 70, borderRadius: 14, flexDirection: 'row', alignItems: 'flex-end', gap: 5, paddingHorizontal: 12, paddingBottom: 10 },
  bar: { flex: 1, borderRadius: 3 },
  dock: { position: 'absolute', left: 20, right: 20, bottom: 30 },
});
