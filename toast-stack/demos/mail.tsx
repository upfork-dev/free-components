import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { ArchiveIcon, Toaster, toast } from '../components/toast-stack';
import type { Scheme } from '../lib/use-scheme';

type Mail = { id: string; from: string; subject: string; snippet: string; time: string; tint: string; unread: boolean };

const INBOX: Mail[] = [
  { id: 'noor', from: 'Noor Haddad', subject: 'Lisbon flat: keys and check-in', snippet: 'The lockbox code is in the doc, and the tram stops right outside.', time: '9:41', tint: '#F08A5D', unread: true },
  { id: 'pallet', from: 'Studio Pallet', subject: 'Your proofs are ready', snippet: "Twelve prints from Saturday's shoot, two in black and white.", time: '9:12', tint: '#7C6CF2', unread: true },
  { id: 'rae', from: 'Rae Lindholm', subject: 'Trip notes', snippet: 'Packing list v3, and the ferry leaves at 7:40, not 8.', time: '8:47', tint: '#2FB59A', unread: false },
  { id: 'theo', from: 'Theo Park', subject: 'Climbing on Thursday?', snippet: 'The new wall opens at six. Bring chalk, I keep losing mine.', time: '8:02', tint: '#4C8DF6', unread: false },
  { id: 'mina', from: 'Mina Sato', subject: 'Re: kitchen plans', snippet: 'I love the green tiles. Can we see them in daylight first?', time: 'Mon', tint: '#E0679A', unread: false },
  { id: 'book', from: 'Book circle', subject: 'October pick: The Salt Road', snippet: 'Three votes to two. We meet on the 28th at the corner café.', time: 'Sun', tint: '#C49A3A', unread: false },
  { id: 'kiln', from: 'Kiln Bank', subject: 'Your September statement', snippet: 'Your statement is ready. Nothing needs your attention.', time: 'Sat', tint: '#6B7A90', unread: false },
];
const ARCHIVED: Mail = { id: 'ola', from: 'Ola Mensah', subject: 'Weekend market plans', snippet: 'Stall 14 again? I can bring the awning and the scales.', time: 'Fri', tint: '#3FA34D', unread: false };

const COLORS = {
  light: { page: '#F6F6F3', card: '#FFFFFF', ink: '#16161C', muted: '#6E6E78', line: 'rgba(22, 22, 28, 0.07)', swipe: '#2F9E6A', chip: 'rgba(22, 22, 28, 0.06)', accent: '#3D6BF5', accentText: '#3D6BF5', bar: 'rgba(255, 255, 255, 0.94)', sheet: '#FFFFFF', scrim: 'rgba(10, 10, 16, 0.32)' },
  dark: { page: '#0C0C10', card: '#16161C', ink: '#F2F2F6', muted: '#8E8E9A', line: 'rgba(242, 242, 246, 0.07)', swipe: '#2B8A5E', chip: 'rgba(242, 242, 246, 0.08)', accent: '#3D63E0', accentText: '#93ABFF', bar: 'rgba(22, 22, 28, 0.94)', sheet: '#18181E', scrim: 'rgba(0, 0, 0, 0.5)' },
} as const;

const TAB_BAR = 58;
// SVG text falls back to a serif on the web: name a sans-serif.
const SVG_FONT = Platform.OS === 'web' ? 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' : undefined;
const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;

