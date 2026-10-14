import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { Drawer, DrawerFooter, DrawerItem, DrawerMenu, DrawerSection, MenuButton, useEntrance } from '../components/depth-drawer';
import { FolderIcon, NoteIcon, StarIcon, TagDot, TrashIcon } from '../lib/icons';
import type { Scheme } from '../lib/use-scheme';

const COLORS = {
  light: { screen: '#FBFAF6', ink: '#17171C', muted: '#6B6B75', card: '#FFFFFF', line: 'rgba(23, 23, 28, 0.07)', search: '#F0EEE8' },
  dark: { screen: '#111115', ink: '#F2F2F5', muted: '#9595A0', card: '#1A1A20', line: 'rgba(255, 255, 255, 0.07)', search: '#1C1C22' },
} as const;

const TAGS = [
  { key: 'ideas', label: 'ideas', color: '#E8A33D' },
  { key: 'reading', label: 'reading', color: '#5B8DEF' },
  { key: 'errands', label: 'errands', color: '#3FA37A' },
];

const NOTES = [
  { title: 'Ferry times', body: 'First boat 7:40, last back 19:15. Bikes go free before nine.', when: '9:41', tag: 2 },
  { title: 'Kitchen shelf', body: 'Oak, 90 cm, two brackets. Ask Theo about the wall anchors.', when: 'Yesterday', tag: 0 },
  { title: 'The Salt Road', body: 'Chapter 4: the map in the lighthouse is drawn upside down.', when: 'Mon', tag: 1 },
  { title: 'Birthday list', body: 'Ceramic cup from the river studio, a film camera strap.', when: 'Sun', tag: 0 },
  { title: 'Groceries', body: 'Lemons, oat milk, rye, capers, two kinds of beans.', when: 'Sat', tag: 2 },
  { title: 'Sketch: garden', body: 'Herbs by the door, the fig against the warm wall.', when: '12 Oct', tag: 0 },
];

const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;

/** A notes app whose menu floats over the list as a card, the screen dimmed under it. */
function NotesScreen({ scheme: initial = 'light' }: { scheme?: Scheme }) {
  const [scheme, setScheme] = useState<Scheme>(initial);
  useEffect(() => setScheme(initial), [initial]);
  const [folder, setFolder] = useState('all');

  const menu = () => (
    <DrawerMenu>
      <MenuTitle scheme={scheme} />
      <DrawerSection title="Folders" order={1}>
        <DrawerItem order={2} label="All notes" icon={NoteIcon} badge={24} active={folder === 'all'} onPress={() => setFolder('all')} />
        <DrawerItem order={3} label="Starred" icon={StarIcon} active={folder === 'starred'} onPress={() => setFolder('starred')} />
        <DrawerItem order={4} label="Home" icon={FolderIcon} active={folder === 'home'} onPress={() => setFolder('home')} />
        <DrawerItem order={5} label="Work" icon={FolderIcon} active={folder === 'work'} onPress={() => setFolder('work')} />
        <DrawerItem order={6} label="Travel" icon={FolderIcon} active={folder === 'travel'} onPress={() => setFolder('travel')} />
      </DrawerSection>
      <DrawerSection title="Tags" order={7}>
        {TAGS.map((t, i) => (
          <DrawerItem
            key={t.key}
            order={8 + i}
            label={`#${t.label}`}
            icon={({ size }) => <TagDot color={t.color} size={size} />}
            active={folder === t.key}
            onPress={() => setFolder(t.key)}
          />
        ))}
      </DrawerSection>
      <DrawerFooter order={11} scheme={scheme} onSchemeChange={setScheme}>
        <DrawerItem order={11} label="Recently deleted" icon={TrashIcon} />
      </DrawerFooter>
    </DrawerMenu>
  );

  return (
    <Drawer renderMenu={menu} variant="float" menuWidth="80%" scheme={scheme} screenBackground={COLORS[scheme].screen}>
      <List scheme={scheme} />
    </Drawer>
  );
}

function MenuTitle({ scheme }: { scheme: Scheme }) {
  // The menu kit's entrance works on your own pieces of the menu too.
  const enter = useEntrance(0);
  const c = COLORS[scheme];
  return (
    <Animated.View style={[styles.menuTitleRow, enter]}>
      <Text style={[styles.menuTitle, { color: c.ink }]}>Notebook</Text>
      <Text style={[styles.menuCount, { color: c.muted }]}>24 notes · 3 tags</Text>
    </Animated.View>
  );
}

function List({ scheme }: { scheme: Scheme }) {
  const c = COLORS[scheme];
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { backgroundColor: c.screen }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 6, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        <View style={styles.bar}>
          <MenuButton color={c.ink} />
          <View style={styles.flex} />
          <Pressable accessibilityRole="button" accessibilityLabel="New note" style={[styles.round, webPointer]}>
            <Svg width={22} height={22} viewBox="0 0 24 24">
              <Path d="M12 5v14M5 12h14" stroke={c.ink} strokeWidth={2} strokeLinecap="round" />
            </Svg>
          </Pressable>
        </View>
        <Text style={[styles.title, { color: c.ink }]}>All notes</Text>
        <View style={[styles.search, { backgroundColor: c.search }]}>
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Circle cx={11} cy={11} r={6} stroke={c.muted} strokeWidth={1.9} fill="none" />
            <Path d="m15.5 15.5 4 4" stroke={c.muted} strokeWidth={1.9} strokeLinecap="round" />
          </Svg>
          <Text style={[styles.searchText, { color: c.muted }]}>Search</Text>
        </View>
        {NOTES.map((n) => (
          <View key={n.title} style={[styles.note, { backgroundColor: c.card, borderColor: c.line }]}>
            <View style={styles.noteHead}>
              <Text style={[styles.noteTitle, { color: c.ink }]}>{n.title}</Text>
              <Text style={[styles.noteWhen, { color: c.muted }]}>{n.when}</Text>
            </View>
            <Text style={[styles.noteBody, { color: c.muted }]} numberOfLines={2}>
              {n.body}
            </Text>
            <View style={styles.noteTag}>
              <View style={[styles.dot, { backgroundColor: TAGS[n.tag].color }]} />
              <Text style={[styles.noteTagText, { color: c.muted }]}>#{TAGS[n.tag].label}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  bar: { height: 50, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  round: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.7, paddingHorizontal: 20, marginTop: 4 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, borderRadius: 12, marginHorizontal: 16, marginTop: 12, paddingHorizontal: 12 },
  searchText: { fontSize: 15 },
  note: { marginHorizontal: 16, marginTop: 10, borderRadius: 18, padding: 14, borderWidth: 1 },
  noteHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  noteTitle: { fontSize: 16, fontWeight: '700' },
  noteWhen: { fontSize: 12 },
  noteBody: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  noteTag: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  noteTagText: { fontSize: 12, fontWeight: '600' },
  menuTitleRow: { paddingHorizontal: 12, paddingBottom: 12 },
  menuTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  menuCount: { fontSize: 13, marginTop: 2 },
});

/** The demo with a safe-area provider of its own, so it runs anywhere (UpFork's preview gives it none). */
export default function NotesDemo({ scheme }: { scheme?: Scheme }) {
  return (
    <SafeAreaProvider>
      <NotesScreen scheme={scheme} />
    </SafeAreaProvider>
  );
}
