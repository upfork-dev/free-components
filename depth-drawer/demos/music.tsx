import { useEffect, useId, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Drawer, DrawerFooter, DrawerHeader, DrawerItem, DrawerMenu, DrawerSection, MenuButton } from '../components/depth-drawer';
import { DownloadIcon, LibraryIcon, PlaylistIcon, RadioIcon } from '../lib/icons';
import type { Scheme } from '../lib/use-scheme';

const COLORS = {
  dark: { screen: '#101015', ink: '#F4F4F7', muted: '#9C9CA8', track: 'rgba(255, 255, 255, 0.14)', fill: '#F4F4F7', button: '#F4F4F7', buttonInk: '#101015' },
  light: { screen: '#FBFAF7', ink: '#141418', muted: '#686873', track: 'rgba(20, 20, 24, 0.12)', fill: '#141418', button: '#141418', buttonInk: '#FBFAF7' },
} as const;

// Invented albums; their covers are drawn here.
const ALBUMS = [
  { key: 'tide', title: 'Low Tide Hours', artist: 'Sora Vale', a: '#FF9A7A', b: '#6B3FA0', c: '#1E1B4B' },
  { key: 'glass', title: 'Glasshouse', artist: 'The Linden Choir', a: '#9EE6D5', b: '#2E7FA6', c: '#0E2A44' },
  { key: 'amber', title: 'Amber Static', artist: 'Kofi Rhee', a: '#FFD27A', b: '#E0663A', c: '#4A1E1E' },
];

const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;

