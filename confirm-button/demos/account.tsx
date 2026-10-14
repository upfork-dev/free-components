import { useId, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { ConfirmButton } from '../components/confirm-button';
import type { Scheme } from '../lib/use-scheme';

const COLORS = {
  light: { page: '#F4F3F0', card: '#FFFFFF', ink: '#17171B', muted: '#6C6C75', line: 'rgba(23, 23, 27, 0.07)', danger: '#C42D33', dangerLine: 'rgba(214, 52, 58, 0.22)', dangerWash: 'rgba(214, 52, 58, 0.04)', switchOn: '#17171B' },
  dark: { page: '#0C0C0F', card: '#16161B', ink: '#F3F3F6', muted: '#94949E', line: 'rgba(255, 255, 255, 0.07)', danger: '#FF7A7F', dangerLine: 'rgba(242, 85, 90, 0.28)', dangerWash: 'rgba(242, 85, 90, 0.05)', switchOn: '#F3F3F6' },
} as const;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
// A white thumb on every platform (React Native Web's own is teal when on).
const thumb = { thumbColor: '#FFFFFF', ...(Platform.OS === 'web' ? { activeThumbColor: '#FFFFFF' } : null) } as object;
const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;

/** A settings screen with a danger zone: one action per kind of confirmation, one of them armed at rest. */
function AccountScreen({ scheme = 'light' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const insets = useSafeAreaInsets();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [alerts, setAlerts] = useState(true);
  const [faceUnlock, setFaceUnlock] = useState(false);

  return (
    <View style={[styles.page, { backgroundColor: c.page }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        <View style={styles.bar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" style={[styles.round, webPointer]}>
            <Svg width={22} height={22} viewBox="0 0 24 24">
              <Path d="M14.5 5.5 8 12l6.5 6.5" stroke={c.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </Svg>
          </Pressable>
          <Text style={[styles.barTitle, { color: c.ink }]}>Account</Text>
          <View style={styles.round} />
        </View>

        <View style={[styles.card, styles.profile, { backgroundColor: c.card }]}>
          <Svg width={52} height={52} viewBox="0 0 52 52">
            <Defs>
              <LinearGradient id={`${uid}a`} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#B9E4D3" />
                <Stop offset="1" stopColor="#3E8E7E" />
              </LinearGradient>
            </Defs>
            <Circle cx={26} cy={26} r={26} fill={`url(#${uid}a)`} />
            <Circle cx={26} cy={21} r={8} fill="#FFFFFF" opacity={0.9} />
            <Path d="M11 43c3-8 9-11 15-11s12 3 15 11" fill="#FFFFFF" opacity={0.9} />
          </Svg>
          <View style={styles.flex}>
            <Text style={[styles.name, { color: c.ink }]}>Lea Moreno</Text>
            <Text style={[styles.mail, { color: c.muted }]}>lea.moreno@example.com</Text>
          </View>
        </View>

        <Text style={[styles.section, { color: c.muted }]}>PREFERENCES</Text>
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <Row label="Payment alerts" c={c}>
            <Switch value={alerts} onValueChange={setAlerts} trackColor={{ true: c.switchOn }} {...thumb} />
          </Row>
          <Row label="Unlock with face" c={c} divider>
            <Switch value={faceUnlock} onValueChange={setFaceUnlock} trackColor={{ true: c.switchOn }} {...thumb} />
          </Row>
          <Row label="Language" c={c} divider>
            <Text style={[styles.value, { color: c.muted }]}>English</Text>
          </Row>
        </View>

        <Text style={[styles.section, { color: c.danger }]}>DANGER ZONE</Text>
        <View style={[styles.card, styles.danger, { backgroundColor: c.card, borderColor: c.dangerLine }]}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: c.dangerWash, borderRadius: 22 }]} pointerEvents="none" />
          <Action title="Sessions" body="Signs you out everywhere but here." c={c}>
            <ConfirmButton
              label="Sign out of all devices"
              armedLabel="Sign out everywhere?"
              doneLabel="Signed out"
              tone="neutral"
              fullWidth
              onConfirm={() => wait(1200)}
              scheme={scheme}
            />
          </Action>
          <Action title="Your data" body="Removes notes, files and history. Your account stays." c={c} divider>
            <ConfirmButton
              label="Delete all data"
              armedLabel="Tap to confirm"
              busyLabel="Deleting your data…"
              doneLabel="Data deleted"
              tone="danger"
              fullWidth
              defaultArmed
              onConfirm={() => wait(1200)}
              scheme={scheme}
            />
          </Action>
          <Action title="Account" body="Closes the account for good. Hold the button to be sure." c={c} divider>
            <ConfirmButton
              label="Hold to delete account"
              busyLabel="Deleting your account…"
              doneLabel="Account deleted"
              tone="danger"
              mode="hold"
              fullWidth
              onConfirm={() => wait(1200)}
              scheme={scheme}
            />
          </Action>
        </View>
      </ScrollView>
    </View>
  );
}

function Row({ label, children, c, divider }: { label: string; children: ReactNode; c: (typeof COLORS)[Scheme]; divider?: boolean }) {
  return (
    <View style={[styles.row, divider && { borderTopWidth: 1, borderTopColor: c.line }]}>
      <Text style={[styles.rowLabel, { color: c.ink }]}>{label}</Text>
      {children}
    </View>
  );
}

function Action({ title, body, children, c, divider }: { title: string; body: string; children: ReactNode; c: (typeof COLORS)[Scheme]; divider?: boolean }) {
  return (
    <View style={[styles.action, divider && { borderTopWidth: 1, borderTopColor: c.line }]}>
      <Text style={[styles.actionTitle, { color: c.ink }]}>{title}</Text>
      <Text style={[styles.actionBody, { color: c.muted }]}>{body}</Text>
      <View style={styles.actionButton}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  flex: { flex: 1 },
  bar: { height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  round: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  barTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' },
  card: { marginHorizontal: 16, borderRadius: 22, paddingHorizontal: 16 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, marginTop: 6 },
  name: { fontSize: 18, fontWeight: '800' },
  mail: { fontSize: 13, marginTop: 2 },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginHorizontal: 24, marginTop: 22, marginBottom: 8 },
  row: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { fontSize: 15, fontWeight: '500' },
  value: { fontSize: 15 },
  danger: { borderWidth: 1, overflow: 'visible' },
  action: { paddingVertical: 14 },
  actionTitle: { fontSize: 15, fontWeight: '700' },
  actionBody: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  actionButton: { marginTop: 12 },
});

/** The demo with a safe-area provider of its own, so it runs anywhere (UpFork's preview gives it none). */
export default function AccountDemo({ scheme }: { scheme?: Scheme }) {
  return (
    <SafeAreaProvider>
      <AccountScreen scheme={scheme} />
    </SafeAreaProvider>
  );
}
