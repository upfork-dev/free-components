import { useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { SwipeDeck, type SwipeDeckHandle } from '../components/swipe-deck';
import type { Scheme } from '../lib/use-scheme';

const COLORS = {
  light: { page: '#F3F2EF', text: '#0C0D10', muted: '#6E7179', button: '#FFFFFF', line: 'rgba(12,13,16,0.08)' },
  dark: { page: '#09090B', text: '#F2F3F5', muted: '#8E929A', button: '#17181C', line: 'rgba(255,255,255,0.08)' },
} as const;

type Art = 'waves' | 'orbs' | 'rings' | 'hills' | 'grid';

type Album = { id: string; title: string; artist: string; genre: string; length: string; art: Art; colors: [string, string, string] };

// Made-up records, with covers drawn in code.
const ALBUMS: Album[] = [
  { id: 'night-swim', title: 'Night Swim', artist: 'Luma Vale', genre: 'Dream pop', length: '38 min', art: 'waves', colors: ['#0B1E4A', '#1C7C8C', '#9EE6E0'] },
  { id: 'solenne', title: 'Solenne', artist: 'Aya Marchetti', genre: 'Neo-soul', length: '44 min', art: 'orbs', colors: ['#5A1A2E', '#E8774A', '#FFD38A'] },
  { id: 'static-hearts', title: 'Static Hearts', artist: 'VELA', genre: 'Synthwave', length: '41 min', art: 'grid', colors: ['#1A0B33', '#C2337A', '#FFB86B'] },
  { id: 'low-tide', title: 'Low Tide', artist: 'Harbor & Pine', genre: 'Folk', length: '35 min', art: 'hills', colors: ['#E9E2CF', '#7E9C7A', '#2F4A3A'] },
  { id: 'orbit-garden', title: 'Orbit Garden', artist: 'Mika Dorr', genre: 'Electronic', length: '52 min', art: 'rings', colors: ['#130F2B', '#6D4AFF', '#FF8AD8'] },
];

const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;

/** New music to swipe through: right saves an album, left skips it, up adds it to a playlist. */
export default function Music({ scheme = 'light' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const deck = useRef<SwipeDeckHandle>(null);
  const [saved, setSaved] = useState(0);
  const [round, setRound] = useState(0);

  return (
    <View style={[styles.page, { backgroundColor: c.page }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: c.text }]}>Discover</Text>
          <Text style={[styles.subtitle, { color: c.muted }]}>{saved > 0 ? `${saved} saved this week` : 'New releases for you'}</Text>
        </View>
        <Pressable
          onPress={() => deck.current?.undo()}
          accessibilityRole="button"
          accessibilityLabel="Undo"
          style={[styles.undo, { backgroundColor: c.button, borderColor: c.line }, webPointer]}>
          <UndoIcon color={c.text} />
        </Pressable>
      </View>

      <SwipeDeck
        key={round}
        ref={deck}
        scheme={scheme}
        style={styles.deck}
        data={ALBUMS}
        keyExtractor={(album) => album.id}
        directions={['left', 'right', 'up']}
        stamps={{
          right: { label: 'Save', color: '#16A34A' },
          left: { label: 'Skip', color: '#E5484D' },
          up: { label: 'Playlist', color: '#6D4AFF' },
        }}
        onSwipe={(_, direction) => {
          if (direction !== 'left') setSaved((n) => n + 1);
        }}
        onUndo={(_, direction) => {
          if (direction !== 'left') setSaved((n) => Math.max(0, n - 1));
        }}
        renderCard={(album) => <Cover album={album} />}
        renderEmpty={() => (
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: c.text }]}>That's this week's.</Text>
            <Text style={[styles.emptyText, { color: c.muted }]}>New releases land every Friday.</Text>
            <Pressable onPress={() => setRound((r) => r + 1)} style={[styles.again, { backgroundColor: c.text }, webPointer]}>
              <Text style={[styles.againText, { color: c.page }]}>Start over</Text>
            </Pressable>
          </View>
        )}
      />

      <View style={styles.actions}>
        <Action label="Skip" size={62} background={c.button} line={c.line} onPress={() => deck.current?.swipe('left')}>
          <CrossIcon color="#E5484D" />
        </Action>
        <Action label="Add to playlist" size={50} background={c.button} line={c.line} onPress={() => deck.current?.swipe('up')}>
          <StarIcon color="#6D4AFF" />
        </Action>
        <Action label="Save" size={62} background={c.button} line={c.line} onPress={() => deck.current?.swipe('right')}>
          <HeartIcon color="#16A34A" />
        </Action>
      </View>
    </View>
  );
}

function Action({
  label,
  size,
  background,
  line,
  onPress,
  children,
}: {
  label: string;
  size: number;
  background: string;
  line: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: background, borderColor: line },
        pressed && styles.pressed,
        webPointer,
      ]}>
      {children}
    </Pressable>
  );
}