/** An inbox: archive a conversation and undo it, send a reply as a promise. Three toasts wait in the stack. */
function MailScreen({ scheme = 'light' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];
  const insets = useSafeAreaInsets();
  const [mails, setMails] = useState(INBOX);
  const [replying, setReplying] = useState<Mail | null>(null);
  const mailsRef = useRef(mails);
  mailsRef.current = mails;

  const restore = (mail: Mail, at: number) => {
    setMails((list) => (list.some((m) => m.id === mail.id) ? list : [...list.slice(0, at), mail, ...list.slice(at)]));
    toast.success('Restored', { description: mail.subject });
  };

  const archive = (mail: Mail) => {
    const at = mailsRef.current.findIndex((m) => m.id === mail.id);
    setMails((list) => list.filter((m) => m.id !== mail.id));
    toast('Conversation archived', {
      description: mail.subject,
      icon: <ArchiveIcon color={c.ink} />,
      action: { label: 'Undo', onPress: () => restore(mail, Math.max(at, 0)) },
    });
  };

  // The poster: the stack already holds three toasts (kept in this demo only, until you swipe them away).
  useEffect(() => {
    toast.clear();
    toast.info('Snoozed until tomorrow', { description: 'Trip notes, from Rae', duration: Infinity });
    toast.success('Message sent', { description: 'To Noor Haddad', duration: Infinity });
    toast('Conversation archived', {
      description: ARCHIVED.subject,
      icon: <ArchiveIcon color={c.ink} />,
      duration: Infinity,
      action: { label: 'Undo', onPress: () => restore(ARCHIVED, 2) },
    });
    return () => toast.clear();
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = (mail: Mail) => {
    setReplying(null);
    toast.promise(new Promise((resolve) => setTimeout(resolve, 1600)), {
      loading: 'Sending…',
      success: 'Sent',
      error: 'Couldn’t send',
    }, { description: `Re: ${mail.subject}` });
  };

  return (
    <View style={[styles.page, { backgroundColor: c.page }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: TAB_BAR + insets.bottom + 120 }}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.ink }]}>Inbox</Text>
          <View style={[styles.avatarMe, { backgroundColor: c.chip }]}>
            <Text style={[styles.me, { color: c.ink }]}>AV</Text>
          </View>
        </View>
        <View style={[styles.search, { backgroundColor: c.chip }]}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Circle cx={11} cy={11} r={6.5} stroke={c.muted} strokeWidth={2} />
            <Path d="m16 16 4 4" stroke={c.muted} strokeWidth={2} strokeLinecap="round" />
          </Svg>
          <Text style={[styles.searchText, { color: c.muted }]}>Search mail</Text>
        </View>
        <Text style={[styles.section, { color: c.muted }]}>Today</Text>
        <View style={[styles.list, { backgroundColor: c.card, borderColor: c.line }]}>
          {mails.map((mail, i) => (
            <Animated.View key={mail.id} layout={LinearTransition.duration(260)} entering={FadeIn.duration(220)}>
              {i > 0 ? <View style={[styles.rule, { backgroundColor: c.line }]} /> : null}
              <MailRow mail={mail} colors={c} onArchive={() => archive(mail)} onOpen={() => setReplying(mail)} />
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.tabBar, { height: TAB_BAR + insets.bottom, paddingBottom: insets.bottom, backgroundColor: c.bar, borderColor: c.line }]}>
        {['Inbox', 'Calendar', 'People'].map((tab, i) => (
          <View key={tab} style={styles.tab}>
            <View style={[styles.tabDot, { backgroundColor: i === 0 ? c.accentText : 'transparent' }]} />
            <Text style={[styles.tabText, { color: i === 0 ? c.ink : c.muted }]}>{tab}</Text>
          </View>
        ))}
      </View>

      <Toaster scheme={scheme} offset={TAB_BAR + 10} />

      {/* The reply sheet covers the toasts while it's open; they're there again when it closes. */}
      {replying ? <ReplySheet mail={replying} colors={c} onClose={() => setReplying(null)} onSend={() => send(replying)} /> : null}
    </View>
  );
}

function Initials({ name, tint, size }: { name: string; tint: string; size: number }) {
  const letters = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx={20} cy={20} r={20} fill={tint} />
      <SvgText x={20} y={25} fontSize={14} fontWeight="700" fill="#FFFFFF" textAnchor="middle" fontFamily={SVG_FONT}>
        {letters}
      </SvgText>
    </Svg>
  );
}

/** A conversation: swipe it left (or press its archive button) to archive it, tap it to reply. */
function MailRow({ mail, colors, onArchive, onOpen }: { mail: Mail; colors: (typeof COLORS)[Scheme]; onArchive: () => void; onOpen: () => void }) {
  const { width } = useWindowDimensions();
  const x = useSharedValue(0);
  const startX = useSharedValue(0);
  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-8, 8])
    .onBegin((event) => {
      startX.value = event.absoluteX;
    })
    .onUpdate((event) => {
      x.value = Math.min(0, event.absoluteX - startX.value);
    })
    .onEnd((event) => {
      if (x.value < -width * 0.35 || event.velocityX < -800) {
        x.value = withTiming(-width, { duration: 200, easing: Easing.out(Easing.quad) }, (done) => {
          if (done) scheduleOnRN(onArchive);
        });
      } else {
        x.value = withSpring(0, { stiffness: 260, damping: 26 });
      }
    });
  const row = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const reveal = useAnimatedStyle(() => ({ opacity: Math.min(1, -x.value / 60) }));

  return (
    <View style={styles.rowWrap}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.swipeBack, { backgroundColor: colors.swipe }, reveal]}>
        <ArchiveIcon color="#FFFFFF" size={20} />
        <Text style={styles.swipeText}>Archive</Text>
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={[{ backgroundColor: colors.card }, row]}>
          <View style={styles.row}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${mail.from}, ${mail.subject}`}
              onPress={onOpen}
              style={[styles.rowMain, webPointer]}>
              <Initials name={mail.from} tint={mail.tint} size={40} />
              <View style={styles.rowText}>
                <View style={styles.rowTop}>
                  <Text numberOfLines={1} style={[styles.from, { color: colors.ink, fontWeight: mail.unread ? '800' : '600' }]}>
                    {mail.from}
                  </Text>
                  <Text style={[styles.time, { color: mail.unread ? colors.accentText : colors.muted }]}>{mail.time}</Text>
                </View>
                <Text numberOfLines={1} style={[styles.subject, { color: colors.ink }]}>
                  {mail.subject}
                </Text>
                <Text numberOfLines={1} style={[styles.snippet, { color: colors.muted }]}>
                  {mail.snippet}
                </Text>
              </View>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Archive ${mail.subject}`} hitSlop={6} onPress={onArchive} style={[styles.archive, webPointer]}>
              <ArchiveIcon color={colors.muted} size={18} />
            </Pressable>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

