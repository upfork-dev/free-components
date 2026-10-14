import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect, Text as SvgText } from 'react-native-svg';

import { Toaster, UploadIcon, WifiOffIcon, toast } from '../components/toast-stack';
import type { Scheme } from '../lib/use-scheme';

type FileItem = { id: string; name: string; kind: 'PDF' | 'JPG' | 'FIG' | 'ZIP' | 'MP4'; size: string; when: string };

const START: FileItem[] = [
  { id: 'brief', name: 'Spring campaign brief.pdf', kind: 'PDF', size: '2.4 MB', when: 'Today' },
  { id: 'cover', name: 'Cover, final crop.jpg', kind: 'JPG', size: '6.1 MB', when: 'Today' },
  { id: 'deck', name: 'Pitch deck v12.fig', kind: 'FIG', size: '18.7 MB', when: 'Yesterday' },
  { id: 'teaser', name: 'Teaser cut 02.mp4', kind: 'MP4', size: '84.0 MB', when: 'Mon' },
];
const NEW_FILES: FileItem[] = [
  { id: 'p1', name: 'Proof 01, market.jpg', kind: 'JPG', size: '4.8 MB', when: 'Just now' },
  { id: 'p2', name: 'Proof 02, harbour.jpg', kind: 'JPG', size: '5.2 MB', when: 'Just now' },
  { id: 'p3', name: 'Proof notes.pdf', kind: 'PDF', size: '0.3 MB', when: 'Just now' },
];
const KIND_TINT = { PDF: '#E5484D', JPG: '#2F9E6A', FIG: '#7C5CFA', ZIP: '#C98A16', MP4: '#3B82F6' } as const;

const COLORS = {
  light: { page: '#F5F5F2', card: '#FFFFFF', ink: '#16161C', muted: '#6C6C76', line: 'rgba(22, 22, 28, 0.07)', track: 'rgba(22, 22, 28, 0.08)', primary: '#16161C', onPrimary: '#FFFFFF', secondary: 'rgba(22, 22, 28, 0.06)', meter: '#3B82F6' },
  dark: { page: '#0C0C10', card: '#16161C', ink: '#F2F2F6', muted: '#8E8E9A', line: 'rgba(242, 242, 246, 0.07)', track: 'rgba(242, 242, 246, 0.1)', primary: '#F2F2F6', onPrimary: '#0C0C10', secondary: 'rgba(242, 242, 246, 0.08)', meter: '#6AA2FF' },
} as const;

// SVG text falls back to a serif on the web: name a sans-serif.
const SVG_FONT = Platform.OS === 'web' ? 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' : undefined;
const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;