/** A cover drawn from the album's three colors, in one of five styles, with its words over a shade. */
function Cover({ album }: { album: Album }) {
  const [a, b, c] = album.colors;
  const id = (part: string) => `${album.id}-${part}`;
  return (
    <View style={styles.cover}>
      <Svg width="100%" height="100%" viewBox="0 0 300 420" preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id('bg')} x1="0" y1="0" x2="0.4" y2="1">
            <Stop offset="0" stopColor={a} />
            <Stop offset="1" stopColor={b} />
          </LinearGradient>
          <RadialGradient id={id('glow')} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={c} stopOpacity={0.95} />
            <Stop offset="1" stopColor={c} stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id={id('shade')} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.5" stopColor="#000" stopOpacity={0} />
            <Stop offset="1" stopColor="#000" stopOpacity={0.62} />
          </LinearGradient>
        </Defs>
        <Rect width="300" height="420" fill={`url(#${id('bg')})`} />
        <ArtLayer art={album.art} colors={album.colors} glow={`url(#${id('glow')})`} />
        <Rect width="300" height="420" fill={`url(#${id('shade')})`} />
      </Svg>
      <View style={styles.words}>
        <Text style={styles.genre}>{album.genre.toUpperCase()}</Text>
        <Text style={styles.album}>{album.title}</Text>
        <Text style={styles.artist}>
          {album.artist} · {album.length}
        </Text>
      </View>
    </View>
  );
}

function ArtLayer({ art, colors, glow }: { art: Art; colors: [string, string, string]; glow: string }) {
  const [, b, c] = colors;
  if (art === 'waves')
    return (
      <G>
        <Circle cx="150" cy="150" r="120" fill={glow} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Path
            key={i}
            d={`M-20 ${190 + i * 26} C 60 ${160 + i * 26}, 120 ${230 + i * 26}, 200 ${196 + i * 26} S 290 ${170 + i * 26}, 330 ${200 + i * 26}`}
            stroke={c}
            strokeOpacity={0.75 - i * 0.1}
            strokeWidth={2.4}
            fill="none"
          />
        ))}
      </G>
    );
  if (art === 'orbs')
    return (
      <G>
        <Circle cx="110" cy="140" r="110" fill={glow} />
        <Circle cx="198" cy="210" r="70" fill={c} opacity={0.85} />
        <Circle cx="96" cy="250" r="38" fill={b} opacity={0.9} />
        <Circle cx="220" cy="96" r="18" fill="#FFFFFF" opacity={0.8} />
      </G>
    );
  if (art === 'rings')
    return (
      <G>
        <Circle cx="150" cy="170" r="140" fill={glow} opacity={0.6} />
        {[110, 86, 62, 38].map((r, i) => (
          <Circle key={r} cx="150" cy="170" r={r} stroke={i % 2 ? c : '#FFFFFF'} strokeOpacity={0.7} strokeWidth={1.6} fill="none" />
        ))}
        <Circle cx="236" cy="128" r="9" fill={c} />
        <Circle cx="92" cy="236" r="6" fill="#FFFFFF" />
      </G>
    );
  if (art === 'hills')
    return (
      <G>
        <Circle cx="196" cy="118" r="44" fill="#FFFFFF" opacity={0.85} />
        <Path d="M-10 250 Q 70 180 150 236 T 310 214 V 430 H -10 Z" fill={b} opacity={0.85} />
        <Path d="M-10 296 Q 90 236 180 290 T 310 270 V 430 H -10 Z" fill={c} />
      </G>
    );
  // grid: a sun over a floor of lines.
  return (
    <G>
      <Circle cx="150" cy="176" r="92" fill={c} opacity={0.95} />
      {[0, 1, 2, 3, 4].map((i) => (
        <Rect key={i} x="40" y={184 + i * 15} width="220" height={4 + i * 1.6} fill={colors[0]} />
      ))}
      {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((i) => (
        <Path key={i} d={`M150 262 L${150 + i * 70} 430`} stroke={b} strokeWidth={1.4} strokeOpacity={0.9} />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <Path key={`h${i}`} d={`M0 ${270 + i * i * 9 + i * 8} H300`} stroke={b} strokeWidth={1.4} strokeOpacity={0.9} />
      ))}
    </G>
  );
}

const icon = { width: 26, height: 26, viewBox: '0 0 24 24' };

function CrossIcon({ color }: { color: string }) {
  return (
    <Svg {...icon}>
      <Path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke={color} strokeWidth={2.6} strokeLinecap="round" />
    </Svg>
  );
}

function HeartIcon({ color }: { color: string }) {
  return (
    <Svg {...icon}>
      <Path d="M12 20s-7.8-4.6-7.8-10.3A4.4 4.4 0 0 1 12 7.1a4.4 4.4 0 0 1 7.8 2.6C19.8 15.4 12 20 12 20z" fill={color} />
    </Svg>
  );
}

function StarIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path d="m12 3.6 2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 16.5l-5.1 2.8L8 13.6l-4.3-4 5.8-.7z" fill={color} />
    </Svg>
  );
}

function UndoIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M9 7 4.5 11.5 9 16M5 11.5h9.5a5 5 0 0 1 0 10H12" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingTop: 64, paddingBottom: 30 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.6 },
  subtitle: { fontSize: 15, marginTop: 4 },
  undo: { width: 44, height: 44, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  deck: { marginHorizontal: 20, marginTop: 22, marginBottom: 26 },
  cover: { flex: 1 },
  words: { position: 'absolute', left: 22, right: 22, bottom: 22, gap: 3 },
  genre: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '700', letterSpacing: 1.6 },
  album: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', letterSpacing: -0.6 },
  artist: { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: '500' },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22 },
  action: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  pressed: { transform: [{ scale: 0.92 }] },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 22, fontWeight: '700' },
  emptyText: { fontSize: 15 },
  again: { marginTop: 14, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 999 },
  againText: { fontSize: 15, fontWeight: '600' },
});
