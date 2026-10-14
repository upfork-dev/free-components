import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { GooeyIcons, GooeyTabBar, type GooeyIcon, type GooeyTab } from '../components/gooey-tab-bar';
import type { Scheme } from '../lib/use-scheme';

const COLORS = {
  light: { page: '#F5F6FA', card: '#FFFFFF', ink: '#14151C', muted: '#7C8090', line: 'rgba(20, 21, 28, 0.07)', accent: '#3D7BFF' },
  dark: { page: '#0B0C10', card: '#15161C', ink: '#F1F2F6', muted: '#8A8E9C', line: 'rgba(241, 242, 246, 0.07)', accent: '#5C8EFF' },
} as const;

const CallsIcon: GooeyIcon = ({ color, size, focused }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M7.2 4.5 9.4 4a1 1 0 0 1 1.1.6l1.1 2.8a1 1 0 0 1-.3 1.1L9.8 9.7a10.5 10.5 0 0 0 4.5 4.5l1.2-1.5a1 1 0 0 1 1.1-.3l2.8 1.1a1 1 0 0 1 .6 1.1l-.5 2.2a1.6 1.6 0 0 1-1.6 1.2C10.6 18 6 13.4 6 6.1a1.6 1.6 0 0 1 1.2-1.6Z"
      stroke={color}
      strokeWidth={1.75}
      strokeLinejoin="round"
      fill={focused ? color : 'none'}
    />
  </Svg>
);
const StoriesIcon: GooeyIcon = ({ color, size, focused }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={8.2} stroke={color} strokeWidth={1.75} strokeDasharray="4.2 2.6" strokeLinecap="round" />
    <Circle cx={12} cy={12} r={focused ? 4.6 : 4} fill={focused ? color : 'none'} stroke={color} strokeWidth={1.75} />
  </Svg>
);

const PEOPLE = [
  ['Ava Lindqvist', 'Sounds perfect, see you at 7', '9:41', 2, '#FF8A65'],
  ['Design crew', 'Mai: new mockups are up', '9:12', 5, '#7C6CFF'],
  ['Jonas Weber', 'Voice message · 0:24', '8:30', 0, '#26C6A6'],
  ['Mom', 'Did you get home ok?', 'Yesterday', 1, '#F5B83D'],
  ['Theo Park', 'Ha, that was brilliant', 'Yesterday', 0, '#4FA3FF'],
  ['Running club', 'Sunday 8:00 at the bridge', 'Mon', 4, '#E86AA8'],
  ['Lena Moreau', 'Sent a photo', 'Mon', 0, '#9AA4B8'],
] as const;

/** A messenger with four tabs and no labels: the bar at its simplest. */
function MessagesScreen({ scheme = 'light' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(0);
  const tabs: GooeyTab[] = [
    { key: 'chats', label: 'Chats', icon: GooeyIcons.chat, badge: 12 },
    { key: 'calls', label: 'Calls', icon: CallsIcon },
    { key: 'stories', label: 'Stories', icon: StoriesIcon, badge: 'dot' },
    { key: 'settings', label: 'Settings', icon: GooeyIcons.settings },
  ];
  return (
    <View style={[styles.page, { backgroundColor: c.page }]}>
      <ScrollView contentContainerStyle={[styles.screen, { paddingTop: insets.top + 18, paddingBottom: 150 }]}>
        <Text style={[styles.title, { color: c.ink }]}>{tabs[tab].label}</Text>
        {PEOPLE.map(([name, last, time, unread, tint]) => (
          <View key={name} style={[styles.row, { borderColor: c.line }]}>
            <View style={[styles.avatar, { backgroundColor: tint }]}>
              <Text style={styles.initials}>{name.split(' ').map((w) => w[0]).join('').slice(0, 2)}</Text>
            </View>
            <View style={styles.fill}>
              <Text style={[styles.name, { color: c.ink }]}>{name}</Text>
              <Text numberOfLines={1} style={[styles.last, { color: c.muted }]}>
                {last}
              </Text>
            </View>
            <View style={styles.right}>
              <Text style={[styles.time, { color: unread ? c.accent : c.muted }]}>{time}</Text>
              {unread ? (
                <View style={[styles.unread, { backgroundColor: c.accent }]}>
                  <Text style={styles.unreadText}>{unread}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ))}
      </ScrollView>
      <GooeyTabBar
        scheme={scheme}
        tabs={tabs}
        index={tab}
        onChange={setTab}
        showLabels={false}
        height={60}
        colors={{ bubble: c.accent, bar: c.card }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  fill: { flex: 1 },
  screen: { paddingHorizontal: 20 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  name: { fontSize: 16, fontWeight: '700' },
  last: { fontSize: 14, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 6 },
  time: { fontSize: 12, fontWeight: '600' },
  unread: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  unreadText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
});

/** The demo with a safe-area provider of its own, so it runs anywhere (UpFork's preview gives it none). */
export default function Messages({ scheme }: { scheme?: Scheme }) {
  return (
    <SafeAreaProvider>
      <MessagesScreen scheme={scheme} />
    </SafeAreaProvider>
  );
}
