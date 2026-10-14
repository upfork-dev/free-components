import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';

import { Toaster, UndoIcon, toast } from '../components/toast-stack';
import type { Scheme } from '../lib/use-scheme';

const COLORS = {
  light: { page: '#F5F5F2', card: '#FFFFFF', ink: '#16161C', muted: '#6C6C76', line: 'rgba(22, 22, 28, 0.08)', button: 'rgba(22, 22, 28, 0.06)', code: '#F0EFEA', codeInk: '#2C2C36', on: '#16161C', onText: '#FFFFFF', track: '#3B82F6' },
  dark: { page: '#0C0C10', card: '#16161C', ink: '#F2F2F6', muted: '#8E8E9A', line: 'rgba(242, 242, 246, 0.08)', button: 'rgba(242, 242, 246, 0.08)', code: '#111116', codeInk: '#D5D5DE', on: '#F2F2F6', onText: '#0C0C10', track: '#4F82F0' },
} as const;

// SVG text falls back to a serif on the web: name a sans-serif.
const SVG_FONT = Platform.OS === 'web' ? 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' : undefined;
const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;
const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' });

type Call = { label: string; code: string; run: () => void };

/** Every call, live, and the Toaster's options as switches: the documentation you can press. */
function PlaygroundScreen({ scheme = 'light' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const insets = useSafeAreaInsets();
  const [position, setPosition] = useState<'top' | 'bottom'>('bottom');
  const [rich, setRich] = useState(false);
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(true);
  const [last, setLast] = useState("toast.success('Changes saved')");

  useEffect(() => {
    toast.clear();
    toast.success('Changes saved', { description: 'Your profile is up to date' });
    return () => toast.clear();
  }, []);

  const calls: Call[] = [
    { label: 'Default', code: "toast('Link copied')", run: () => toast('Link copied') },
    { label: 'Success', code: "toast.success('Changes saved')", run: () => toast.success('Changes saved', { description: 'Your profile is up to date' }) },
    { label: 'Error', code: "toast.error('Payment declined')", run: () => toast.error('Payment declined', { description: 'Try another card or contact your bank' }) },
    { label: 'Warning', code: "toast.warning('Storage almost full')", run: () => toast.warning('Storage almost full', { description: '1.2 GB left of 20 GB' }) },
    { label: 'Info', code: "toast.info('New version available')", run: () => toast.info('New version available', { description: 'Restart to update' }) },
    {
      label: 'Loading',
      code: "toast.loading('Exporting…')",
      run: () => {
        const id = toast.loading('Exporting…');
        setTimeout(() => toast.dismiss(id), 2600);
      },
    },
    {
      label: 'Promise',
      code: "toast.promise(save(), { loading, success, error })",
      run: () =>
        toast.promise(new Promise((resolve, reject) => setTimeout(Math.random() > 0.3 ? resolve : reject, 1500)), {
          loading: 'Saving draft…',
          success: 'Draft saved',
          error: 'Couldn’t save the draft',
        }),
    },
    {
      label: 'Undo',
      code: "toast('Item deleted', { action: { label: 'Undo', … } })",
      run: () =>
        toast('Photo deleted', {
          icon: <UndoIcon color={c.ink} />,
          description: 'IMG_2041 · moved to Trash',
          action: { label: 'Undo', onPress: () => toast.success('Photo restored') },
        }),
    },
    {
      label: 'Important',
      code: "toast.error('Session expired', { important: true })",
      run: () => toast.error('Session expired', { important: true, description: 'Sign in again to keep going', duration: 6000 }),
    },
    {
      label: 'Custom',
      code: 'toast.custom((id) => <Reply id={id} />)',
      run: () => toast.custom((id) => <ReplyToast id={id} scheme={scheme} />, { duration: 6000 }),
    },
  ];

  return (
    <View style={[styles.page, { backgroundColor: c.page }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: insets.bottom + 220, paddingHorizontal: 16 }}>
        <Text style={[styles.title, { color: c.ink }]}>Playground</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>Press a call. Hover or tap the stack to open it.</Text>

        <View style={[styles.code, { backgroundColor: c.code, borderColor: c.line }]}>
          <Text numberOfLines={2} style={[styles.codeText, { color: c.codeInk, fontFamily: mono }]}>
            {last}
          </Text>
        </View>

        <Text style={[styles.section, { color: c.muted }]}>Calls</Text>
        <View style={styles.grid}>
          {calls.map((call) => (
            <Pressable
              key={call.label}
              accessibilityRole="button"
              onPress={() => {
                setLast(call.code);
                call.run();
              }}
              style={({ pressed }) => [styles.call, { backgroundColor: c.button, opacity: pressed ? 0.75 : 1 }, webPointer]}>
              <Text style={[styles.callText, { color: c.ink }]}>{call.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.section, { color: c.muted }]}>Toaster</Text>
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.line }]}>
          <View style={styles.option}>
            <Text style={[styles.optionText, { color: c.ink }]}>Position</Text>
            <View style={[styles.segment, { backgroundColor: c.button }]}>
              {(['top', 'bottom'] as const).map((p) => (
                <Pressable
                  key={p}
                  accessibilityRole="button"
                  accessibilityState={{ selected: position === p }}
                  onPress={() => setPosition(p)}
                  style={[styles.segmentItem, position === p ? { backgroundColor: c.on } : null, webPointer]}>
                  <Text style={[styles.segmentText, { color: position === p ? c.onText : c.ink }]}>{p === 'top' ? 'Top' : 'Bottom'}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Toggle label="Rich colours" value={rich} onChange={setRich} colors={c} />
          <Toggle label="Always open" value={open} onChange={setOpen} colors={c} />
          <Toggle label="Time left" value={progress} onChange={setProgress} colors={c} last />
        </View>
        <Pressable accessibilityRole="button" onPress={() => toast.dismiss()} style={[styles.dismiss, webPointer]}>
          <Text style={[styles.dismissText, { color: c.muted }]}>Dismiss all</Text>
        </Pressable>
      </ScrollView>

      <Toaster scheme={scheme} position={position} richColors={rich} expand={open} showProgress={progress} backdrop={open ? false : true} />
    </View>
  );
}

function Toggle({ label, value, onChange, colors, last }: { label: string; value: boolean; onChange: (v: boolean) => void; colors: (typeof COLORS)[Scheme]; last?: boolean }) {
  return (
    <View style={[styles.option, last ? null : { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line }]}>
      <Text style={[styles.optionText, { color: colors.ink }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.track, false: colors.button }}
        thumbColor="#FFFFFF"
        accessibilityLabel={label}
        {...({ activeThumbColor: '#FFFFFF' } as object)}
      />
    </View>
  );
}

/** A custom toast: someone replied, with a button to answer. */
function ReplyToast({ id, scheme }: { id: string; scheme: Scheme }) {
  const c = COLORS[scheme];
  return (
    <View style={styles.reply}>
      <Svg width={36} height={36} viewBox="0 0 36 36">
        <Circle cx={18} cy={18} r={18} fill="#E0679A" />
        <SvgText x={18} y={23} fontSize={13} fontWeight="800" fill="#FFFFFF" textAnchor="middle" fontFamily={SVG_FONT}>
          MS
        </SvgText>
      </Svg>
      <View style={styles.fill}>
        <Text style={[styles.replyName, { color: c.ink }]}>Mina Sato replied</Text>
        <Text numberOfLines={1} style={[styles.replyText, { color: c.muted }]}>
          Love the green tiles. Daylight on Saturday?
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => {
          toast.dismiss(id);
          toast.success('Reply sent', { description: 'To Mina Sato' });
        }}
        style={[styles.replyButton, { backgroundColor: c.on }, webPointer]}>
        <Text style={[styles.replyButtonText, { color: c.onText }]}>Reply</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  fill: { flex: 1 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8, marginLeft: 4 },
  subtitle: { fontSize: 15, marginTop: 4, marginLeft: 4 },
  code: { marginTop: 16, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 12 },
  codeText: { fontSize: 13, lineHeight: 19 },
  section: { fontSize: 13, fontWeight: '700', marginTop: 22, marginBottom: 10, marginLeft: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  call: { height: 44, borderRadius: 22, paddingHorizontal: 16, justifyContent: 'center' },
  callText: { fontSize: 14, fontWeight: '700' },
  card: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 54 },
  optionText: { fontSize: 15, fontWeight: '600' },
  segment: { flexDirection: 'row', borderRadius: 17, padding: 3 },
  segmentItem: { height: 32, borderRadius: 15, paddingHorizontal: 14, justifyContent: 'center' },
  segmentText: { fontSize: 13, fontWeight: '700' },
  dismiss: { alignSelf: 'center', height: 44, justifyContent: 'center', paddingHorizontal: 16, marginTop: 10 },
  dismissText: { fontSize: 14, fontWeight: '700' },
  reply: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 60 },
  replyName: { fontSize: 15, fontWeight: '700' },
  replyText: { fontSize: 13, marginTop: 1 },
  replyButton: { height: 30, borderRadius: 15, paddingHorizontal: 12, justifyContent: 'center' },
  replyButtonText: { fontSize: 13, fontWeight: '700' },
});

/** The demo with a safe-area provider of its own, so it runs anywhere (UpFork's preview gives it none). */
export default function Playground({ scheme }: { scheme?: Scheme }) {
  return (
    <SafeAreaProvider>
      <PlaygroundScreen scheme={scheme} />
    </SafeAreaProvider>
  );
}
