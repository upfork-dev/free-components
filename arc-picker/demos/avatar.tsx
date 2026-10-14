import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { ArcPicker } from '../components/arc-picker';
import { FACES, Face } from '../lib/faces';
import { hexToLab, mixLabs } from '../lib/oklab';
import type { Scheme } from '../lib/use-scheme';

const SWATCHES = [
  { key: 'sky', name: 'Sky', hex: '#8EC5FF' },
  { key: 'mint', name: 'Mint', hex: '#8FE3C0' },
  { key: 'butter', name: 'Butter', hex: '#FFE08A' },
  { key: 'peach', name: 'Peach', hex: '#FFBE9C' },
  { key: 'coral', name: 'Coral', hex: '#FF9A8E' },
  { key: 'lilac', name: 'Lilac', hex: '#C8B5FF' },
  { key: 'sage', name: 'Sage', hex: '#B6D3A6' },
  { key: 'slate', name: 'Slate', hex: '#A8B5CC' },
];
const LABS = SWATCHES.map((s) => hexToLab(s.hex));

const COLORS = {
  light: { page: '#F7F5F1', ink: '#17161D', muted: '#6F6C78', field: '#FFFFFF', line: 'rgba(23, 22, 29, 0.09)', tile: '#ECE9E3', button: '#17161D', onButton: '#FFFFFF', track: 'rgba(23, 22, 29, 0.08)' },
  dark: { page: '#0D0D11', ink: '#F3F2F7', muted: '#8F8C99', field: '#18181E', line: 'rgba(243, 242, 247, 0.08)', tile: '#24242C', button: '#F3F2F7', onButton: '#0D0D11', track: 'rgba(243, 242, 247, 0.1)' },
} as const;

const AVATAR = 196;
const SWATCH = 34;
const SWATCH_RADIUS = 140;
const SWATCH_SPAN = 120;
const FACE_ITEM = 58;
const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;

/** Profile setup: a dial of faces and, curving under the avatar, a dial of backgrounds. Both blend live. */
function AvatarScreen({ scheme = 'light' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [name, setName] = useState('Ava');
  const face = useSharedValue(0);
  const tint = useSharedValue(1);

  const backdrop = useAnimatedStyle(() => ({ backgroundColor: mixLabs(LABS, tint.value, true) }));

  // The background dial curves round the avatar's lower edge: its ring sits on a circle about the avatar's centre.
  const avatarTop = insets.top + 118;
  const avatarCenter = avatarTop + AVATAR / 2;
  const swatchAbove = SWATCH_RADIUS * (1 - Math.cos((SWATCH_SPAN * Math.PI) / 360)) + SWATCH / 2;
  const swatchApex = 16 + swatchAbove;
  const swatchTop = avatarCenter + SWATCH_RADIUS - swatchApex;
  const facesTop = avatarCenter + SWATCH_RADIUS + 64;

  return (
    <View style={[styles.page, { backgroundColor: c.page }]}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.progressRow}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.progress, { backgroundColor: i <= 1 ? c.ink : c.track }]} />
          ))}
        </View>
        <Text style={[styles.title, { color: c.ink }]}>Make it you</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>Turn the dials to pick a face and a backdrop.</Text>
      </View>

      <View style={[styles.avatarWrap, { top: avatarTop, left: width / 2 - AVATAR / 2 }]}>
        <Animated.View style={[styles.avatar, backdrop]}>
          {FACES.map((look, i) => (
            <FaceLayer key={look.key} at={i} face={face}>
              <Face look={look} size={AVATAR} />
            </FaceLayer>
          ))}
          {/* Face one again, above the last, so the loop from the last back to the first cross-fades too. */}
          <FaceLayer at={FACES.length} face={face}>
            <Face look={FACES[0]} size={AVATAR} />
          </FaceLayer>
        </Animated.View>
      </View>

      <View style={[styles.dial, { top: swatchTop }]}>
        <ArcPicker
          data={SWATCHES}
          keyExtractor={(s) => s.key}
          accessibilityLabel="Backdrop"
          accessibilityLabelForItem={(s) => s.name}
          defaultIndex={1}
          loop
          progress={tint}
          position="top"
          radius={SWATCH_RADIUS}
          span={SWATCH_SPAN}
          itemSize={SWATCH}
          spacing={12}
          scheme={scheme}
          renderItem={({ item }) => <View style={[styles.fill, { backgroundColor: item.hex }]} />}
        />
      </View>

      <View style={[styles.dial, { top: facesTop }]}>
        <ArcPicker
          data={FACES}
          keyExtractor={(f) => f.key}
          getLabel={(f) => f.name}
          accessibilityLabel="Face"
          accessibilityLabelForItem={(f) => f.name}
          loop
          progress={face}
          itemSize={FACE_ITEM}
          spacing={12}
          scheme={scheme}
          renderItem={({ item }) => (
            <View style={[styles.fill, styles.tile, { backgroundColor: c.tile }]}>
              <Face look={item} size={FACE_ITEM} />
            </View>
          )}
        />
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 18 }]}>
        <View style={[styles.field, { backgroundColor: c.field, borderColor: c.line }]}>
          <Text style={[styles.fieldLabel, { color: c.muted }]}>Display name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            maxLength={24}
            accessibilityLabel="Display name"
            style={[styles.input, { color: c.ink }]}
          />
        </View>
        <View style={styles.helperRow}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path d="m5 12.5 4.2 4.2L19 7" stroke={c.muted} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <Text style={[styles.helper, { color: c.muted }]}>
            {name.trim() ? `Looking good, ${name.trim()}` : 'Add the name people will see'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, { backgroundColor: c.button, opacity: pressed ? 0.85 : 1 }, webPointer]}>
          <Text style={[styles.buttonText, { color: c.onButton }]}>Continue</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** One face in the stack: the face the dial is leaving stays opaque, the one it's reaching fades in over it. */
function FaceLayer({ at, face, children }: { at: number; face: SharedValue<number>; children: React.ReactNode }) {
  const n = FACES.length;
  const style = useAnimatedStyle(() => {
    const wrapped = ((face.value % n) + n) % n;
    const base = Math.floor(wrapped);
    const t = wrapped - base;
    return { opacity: at === base ? 1 : at === base + 1 ? t : 0 };
  });
  return <Animated.View style={[StyleSheet.absoluteFill, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  fill: { flex: 1 },
  header: { paddingHorizontal: 24 },
  progressRow: { flexDirection: 'row', gap: 6 },
  progress: { flex: 1, height: 4, borderRadius: 2 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8, marginTop: 18 },
  subtitle: { fontSize: 15, marginTop: 4 },
  avatarWrap: { position: 'absolute', width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2, boxShadow: '0px 18px 40px rgba(20, 20, 30, 0.18)' },
  avatar: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2, overflow: 'hidden' },
  dial: { position: 'absolute', left: 0, right: 0 },
  tile: { alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 0 },
  field: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 },
  fieldLabel: { fontSize: 12, fontWeight: '600' },
  input: { fontSize: 17, fontWeight: '600', paddingVertical: 4, outlineStyle: 'none' } as never,
  helperRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, marginLeft: 4 },
  helper: { fontSize: 13, fontWeight: '500' },
  button: { height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  buttonText: { fontSize: 16, fontWeight: '700' },
});

/** The demo with a safe-area provider of its own, so it runs anywhere (UpFork's preview gives it none). */
export default function Avatar({ scheme }: { scheme?: Scheme }) {
  return (
    <SafeAreaProvider>
      <AvatarScreen scheme={scheme} />
    </SafeAreaProvider>
  );
}