/** A reply in a sheet: Send runs a promise toast. */
function ReplySheet({ mail, colors, onClose, onSend }: { mail: Mail; colors: (typeof COLORS)[Scheme]; onClose: () => void; onSend: () => void }) {
  const insets = useSafeAreaInsets();
  const rise = useSharedValue(0);
  useEffect(() => {
    rise.value = withSpring(1, { stiffness: 240, damping: 28 });
  }, [rise]);
  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - rise.value) * 360 }] }));
  const scrim = useAnimatedStyle(() => ({ opacity: rise.value }));
  const [text, setText] = useState('Sounds perfect, thank you! See you on the 18th.');
  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }, scrim]}>
        <Pressable accessibilityLabel="Close reply" style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.sheet, { backgroundColor: colors.sheet, paddingBottom: insets.bottom + 16 }, sheet]}>
        <View style={[styles.grabber, { backgroundColor: colors.line }]} />
        <Text style={[styles.sheetTitle, { color: colors.ink }]}>Re: {mail.subject}</Text>
        <Text style={[styles.sheetTo, { color: colors.muted }]}>To {mail.from}</Text>
        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          accessibilityLabel="Reply"
          style={[styles.reply, { color: colors.ink, borderColor: colors.line }]}
        />
        <View style={styles.sheetButtons}>
          <Pressable accessibilityRole="button" onPress={onClose} style={[styles.ghost, webPointer]}>
            <Text style={[styles.ghostText, { color: colors.muted }]}>Cancel</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onSend} style={({ pressed }) => [styles.sendButton, { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 }, webPointer]}>
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  avatarMe: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  me: { fontSize: 13, fontWeight: '800' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, borderRadius: 12, marginHorizontal: 20, marginTop: 14, paddingHorizontal: 12 },
  searchText: { fontSize: 15 },
  section: { fontSize: 13, fontWeight: '700', marginTop: 20, marginBottom: 8, marginHorizontal: 24 },
  list: { marginHorizontal: 12, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  rule: { height: StyleSheet.hairlineWidth, marginLeft: 68 },
  rowWrap: { overflow: 'hidden' },
  swipeBack: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, paddingRight: 22 },
  swipeText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', paddingRight: 6 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 14, paddingVertical: 12 },
  rowText: { flex: 1 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  from: { flex: 1, fontSize: 15 },
  time: { fontSize: 12, fontWeight: '600' },
  subject: { fontSize: 14, fontWeight: '600', marginTop: 1 },
  snippet: { fontSize: 13, marginTop: 1 },
  archive: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  tabBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  tabDot: { width: 5, height: 5, borderRadius: 2.5 },
  tabText: { fontSize: 12, fontWeight: '700' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingTop: 10 },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, marginBottom: 14 },
  sheetTitle: { fontSize: 18, fontWeight: '800' },
  sheetTo: { fontSize: 13, marginTop: 2 },
  reply: { minHeight: 96, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 12, marginTop: 14, fontSize: 15, lineHeight: 21, textAlignVertical: 'top', outlineStyle: 'none' } as never,
  sheetButtons: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 14 },
  ghost: { height: 44, paddingHorizontal: 14, justifyContent: 'center' },
  ghostText: { fontSize: 15, fontWeight: '600' },
  sendButton: { height: 44, borderRadius: 22, paddingHorizontal: 22, justifyContent: 'center' },
  sendText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});

/** The demo with a safe-area provider of its own, so it runs anywhere (UpFork's preview gives it none). */
export default function MailDemo({ scheme }: { scheme?: Scheme }) {
  return (
    <SafeAreaProvider>
      <MailScreen scheme={scheme} />
    </SafeAreaProvider>
  );
}
