import * as Haptics from 'expo-haptics';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import type { Scheme } from '../../lib/use-scheme';
import { useDrawer } from './drawer';

type IconComponent = ComponentType<{ color: string; size: number }>;

const STAGGER_FROM = 0.25;
const STAGGER_STEP = 0.06;
const STAGGER_SPAN = 0.35;
const PILL_SPRING = { stiffness: 380, damping: 32, mass: 1 };
const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;

/** How far into its entrance a piece of the menu is: scrubbed by the drawer's progress, never on a timer. */
function entrance(progress: number, order: number) {
  'worklet';
  const start = Math.min(STAGGER_FROM + STAGGER_STEP * order, 1 - STAGGER_SPAN);
  const t = (progress - start) / STAGGER_SPAN;
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/** The style that brings a piece of the menu in: from 18 points out, fading in, as the drawer opens. */
export function useEntrance(order: number) {
  const { progress, side, reduced } = useDrawer();
  const sign = side === 'left' ? 1 : -1;
  return useAnimatedStyle(() => {
    const t = entrance(progress.value, order);
    if (reduced) return { opacity: t };
    return { opacity: t, transform: [{ translateX: -sign * 18 * (1 - t) }] };
  });
}

type Box = { x: number; y: number; width: number; height: number };
type MenuContextValue = {
  container: React.RefObject<View | null>;
  setActive: (box: Box, order: number) => void;
  registerFirst: (order: number, focus: () => void) => void;
};
const MenuContext = createContext<MenuContextValue | null>(null);

export type DrawerMenuProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Scroll when the menu is taller than the screen. Default true. */
  scroll?: boolean;
};

/**
 * The menu's frame: safe-area padding, the active item's pill (which slides between items), and a
 * footer kept at the bottom. Put DrawerHeader, DrawerSection, DrawerItem and DrawerFooter inside.
 */
export function DrawerMenu({ children, style, scroll = true }: DrawerMenuProps) {
  const { theme, setFocusFirst, progress } = useDrawer();
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };
  const container = useRef<View>(null);
  const pillY = useSharedValue(0);
  const pillX = useSharedValue(0);
  const pillW = useSharedValue(0);
  const pillH = useSharedValue(0);
  const pillOrder = useSharedValue(-1);
  const placed = useRef(false);
  const first = useRef<{ order: number; focus: () => void } | null>(null);

  const setActive = useCallback(
    (box: Box, order: number) => {
      pillOrder.value = order;
      if (!placed.current) {
        placed.current = true;
        pillY.value = box.y;
        pillX.value = box.x;
        pillW.value = box.width;
        pillH.value = box.height;
        return;
      }
      pillY.value = withSpring(box.y, PILL_SPRING);
      pillX.value = withSpring(box.x, PILL_SPRING);
      pillW.value = withSpring(box.width, PILL_SPRING);
      pillH.value = withSpring(box.height, PILL_SPRING);
    },
    [pillY, pillX, pillW, pillH, pillOrder],
  );

  const registerFirst = useCallback(
    (order: number, focus: () => void) => {
      if (!first.current || order <= first.current.order) first.current = { order, focus };
      setFocusFirst(() => first.current?.focus());
    },
    [setFocusFirst],
  );
  useEffect(() => () => setFocusFirst(null), [setFocusFirst]);

  const pill = useAnimatedStyle(() => ({
    opacity: pillOrder.value < 0 ? 0 : entrance(progress.value, pillOrder.value),
    width: pillW.value,
    height: pillH.value,
    transform: [{ translateX: pillX.value }, { translateY: pillY.value }],
  }));

  const body = (
    <View ref={container} style={[styles.menuBody, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 14 }]} collapsable={false}>
      <Animated.View pointerEvents="none" style={[styles.pill, { backgroundColor: theme.pill }, pill]}>
        <View style={[styles.pillBar, { backgroundColor: theme.accent }]} />
      </Animated.View>
      {children}
    </View>
  );

  return (
    <MenuContext.Provider value={{ container, setActive, registerFirst }}>
      {scroll ? (
        <ScrollView style={[styles.menu, style]} contentContainerStyle={styles.grow} showsVerticalScrollIndicator={false} bounces={false}>
          {body}
        </ScrollView>
      ) : (
        <View style={[styles.menu, style]}>{body}</View>
      )}
    </MenuContext.Provider>
  );
}