function Cover({ album, size, id }: { album: (typeof ALBUMS)[number]; size: number; id: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={`${id}bg`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={album.b} />
          <Stop offset="1" stopColor={album.c} />
        </LinearGradient>
        <RadialGradient id={`${id}sun`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={album.a} stopOpacity={1} />
          <Stop offset="1" stopColor={album.a} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width={100} height={100} rx={size > 60 ? 6 : 14} fill={`url(#${id}bg)`} />
      <Circle cx={62} cy={42} r={34} fill={`url(#${id}sun)`} opacity={0.85} />
      <Circle cx={62} cy={42} r={14} fill={album.a} />
      <Path d="M0 74c14-6 26-6 40 0s28 6 42 0 18-4 18-4V100H0Z" fill={album.c} opacity={0.75} />
      <Path d="M0 84c16-5 30-5 46 0s30 5 54-2V100H0Z" fill={album.c} />
    </Svg>
  );
}

const AlbumGlyph = (album: (typeof ALBUMS)[number], id: string) =>
  function Glyph({ size }: { color: string; size: number }) {
    return <Cover album={album} size={size} id={id} />;
  };

/** A player whose screen swings away like a door (a 3D turn with depth shading) to show the library. */
function MusicScreen({ scheme: initial = 'dark' }: { scheme?: Scheme }) {
  const [scheme, setScheme] = useState<Scheme>(initial);
  useEffect(() => setScheme(initial), [initial]);
  const [active, setActive] = useState('library');
  const c = COLORS[scheme];
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glyphs = useMemo(() => ALBUMS.map((a, i) => AlbumGlyph(a, `${uid}g${i}`)), [uid]);

  const menu = () => (
    <DrawerMenu>
      <DrawerHeader
        order={0}
        name="Driftwave"
        detail="Family plan"
        avatar={
          <Svg width={44} height={44} viewBox="0 0 44 44">
            <Rect width={44} height={44} rx={12} fill={scheme === 'dark' ? '#23232B' : '#E9E6DF'} />
            <Path d="M10 25c4-8 8-8 12 0s8 8 12 0" stroke="#8B9CFF" strokeWidth={3} strokeLinecap="round" fill="none" />
            <Path d="M10 18c4-8 8-8 12 0s8 8 12 0" stroke={scheme === 'dark' ? '#F4F4F7' : '#141418'} strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.85} />
          </Svg>
        }
      />
      <DrawerSection title="Listen" order={1}>
        <DrawerItem order={2} label="Library" icon={LibraryIcon} active={active === 'library'} onPress={() => setActive('library')} />
        <DrawerItem order={3} label="Playlists" icon={PlaylistIcon} badge={3} active={active === 'playlists'} onPress={() => setActive('playlists')} />
        <DrawerItem order={4} label="Radio" icon={RadioIcon} active={active === 'radio'} onPress={() => setActive('radio')} />
        <DrawerItem order={5} label="Downloads" icon={DownloadIcon} active={active === 'downloads'} onPress={() => setActive('downloads')} />
      </DrawerSection>
      <DrawerSection title="Recently played" order={6}>
        {ALBUMS.map((a, i) => (
          <DrawerItem key={a.key} order={7 + i} label={a.title} icon={glyphs[i]} active={active === a.key} onPress={() => setActive(a.key)} />
        ))}
      </DrawerSection>
      <DrawerFooter order={10} scheme={scheme} onSchemeChange={setScheme} />
    </DrawerMenu>
  );

  return (
    <Drawer renderMenu={menu} variant="swing" scheme={scheme} screenBackground={c.screen} statusBarStyle={{ open: scheme === 'dark' ? 'light' : 'dark', closed: scheme === 'dark' ? 'light' : 'dark' }}>
      <Player scheme={scheme} uid={uid} />
    </Drawer>
  );
}

function Player({ scheme, uid }: { scheme: Scheme; uid: string }) {
  const c = COLORS[scheme];
  const insets = useSafeAreaInsets();
  const [playing, setPlaying] = useState(true);
  const album = ALBUMS[0];
  return (
    <View style={[styles.screen, { backgroundColor: c.screen, paddingTop: insets.top + 6, paddingBottom: insets.bottom + 18 }]}>
      <View style={styles.bar}>
        <MenuButton color={c.ink} />
        <View style={styles.barTitles}>
          <Text style={[styles.barKicker, { color: c.muted }]}>PLAYING FROM</Text>
          <Text style={[styles.barTitle, { color: c.ink }]}>Evening drive</Text>
        </View>
        <View style={styles.round}>
          <Svg width={22} height={22} viewBox="0 0 24 24">
            <Circle cx={6} cy={12} r={1.6} fill={c.ink} />
            <Circle cx={12} cy={12} r={1.6} fill={c.ink} />
            <Circle cx={18} cy={12} r={1.6} fill={c.ink} />
          </Svg>
        </View>
      </View>
      <View style={styles.artWrap}>
        <View style={[styles.art, { shadowColor: '#000' }]}>
          <Cover album={album} size={300} id={`${uid}big`} />
        </View>
      </View>
      <View style={styles.meta}>
        <Text style={[styles.song, { color: c.ink }]}>Low Tide Hours</Text>
        <Text style={[styles.artist, { color: c.muted }]}>Sora Vale · Salt Hymns</Text>
      </View>
      <View style={styles.progress}>
        <View style={[styles.track, { backgroundColor: c.track }]}>
          <View style={[styles.trackFill, { backgroundColor: c.fill }]} />
        </View>
        <View style={styles.times}>
          <Text style={[styles.time, { color: c.muted }]}>1:42</Text>
          <Text style={[styles.time, { color: c.muted }]}>−2:16</Text>
        </View>
      </View>
      <View style={styles.controls}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous" style={[styles.ctrl, webPointer]}>
          <Svg width={30} height={30} viewBox="0 0 24 24">
            <Path d="M7 6v12M18 6.5v11L9.5 12 18 6.5Z" stroke={c.ink} strokeWidth={1.9} strokeLinejoin="round" strokeLinecap="round" fill={c.ink} />
          </Svg>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={playing ? 'Pause' : 'Play'}
          onPress={() => setPlaying((p) => !p)}
          style={[styles.play, { backgroundColor: c.button }, webPointer]}
        >
          <Svg width={30} height={30} viewBox="0 0 24 24">
            {playing ? (
              <Path d="M8.5 6v12M15.5 6v12" stroke={c.buttonInk} strokeWidth={3} strokeLinecap="round" />
            ) : (
              <Path d="M8 5.5v13L18.5 12 8 5.5Z" fill={c.buttonInk} />
            )}
          </Svg>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Next" style={[styles.ctrl, webPointer]}>
          <Svg width={30} height={30} viewBox="0 0 24 24">
            <Path d="M17 6v12M6 6.5v11l8.5-5.5L6 6.5Z" stroke={c.ink} strokeWidth={1.9} strokeLinejoin="round" strokeLinecap="round" fill={c.ink} />
          </Svg>
        </Pressable>
      </View>
      <Text style={[styles.lyric, { color: c.muted }]}>“the harbour lights come on one by one”</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  barTitles: { flex: 1, alignItems: 'center' },
  barKicker: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  barTitle: { fontSize: 15, fontWeight: '700', marginTop: 1 },
  round: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  artWrap: { alignItems: 'center', marginTop: 26 },
  art: { borderRadius: 18, overflow: 'hidden', shadowOffset: { width: 0, height: 24 }, shadowRadius: 40, shadowOpacity: 0.35, elevation: 16 },
  meta: { paddingHorizontal: 30, marginTop: 30 },
  song: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  artist: { fontSize: 15, marginTop: 4 },
  progress: { paddingHorizontal: 30, marginTop: 22 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  trackFill: { width: '43%', height: 4, borderRadius: 2 },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  time: { fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 34, marginTop: 18 },
  ctrl: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  play: { width: 74, height: 74, borderRadius: 37, alignItems: 'center', justifyContent: 'center' },
  lyric: { textAlign: 'center', fontSize: 14, fontStyle: 'italic', marginTop: 'auto' },
});

/** The demo with a safe-area provider of its own, so it runs anywhere (UpFork's preview gives it none). */
export default function MusicDemo({ scheme }: { scheme?: Scheme }) {
  return (
    <SafeAreaProvider>
      <MusicScreen scheme={scheme} />
    </SafeAreaProvider>
  );
}