/** A files screen: an upload whose toast counts up, one that fails with Retry, and going offline and back. */
function UploadScreen({ scheme = 'light' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const insets = useSafeAreaInsets();
  const [files, setFiles] = useState(START);
  const [online, setOnline] = useState(true);
  const timers = useRef<ReturnType<typeof setInterval>[]>([]);

  useEffect(() => {
    toast.clear();
    return () => {
      timers.current.forEach(clearInterval);
      toast.clear();
    };
  }, []);

  /** Counts a progress toast up to `stopAt`, then calls `done`. */
  const run = (id: string, label: (pct: number) => string, stopAt: number, done: () => void) => {
    let pct = 12;
    toast.update(id, { description: label(pct), progress: pct / 100 });
    const timer = setInterval(() => {
      pct = Math.min(stopAt, pct + 7 + Math.round(Math.random() * 9));
      toast.update(id, { description: label(pct), progress: pct / 100 });
      if (pct >= stopAt) {
        clearInterval(timer);
        setTimeout(done, 260);
      }
    }, 260);
    timers.current.push(timer);
  };

  const uploadThree = () => {
    const id = toast.loading('Uploading 3 files', { icon: <UploadIcon color={c.ink} />, progress: 0 });
    run(
      id,
      (pct) => `${pct}% · ${pct < 40 ? 1 : pct < 75 ? 2 : 3} of 3`,
      100,
      () => {
        setFiles((list) => [...NEW_FILES.filter((f) => !list.some((x) => x.id === f.id)), ...list]);
        toast.update(id, { type: 'success', title: '3 files uploaded', description: 'Saved to Campaign / Proofs', progress: undefined, icon: undefined, duration: 4000 });
      },
    );
  };

  const uploadLarge = () => {
    const id = toast.loading('Uploading site-backup.zip', { icon: <UploadIcon color={c.ink} />, progress: 0 });
    run(
      id,
      (pct) => `${pct}% of 412 MB`,
      46,
      () =>
        toast.update(id, {
          type: 'error',
          title: 'Upload failed',
          description: 'site-backup.zip · the connection was reset',
          progress: undefined,
          icon: undefined,
          duration: 8000,
          action: { label: 'Retry', onPress: uploadLarge },
        }),
    );
  };

  const toggleNetwork = () => {
    if (online) {
      toast.warning('You’re offline', {
        id: 'network',
        description: 'Uploads will resume when you’re back',
        icon: <WifiOffIcon color="#F59E0B" />,
        duration: Infinity,
      });
    } else {
      // The same id: the warning turns into the good news, in place.
      toast.success('Back online', { id: 'network', description: 'Uploads resumed', icon: undefined, duration: 3000 });
    }
    setOnline((value) => !value);
  };

  return (
    <View style={[styles.page, { backgroundColor: c.page }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: insets.bottom + 260 }}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.ink }]}>Files</Text>
          <View style={[styles.status, { backgroundColor: c.secondary }]}>
            <View style={[styles.statusDot, { backgroundColor: online ? '#2F9E6A' : '#F59E0B' }]} />
            <Text style={[styles.statusText, { color: c.ink }]}>{online ? 'Synced' : 'Offline'}</Text>
          </View>
        </View>
        <View style={[styles.meterCard, { backgroundColor: c.card, borderColor: c.line }]}>
          <View style={styles.meterRow}>
            <Text style={[styles.meterLabel, { color: c.ink }]}>12.4 GB of 20 GB</Text>
            <Text style={[styles.meterNote, { color: c.muted }]}>62%</Text>
          </View>
          <View style={[styles.meterTrack, { backgroundColor: c.track }]}>
            <View style={[styles.meterFill, { backgroundColor: c.meter }]} />
          </View>
        </View>
        <Text style={[styles.section, { color: c.muted }]}>Campaign</Text>
        <View style={[styles.list, { backgroundColor: c.card, borderColor: c.line }]}>
          {files.map((file, i) => (
            <Animated.View key={file.id} entering={FadeIn.duration(240)} layout={LinearTransition.duration(260)}>
              {i > 0 ? <View style={[styles.rule, { backgroundColor: c.line }]} /> : null}
              <View style={styles.row}>
                <FileTile kind={file.kind} />
                <View style={styles.fill}>
                  <Text numberOfLines={1} style={[styles.name, { color: c.ink }]}>
                    {file.name}
                  </Text>
                  <Text style={[styles.meta, { color: c.muted }]}>
                    {file.size} · {file.when}
                  </Text>
                </View>
              </View>
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: insets.bottom + 16, backgroundColor: c.page, borderColor: c.line }]}>
        <Pressable accessibilityRole="button" onPress={uploadThree} style={({ pressed }) => [styles.primary, { backgroundColor: c.primary, opacity: pressed ? 0.85 : 1 }, webPointer]}>
          <UploadIcon color={c.onPrimary} />
          <Text style={[styles.primaryText, { color: c.onPrimary }]}>Upload 3 files</Text>
        </Pressable>
        <View style={styles.secondaryRow}>
          <Pressable accessibilityRole="button" onPress={uploadLarge} style={({ pressed }) => [styles.secondary, { backgroundColor: c.secondary, opacity: pressed ? 0.8 : 1 }, webPointer]}>
            <Text style={[styles.secondaryText, { color: c.ink }]}>Upload a large file</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={toggleNetwork} style={({ pressed }) => [styles.secondary, { backgroundColor: c.secondary, opacity: pressed ? 0.8 : 1 }, webPointer]}>
            <Text style={[styles.secondaryText, { color: c.ink }]}>{online ? 'Go offline' : 'Go online'}</Text>
          </Pressable>
        </View>
      </View>

      <Toaster scheme={scheme} offset={150} showProgress />
    </View>
  );
}

function FileTile({ kind }: { kind: FileItem['kind'] }) {
  const tint = KIND_TINT[kind];
  return (
    <Svg width={38} height={44} viewBox="0 0 38 44">
      <Path d="M4 4a4 4 0 0 1 4-4h18l12 12v28a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V4Z" fill={tint} opacity={0.14} />
      <Path d="M26 0v8a4 4 0 0 0 4 4h8" fill={tint} opacity={0.3} />
      <Rect x={6} y={26} width={26} height={12} rx={3} fill={tint} />
      <SvgText x={19} y={35} fontSize={8} fontWeight="800" fill="#FFFFFF" textAnchor="middle" fontFamily={SVG_FONT}>
        {kind}
      </SvgText>
    </Svg>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, borderRadius: 15, paddingHorizontal: 12 },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusText: { fontSize: 13, fontWeight: '700' },
  meterCard: { marginHorizontal: 12, marginTop: 16, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 16 },
  meterRow: { flexDirection: 'row', justifyContent: 'space-between' },
  meterLabel: { fontSize: 15, fontWeight: '700' },
  meterNote: { fontSize: 13, fontWeight: '600' },
  meterTrack: { height: 6, borderRadius: 3, marginTop: 10, overflow: 'hidden' },
  meterFill: { width: '62%', height: 6, borderRadius: 3 },
  section: { fontSize: 13, fontWeight: '700', marginTop: 20, marginBottom: 8, marginHorizontal: 24 },
  list: { marginHorizontal: 12, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  rule: { height: StyleSheet.hairlineWidth, marginLeft: 66 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 11 },
  name: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 13, marginTop: 2 },
  actions: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  primary: { height: 52, borderRadius: 26, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 16, fontWeight: '700' },
  secondaryRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  secondary: { flex: 1, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 14, fontWeight: '700' },
});

/** The demo with a safe-area provider of its own, so it runs anywhere (UpFork's preview gives it none). */
export default function UploadDemo({ scheme }: { scheme?: Scheme }) {
  return (
    <SafeAreaProvider>
      <UploadScreen scheme={scheme} />
    </SafeAreaProvider>
  );
}