export type DrawerHeaderProps = {
  avatar?: ReactNode;
  name: string;
  detail?: string;
  /** A small badge after the name (a plan: "Premium"). */
  badge?: string;
  order?: number;
};

/** The person or app at the top of the menu; the avatar grows in as the drawer opens. */
export function DrawerHeader({ avatar, name, detail, badge, order = 0 }: DrawerHeaderProps) {
  const { theme, progress } = useDrawer();
  const enter = useEntrance(order);
  const grow = useAnimatedStyle(() => {
    const c = Math.min(Math.max(progress.value, 0), 1);
    return { transform: [{ scale: 0.82 + 0.18 * c }] };
  });
  return (
    <Animated.View style={[styles.header, enter]}>
      {avatar ? <Animated.View style={grow}>{avatar}</Animated.View> : null}
      <View style={styles.headerText}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
          {name}
        </Text>
        {badge || detail ? (
          <View style={styles.detailRow}>
            {badge ? (
              <View style={[styles.plan, { borderColor: theme.accent }]}>
                <Text style={[styles.planText, { color: theme.accent }]}>{badge}</Text>
              </View>
            ) : null}
            {detail ? (
              <Text style={[styles.detail, { color: theme.muted }]} numberOfLines={1}>
                {detail}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

/** A small capitals label over a group of items. */
export function DrawerSection({ title, order = 0, children }: { title: string; order?: number; children?: ReactNode }) {
  const { theme } = useDrawer();
  const enter = useEntrance(order);
  return (
    <View style={styles.section}>
      <Animated.Text style={[styles.sectionTitle, { color: theme.faint }, enter]} role="heading">
        {title.toUpperCase()}
      </Animated.Text>
      {children}
    </View>
  );
}

export type DrawerItemProps = {
  label: string;
  icon?: IconComponent;
  badge?: string | number;
  active?: boolean;
  onPress?: () => void;
  /** Its place in the entrance (0 first). */
  order?: number;
  accessibilityHint?: string;
};

/** A row of the menu: icon, label, badge; the active one sits on the sliding pill. */
export function DrawerItem({ label, icon: Icon, badge, active = false, onPress, order = 0, accessibilityHint }: DrawerItemProps) {
  const { theme, haptics } = useDrawer();
  const menu = useContext(MenuContext);
  const enter = useEntrance(order);
  const ref = useRef<View>(null);
  const [focused, setFocused] = useState(false);

  const report = useCallback(() => {
    if (!active || !menu?.container.current || !ref.current) return;
    ref.current.measureLayout(
      menu.container.current,
      (x, y, width, height) => menu.setActive({ x, y, width, height }, order),
      () => undefined,
    );
  }, [active, menu, order]);
  useEffect(report, [report]);

  useEffect(() => {
    menu?.registerFirst(order, () => {
      const node = ref.current as unknown as { focus?: () => void } | null;
      if (Platform.OS === 'web') node?.focus?.();
      else if (ref.current) AccessibilityInfo.sendAccessibilityEvent(ref.current, 'focus');
    });
  }, [menu, order]);

  const color = active ? theme.text : theme.muted;
  return (
    <Animated.View style={enter}>
      <Pressable
        ref={ref}
        onLayout={report}
        onPress={() => {
          if (haptics && Platform.OS !== 'web') Haptics.selectionAsync().catch(() => undefined);
          onPress?.();
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={badge !== undefined ? `${label}, ${badge}` : label}
        accessibilityHint={accessibilityHint}
        style={[styles.item, focused && Platform.OS === 'web' ? { backgroundColor: theme.pill } : null, webPointer]}
      >
        {Icon ? (
          <View style={styles.icon}>
            <Icon color={color} size={22} />
          </View>
        ) : null}
        <Text style={[styles.label, { color }]} numberOfLines={1}>
          {label}
        </Text>
        {badge !== undefined ? (
          <View style={[styles.badge, { backgroundColor: theme.badge }]}>
            <Text style={[styles.badgeText, { color: theme.badgeText }]}>{badge}</Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

export type DrawerFooterProps = {
  children?: ReactNode;
  /** Shows a light/dark switch. */
  scheme?: Scheme;
  onSchemeChange?: (scheme: Scheme) => void;
  onSignOut?: () => void;
  signOutLabel?: string;
  order?: number;
};

/** The bottom of the menu: a light/dark switch and sign out, or anything of yours. */
export function DrawerFooter({ children, scheme, onSchemeChange, onSignOut, signOutLabel = 'Sign out', order = 8 }: DrawerFooterProps) {
  const { theme } = useDrawer();
  const enter = useEntrance(order);
  return (
    <Animated.View style={[styles.footer, { borderTopColor: theme.hairline }, enter]}>
      {scheme && onSchemeChange ? <SchemeSwitch scheme={scheme} onChange={onSchemeChange} /> : null}
      {onSignOut ? (
        <Pressable onPress={onSignOut} accessibilityRole="button" style={[styles.signOut, webPointer]}>
          <SignOutIcon color={theme.muted} size={20} />
          <Text style={[styles.signOutText, { color: theme.muted }]}>{signOutLabel}</Text>
        </Pressable>
      ) : null}
      {children}
    </Animated.View>
  );
}

function SchemeSwitch({ scheme, onChange }: { scheme: Scheme; onChange: (s: Scheme) => void }) {
  const { theme } = useDrawer();
  const x = useSharedValue(scheme === 'dark' ? 1 : 0);
  useEffect(() => {
    x.value = withSpring(scheme === 'dark' ? 1 : 0, PILL_SPRING);
  }, [scheme, x]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * 40 }] }));
  return (
    <View style={[styles.switch, { backgroundColor: theme.switchTrack }]} role="radiogroup" aria-label="Appearance">
      <Animated.View style={[styles.switchThumb, { backgroundColor: theme.switchThumb }, thumb]} />
      {(['light', 'dark'] as const).map((s) => (
        <Pressable
          key={s}
          onPress={() => onChange(s)}
          accessibilityRole="radio"
          accessibilityState={{ checked: scheme === s }}
          accessibilityLabel={s === 'light' ? 'Light' : 'Dark'}
          style={[styles.switchSlot, webPointer]}
        >
          {s === 'light' ? <SunIcon color={scheme === s ? theme.text : theme.faint} size={18} /> : <MoonIcon color={scheme === s ? theme.text : theme.faint} size={18} />}
        </Pressable>
      ))}
    </View>
  );
}

const stroke = { strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;

function SunIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={4} stroke={color} {...stroke} />
      <Path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" stroke={color} {...stroke} />
    </Svg>
  );
}

function MoonIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M19.5 14.6A8 8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1Z" stroke={color} {...stroke} />
    </Svg>
  );
}

function SignOutIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M14 4.5h3.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H14M10 16.5 5.5 12 10 7.5M5.5 12H15" stroke={color} {...stroke} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  menu: { flex: 1 },
  grow: { flexGrow: 1 },
  menuBody: { flexGrow: 1, paddingHorizontal: 14 },
  pill: { position: 'absolute', left: 0, top: 0, borderRadius: 14, overflow: 'hidden' },
  pillBar: { position: 'absolute', left: 0, top: '22%', bottom: '22%', width: 3, borderRadius: 1.5 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8, paddingBottom: 18 },
  headerText: { flex: 1 },
  name: { fontSize: 17, fontWeight: '700' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  plan: { borderWidth: 1, borderRadius: 7, paddingHorizontal: 6, height: 18, justifyContent: 'center' },
  planText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  detail: { fontSize: 13, flexShrink: 1 },
  section: { marginTop: 10 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, paddingHorizontal: 12, marginBottom: 4, marginTop: 6 },
  item: { flexDirection: 'row', alignItems: 'center', height: 48, paddingHorizontal: 12, gap: 14, borderRadius: 14 },
  icon: { width: 22, height: 22 },
  label: { flex: 1, fontSize: 15, fontWeight: '500' },
  badge: { minWidth: 22, height: 20, borderRadius: 10, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 11, fontWeight: '800' },
  footer: { marginTop: 'auto', paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, gap: 6 },
  switch: { flexDirection: 'row', alignSelf: 'flex-start', marginLeft: 8, height: 36, width: 84, borderRadius: 18, padding: 2 },
  switchThumb: { position: 'absolute', left: 2, top: 2, width: 40, height: 32, borderRadius: 16 },
  switchSlot: { width: 40, height: 32, alignItems: 'center', justifyContent: 'center' },
  signOut: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 44, paddingHorizontal: 12 },
  signOutText: { fontSize: 15, fontWeight: '500' },
});
