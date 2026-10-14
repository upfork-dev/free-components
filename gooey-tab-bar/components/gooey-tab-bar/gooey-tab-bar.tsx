import { Canvas, Circle, Group, LinearGradient, Paint, Path, Shadow, Skia, vec } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  I18nManager,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type DerivedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { useScheme, type Scheme } from '../../lib/use-scheme';
import { addBar, addBridge, addEllipse, addNeck, clamp, lerp, smoothstep, type Notch } from './geometry';
import { PlusIcon, type GooeyIcon } from './icons';

export type GooeyTab = {
  key: string;
  label: string;
  icon: GooeyIcon;
  /** A count ("99+" past 99) or 'dot'. 0 or none shows nothing. */
  badge?: number | 'dot';
  accessibilityLabel?: string;
};

type Bubble = { x: number; y: number; attached: number; footX: number; rx: number; ry: number; lift: number };

export type GooeyAction = { key: string; label: string; icon: GooeyIcon; onPress: () => void };

export type GooeyColors = {
  bar: string;
  bubble: string;
  onBubble: string;
  icon: string;
  label: string;
  badge: string;
  onBadge: string;
  /** The centre action's button. */
  center: string;
  onCenter: string;
};

export type GooeyTabBarProps = {
  /** 2 to 5 tabs; with a centre action, 2 or 4. */
  tabs: GooeyTab[];
  index: number;
  onChange: (index: number, key: string) => void;
  /** The focused tab was pressed again (scroll to top, for instance). */
  onReselect?: (index: number, key: string) => void;
  /**
   * 'drop': the focused tab rides in a bubble floating above the bar, held by a liquid neck that pinches off as it
   * leaves and grows back where it lands. 'cradle': the bubble sits in a notch that flows along the bar's edge.
   */
  variant?: 'drop' | 'cradle';
  showLabels?: boolean;
  /** A raised button in the middle: it runs `onPress`, or blooms its `actions` out of itself. */
  centerAction?: { icon?: GooeyIcon; label: string; actions?: GooeyAction[]; onPress?: () => void };
  colors?: Partial<GooeyColors>;
  /** The bar's height, without the bottom safe area. */
  height?: number;
  scheme?: Scheme;
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;
};

const THEMES: Record<Scheme, GooeyColors & { hairline: string; shadow: string; scrim: string; glow: number }> = {
  light: {
    bar: '#FFFFFF',
    bubble: '#5B4BFF',
    onBubble: '#FFFFFF',
    icon: '#8A88A3',
    label: '#8A88A3',
    badge: '#FF4D5E',
    onBadge: '#FFFFFF',
    center: '#17162A',
    onCenter: '#FFFFFF',
    hairline: 'rgba(17, 12, 46, 0.07)',
    shadow: 'rgba(17, 12, 46, 0.09)',
    scrim: 'rgba(12, 10, 28, 0.34)',
    glow: 0,
  },
  dark: {
    bar: '#16151F',
    bubble: '#7C6CFF',
    onBubble: '#FFFFFF',
    icon: '#6E6C86',
    label: '#6E6C86',
    badge: '#FF5C6C',
    onBadge: '#FFFFFF',
    center: '#F4F3FA',
    onCenter: '#16151F',
    hairline: 'rgba(255, 255, 255, 0.07)',
    shadow: 'rgba(0, 0, 0, 0.55)',
    scrim: 'rgba(0, 0, 0, 0.55)',
    glow: 0.35,
  },
};

// The drop: a blob in the bar's colour, with the bubble's disc inside it.
const BLOB = 31;
const DISC = 25;
const DROP_GAP = 20;
// The cradle: a disc sitting in a notch.
const CRADLE_DISC = 26;
const CRADLE_GAP = 6;
// The centre button.
const CENTER_BLOB = 31;
const CENTER_DISC = 25;
const ACTION = 24;
const ACTION_DISTANCE = 108;
const ICON = 24;

const NO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };
const TRAVEL = { stiffness: 240, damping: 22, mass: 1 };
const BLOOM = { stiffness: 210, damping: 21, mass: 1 };
const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;

/**
 * A bottom tab bar where the focused tab rides in a bubble that melts out of the bar. Switching tabs pinches the
 * bubble off, flies it over and grows a new liquid neck where it lands. Place it as the last child of a screen that
 * fills the window: it positions itself along the bottom.
 */
export function GooeyTabBar({
  tabs,
  index,
  onChange,
  onReselect,
  variant = 'drop',
  showLabels = true,
  centerAction,
  colors: colorsProp,
  height = 64,
  scheme: schemeProp,
  haptics = true,
  style,
}: GooeyTabBarProps) {
  const scheme = useScheme(schemeProp);
  const theme = THEMES[scheme];
  const colors: GooeyColors = { ...theme, ...colorsProp };
  const reduceMotion = useReducedMotion();
  // The bottom safe area from your app's SafeAreaProvider, or none if it has no provider.
  const insets = useContext(SafeAreaInsetsContext) ?? NO_INSETS;
  const window = useWindowDimensions();
  const [width, setWidth] = useState(window.width);

  const actions = centerAction?.actions ?? [];
  const hasCenter = Boolean(centerAction);
  const cradle = variant === 'cradle';
  const slots = tabs.length + (hasCenter ? 1 : 0);
  const slotWidth = width / slots;
  const half = tabs.length / 2;
  // Right to left, the tabs run the other way.
  const rtl = I18nManager.isRTL;
  const tabX = useMemo(
    () =>
      tabs.map((_, k) => {
        const slot = hasCenter && k >= half ? k + 1 : k;
        return slotWidth * ((rtl ? slots - 1 - slot : slot) + 0.5);
      }),
    [tabs, slotWidth, hasCenter, half, rtl, slots],
  );
  const centerX = width / 2;
  const head = actions.length > 0 ? 220 : hasCenter ? 140 : 118;
  const edge = head;
  const stageHeight = head + height + insets.bottom;
  const iconY = edge + (showLabels ? height * 0.36 : height * 0.5);
  const labelY = edge + height * 0.7;

  // Where things rest, in the stage's coordinates.
  const blobY = cradle ? edge - 3 : edge - DROP_GAP - BLOB;
  const centerY = cradle ? edge - 6 : edge - CENTER_BLOB + 8;

  const xs = useSharedValue(tabX);
  useEffect(() => {
    xs.value = tabX;
  }, [tabX, xs]);

  const clamped = Math.min(Math.max(index, 0), Math.max(tabs.length - 1, 0));
  const position = useSharedValue(clamped);
  const previous = useRef(clamped);
  useEffect(() => {
    if (previous.current === clamped) return;
    previous.current = clamped;
    position.value = reduceMotion ? withTiming(clamped, { duration: 160 }) : withSpring(clamped, TRAVEL);
  }, [clamped, position, reduceMotion]);

  // The bubble's speed, for squash and stretch.
  const lastX = useSharedValue(tabX[clamped] ?? 0);
  const speed = useSharedValue(0);
  useFrameCallback((frame) => {
    const p = position.value;
    const list = xs.value;
    if (list.length === 0) return;
    const lo = Math.floor(p);
    const hi = Math.min(Math.ceil(p), list.length - 1);
    const x = lerp(list[lo], list[hi], p - lo);
    const dt = Math.max(frame.timeSincePreviousFrame ?? 16, 1);
    speed.value = speed.value * 0.65 + (((x - lastX.value) / dt) * 1000) * 0.35;
    lastX.value = x;
  });

  // Everything about the bubble, derived from where it is between two tabs.
  const bubble = useDerivedValue(() => {
    const list = xs.value;
    const p = position.value;
    if (list.length === 0) return { x: 0, y: blobY, attached: 1, footX: 0, rx: BLOB, ry: BLOB, lift: 0 };
    const lo = Math.floor(p);
    const hi = Math.min(Math.ceil(p), list.length - 1);
    const x = lerp(list[lo], list[hi], p - lo);
    const near = Math.min(Math.max(Math.round(p), 0), list.length - 1);
    const attached = reduceMotion ? 1 : 1 - smoothstep(0.1, 0.42, Math.abs(p - near));
    // Over the centre button the bubble flies higher, clear of it.
    const overCenter = hasCenter ? 1 - smoothstep(slotWidth * 0.35, slotWidth * 1.05, Math.abs(x - centerX)) : 0;
    const lift = reduceMotion ? 0 : (1 - attached) * (cradle ? 14 : 12) + (1 - attached) * overCenter * (cradle ? 40 : 30);
    const stretch = reduceMotion ? 1 : clamp(1 + Math.abs(speed.value) / 3500, 1, 1.18);
    const r = cradle ? CRADLE_DISC : BLOB;
    return { x, y: blobY - lift, attached, footX: list[near], rx: r * stretch, ry: r / stretch, lift };
  });

  // The bloom: 0 closed, 1 open.
  const [bloomed, setBloomed] = useState(false);
  const bloom = useSharedValue(0);
  const toggleBloom = (open: boolean) => {
    if (actions.length === 0) return;
    if (open) setBloomed(true);
    if (open && haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    const done = (finished?: boolean) => {
      'worklet';
      // Once fully closed, the scrim and the action buttons go away.
      if (finished && !open) scheduleOnRN(setBloomed, false);
    };
    bloom.value = reduceMotion ? withTiming(open ? 1 : 0, { duration: 180 }, done) : withSpring(open ? 1 : 0, BLOOM, done);
  };

  // The centre button gives under a press.
  const centerScale = useSharedValue(1);

  const angles = useMemo(() => actionAngles(actions.length), [actions.length]);
  const actionCount = actions.length;
  const actionAt = (i: number, open: number) => {
    'worklet';
    const stagger = 0.1;
    const span = 1 - stagger * Math.max(actionCount - 1, 0);
    const t = clamp((open - i * stagger) / span, 0, 1);
    const a = angles[i] ?? -Math.PI / 2;
    return {
      t,
      x: centerX + Math.cos(a) * ACTION_DISTANCE * t,
      y: centerY + Math.sin(a) * ACTION_DISTANCE * t,
      r: lerp(9, ACTION, smoothstep(0, 0.35, t)),
    };
  };

  // Paths. In 'drop' the bar, the neck, the blob, the centre button and the bloom are one liquid in the bar's colour;
  // in 'cradle' the bar is notched and the discs sit in it.
  const barPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const notches: Notch[] = [];
    if (cradle) {
      const b = bubble.value;
      const moving: Notch = { x: b.x, depth: 0, half: CRADLE_DISC * 2.15 };
      const center: Notch = { x: centerX, depth: CRADLE_DISC + 2 + CRADLE_GAP - 6, half: (CRADLE_DISC + 2) * 2.15 };
      const clear = hasCenter ? smoothstep(moving.half + center.half - 12, moving.half + center.half + 8, Math.abs(b.x - centerX)) : 1;
      moving.depth = (CRADLE_DISC + CRADLE_GAP - 3) * lerp(0.45, 1, b.attached) * clear;
      if (hasCenter) {
        if (b.x < centerX) notches.push(moving, center);
        else notches.push(center, moving);
      } else notches.push(moving);
    }
    addBar(path, width, edge, stageHeight + 4, notches);
    return path;
  });
  const neckPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    if (!cradle) {
      const b = bubble.value;
      addNeck(path, edge, b.footX, b.x, b.y, b.rx, b.ry, b.attached);
    }
    return path;
  });
  const blobPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    if (!cradle) {
      const b = bubble.value;
      addEllipse(path, b.x, b.y, b.rx, b.ry);
    }
    return path;
  });
  const centerNeckPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    if (hasCenter && !cradle) addNeck(path, edge, centerX, centerX, centerY, CENTER_BLOB, CENTER_BLOB, 1);
    return path;
  });
  const centerBlobPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    if (hasCenter && !cradle) path.addCircle(centerX, centerY, CENTER_BLOB);
    return path;
  });
  const radius = cradle ? CRADLE_DISC + 2 : CENTER_BLOB;
  const bridgePath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const open = bloom.value;
    if (open <= 0.001) return path;
    for (let i = 0; i < actionCount; i += 1) {
      const a = actionAt(i, open);
      if (a.t <= 0) continue;
      addBridge(path, centerX, centerY, radius, a.x, a.y, a.r, 0.5, 2.1);
    }
    return path;
  });
  const actionPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const open = bloom.value;
    if (open <= 0.001) return path;
    for (let i = 0; i < actionCount; i += 1) {
      const a = actionAt(i, open);
      if (a.t <= 0) continue;
      path.addCircle(a.x, a.y, a.r);
    }
    return path;
  });
  // Every outline, for the hairline (drawn under the fills, so only the outer edge shows).
  const outline = useDerivedValue(() => {
    const path = Skia.Path.Make();
    path.addPath(barPath.value);
    path.addPath(neckPath.value);
    path.addPath(blobPath.value);
    path.addPath(centerNeckPath.value);
    path.addPath(centerBlobPath.value);
    if (!cradle) {
      path.addPath(bridgePath.value);
      path.addPath(actionPath.value);
    }
    return path;
  });

  const discX = useDerivedValue(() => bubble.value.x);
  const discY = useDerivedValue(() => bubble.value.y);
  const discRX = useDerivedValue(() => bubble.value.rx * ((cradle ? CRADLE_DISC : DISC) / (cradle ? CRADLE_DISC : BLOB)));
  const discRY = useDerivedValue(() => bubble.value.ry * ((cradle ? CRADLE_DISC : DISC) / (cradle ? CRADLE_DISC : BLOB)));
  const discPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    addEllipse(path, discX.value, discY.value, discRX.value, discRY.value);
    return path;
  });
  const discStart = useDerivedValue(() => vec(discX.value - discRX.value, discY.value - discRY.value));
  const discEnd = useDerivedValue(() => vec(discX.value + discRX.value, discY.value + discRY.value));

  // The GPU builds its programs the first time it meets each kind of shape: a squashed bubble (an ellipse, not a
  // circle) only appears in flight, so the first switch would stall a few frames. Drawing those shapes once,
  // invisibly, while the bar appears moves that cost out of the first tap.
  const [warming, setWarming] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setWarming(false), 1000);
    return () => clearTimeout(timer);
  }, []);
  const warmPaths = useMemo(() => {
    const ellipse = Skia.Path.Make();
    addEllipse(ellipse, 40, 40, BLOB * 1.16, BLOB / 1.16);
    const neck = Skia.Path.Make();
    addNeck(neck, 90, 40, 52, 40, BLOB * 1.1, BLOB / 1.1, 0.3);
    const bridge = Skia.Path.Make();
    addBridge(bridge, 40, 40, 30, 90, 30, 16, 0.5, 2.1);
    return { ellipse, neck, bridge };
  }, []);

  const onLayout = (event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    if (next > 0 && next !== width) setWidth(next);
  };

  const press = (k: number) => {
    const tab = tabs[k];
    if (!tab) return;
    if (k === clamped) {
      onReselect?.(k, tab.key);
      return;
    }
    if (haptics) Haptics.selectionAsync().catch(() => undefined);
    onChange(k, tab.key);
  };

  const pressCenter = () => {
    if (actions.length > 0) toggleBloom(!bloomed || bloom.value < 0.5);
    else centerAction?.onPress?.();
  };

  const scrimStyle = useAnimatedStyle(() => ({ opacity: bloom.value }));
  // The default plus turns into a close mark; a custom icon cross-fades into one.
  const custom = Boolean(centerAction?.icon);
  const plusStyle = useAnimatedStyle(() => ({
    opacity: custom ? 1 - smoothstep(0.1, 0.6, bloom.value) : 1,
    transform: [{ rotate: custom ? '0deg' : `${bloom.value * 45}deg` }, { scale: centerScale.value }],
  }));
  const closeStyle = useAnimatedStyle(() => ({
    opacity: smoothstep(0.3, 0.8, bloom.value),
    transform: [{ rotate: `${(1 - bloom.value) * -45}deg` }, { scale: centerScale.value }],
  }));
  const centerDiscR = useDerivedValue(() => (cradle ? CRADLE_DISC + 2 : CENTER_DISC) * centerScale.value);

  const gooColor = colors.bar;
  const centerFill = colors.center;

  return (
    <View
      pointerEvents="box-none"
      onLayout={onLayout}
      style={[styles.root, { height: bloomed ? Math.max(window.height, stageHeight) : stageHeight }, style]}>
      {bloomed ? (
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.scrim }, scrimStyle]}>
          <Pressable accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={() => toggleBloom(false)} />
        </Animated.View>
      ) : null}

      <View pointerEvents="box-none" style={[styles.stage, { height: stageHeight }]}>
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* The liquid, in the bar's colour, with one shadow for all of it. */}
          <Group
            layer={
              <Paint>
                <Shadow dx={0} dy={-1} blur={scheme === 'dark' ? 10 : 12} color={theme.shadow} />
              </Paint>
            }>
            <Path path={outline} style="stroke" strokeWidth={1.5} color={theme.hairline} />
            <Path path={barPath} color={gooColor} />
            <Path path={neckPath} color={gooColor} />
            <Path path={blobPath} color={gooColor} />
            <Path path={centerNeckPath} color={gooColor} />
            <Path path={centerBlobPath} color={gooColor} />
            {!cradle ? <Path path={bridgePath} color={gooColor} /> : null}
            {!cradle ? <Path path={actionPath} color={gooColor} /> : null}
          </Group>

          {/* In the cradle, the bloom is in the centre button's colour. */}
          {cradle && actionCount > 0 ? (
            <Group>
              <Path path={bridgePath} color={centerFill} />
              <Path path={actionPath} color={centerFill} />
            </Group>
          ) : null}

          {/* The centre button's disc. */}
          {hasCenter ? (
            <Group
              layer={
                <Paint>
                  <Shadow dx={0} dy={6} blur={14} color={withAlphaWorkletless(centerFill, scheme === 'dark' ? 0.25 : 0.35)} />
                </Paint>
              }>
              <Circle cx={centerX} cy={centerY} r={centerDiscR} color={centerFill} />
            </Group>
          ) : null}

          {/* The bubble's disc, with its own soft shadow (a glow in the dark). */}
          <Group
            layer={
              <Paint>
                <Shadow dx={0} dy={7} blur={16} color={withAlphaWorkletless(colors.bubble, scheme === 'dark' ? 0.45 : 0.32)} />
              </Paint>
            }>
            <Path path={discPath}>
              <LinearGradient start={discStart} end={discEnd} colors={[lighten(colors.bubble, 0.14), colors.bubble, darken(colors.bubble, 0.1)]} />
            </Path>
          </Group>
          {warming ? (
            <Group opacity={0.004}>
              <Group layer={<Paint><Shadow dx={0} dy={-1} blur={scheme === 'dark' ? 10 : 12} color={theme.shadow} /></Paint>}>
                <Path path={warmPaths.ellipse} style="stroke" strokeWidth={1.5} color={theme.hairline} />
                <Path path={warmPaths.ellipse} color={gooColor} />
                <Path path={warmPaths.neck} color={gooColor} />
                <Path path={warmPaths.bridge} color={gooColor} />
              </Group>
              <Group layer={<Paint><Shadow dx={0} dy={7} blur={16} color={withAlphaWorkletless(colors.bubble, 0.3)} /></Paint>}>
                <Path path={warmPaths.ellipse}>
                  <LinearGradient start={vec(0, 0)} end={vec(80, 80)} colors={[lighten(colors.bubble, 0.14), colors.bubble, darken(colors.bubble, 0.1)]} />
                </Path>
              </Group>
            </Group>
          ) : null}
        </Canvas>

        {/* The tabs: icons and labels in the bar, and what the bubble carries. */}
        <View
          accessibilityRole="tablist"
          pointerEvents="box-none"
          style={[styles.tabs, { top: edge, height: height + insets.bottom }]}>
          {tabs.map((tab, k) => (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: k === clamped }}
              accessibilityLabel={tabLabel(tab)}
              onPress={() => press(k)}
              style={[styles.tab, { left: tabX[k] - slotWidth / 2, width: slotWidth, height }, webPointer]}
            />
          ))}
        </View>

        {tabs.map((tab, k) => (
          <BarTab
            key={tab.key}
            tab={tab}
            index={k}
            x={tabX[k]}
            iconY={iconY}
            labelY={labelY}
            width={slotWidth}
            position={position}
            colors={colors}
            showLabels={showLabels}
          />
        ))}

        <BubbleIcons tabs={tabs} position={position} bubble={bubble} colors={colors} />

        {/* The bubble itself answers a tap too (press it again to reselect). */}
        <Pressable
          accessible={false}
          onPress={() => press(clamped)}
          style={[
            styles.hit,
            { left: (tabX[clamped] ?? 0) - BLOB, top: blobY - BLOB, width: BLOB * 2, height: BLOB * 2, borderRadius: BLOB },
            webPointer,
          ]}
        />

        {hasCenter && centerAction ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={centerAction.label}
              accessibilityState={actions.length > 0 ? { expanded: bloomed } : undefined}
              onPress={pressCenter}
              onPressIn={() => {
                centerScale.value = withSpring(0.92, { stiffness: 420, damping: 26 });
              }}
              onPressOut={() => {
                centerScale.value = withSpring(1, { stiffness: 320, damping: 16 });
              }}
              style={[
                styles.center,
                {
                  left: centerX - CENTER_BLOB,
                  top: centerY - CENTER_BLOB,
                  width: CENTER_BLOB * 2,
                  height: CENTER_BLOB * 2,
                  borderRadius: CENTER_BLOB,
                },
                webPointer,
              ]}>
              <Animated.View style={plusStyle}>
                {centerAction.icon ? (
                  centerAction.icon({ color: colors.onCenter, size: ICON, focused: true })
                ) : (
                  <PlusIcon color={colors.onCenter} size={ICON + 2} />
                )}
              </Animated.View>
              {custom ? (
                <Animated.View style={[styles.closeMark, closeStyle]}>
                  <View style={{ transform: [{ rotate: '45deg' }] }}>
                    <PlusIcon color={colors.onCenter} size={ICON + 2} />
                  </View>
                </Animated.View>
              ) : null}
            </Pressable>
            {actions.map((action, i) => (
              <ActionBubble
                key={action.key}
                action={action}
                index={i}
                bloom={bloom}
                place={actionAt}
                live={bloomed}
                cradle={cradle}
                colors={colors}
                onPress={() => {
                  toggleBloom(false);
                  action.onPress();
                }}
              />
            ))}
          </>
        ) : null}
      </View>
    </View>
  );
}

function tabLabel(tab: GooeyTab) {
  const base = tab.accessibilityLabel ?? tab.label;
  if (tab.badge === 'dot') return `${base}, new`;
  if (typeof tab.badge === 'number' && tab.badge > 0) return `${base}, ${tab.badge}`;
  return base;
}

/** A tab's icon and label in the bar. The icon goes up into the bubble when the tab is focused. */
function BarTab({
  tab,
  index,
  x,
  iconY,
  labelY,
  width,
  position,
  colors,
  showLabels,
}: {
  tab: GooeyTab;
  index: number;
  x: number;
  iconY: number;
  labelY: number;
  width: number;
  position: SharedValue<number>;
  colors: GooeyColors;
  showLabels: boolean;
}) {
  const iconStyle = useAnimatedStyle(() => {
    const away = clamp(Math.abs(position.value - index), 0, 1);
    const shown = smoothstep(0.2, 0.55, away);
    return { opacity: shown, transform: [{ translateY: (1 - shown) * -10 }, { scale: 0.85 + shown * 0.15 }] };
  });
  const focusLabel = useAnimatedStyle(() => ({ opacity: 1 - smoothstep(0.15, 0.5, Math.abs(position.value - index)) }));
  const idleLabel = useAnimatedStyle(() => ({ opacity: smoothstep(0.15, 0.5, Math.abs(position.value - index)) }));
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.barIcon, { left: x - ICON / 2, top: iconY - ICON / 2 }, iconStyle]}>
        {tab.icon({ color: colors.icon, size: ICON, focused: false })}
        <Badge badge={tab.badge} colors={colors} />
      </Animated.View>
      {showLabels ? (
        <View style={[styles.labelBox, { left: x - width / 2, top: labelY - 8, width }]}>
          <Animated.Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[styles.label, { color: colors.label }, idleLabel]}>
            {tab.label}
          </Animated.Text>
          <Animated.Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
            style={[styles.label, styles.labelFocused, { color: colors.bubble }, focusLabel]}>
            {tab.label}
          </Animated.Text>
        </View>
      ) : null}
    </View>
  );
}

/** The icons the bubble carries: the departing one until halfway, then the arriving one. */
function BubbleIcons({
  tabs,
  position,
  bubble,
  colors,
}: {
  tabs: GooeyTab[];
  position: SharedValue<number>;
  bubble: SharedValue<Bubble> | DerivedValue<Bubble>;
  colors: GooeyColors;
}) {
  const move = useAnimatedStyle(() => ({
    transform: [{ translateX: bubble.value.x - ICON / 2 }, { translateY: bubble.value.y - ICON / 2 }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.bubbleIcons, move]}>
      {tabs.map((tab, k) => (
        <BubbleIcon key={tab.key} tab={tab} index={k} position={position} colors={colors} />
      ))}
    </Animated.View>
  );
}

function BubbleIcon({ tab, index, position, colors }: { tab: GooeyTab; index: number; position: SharedValue<number>; colors: GooeyColors }) {
  const style = useAnimatedStyle(() => {
    const away = Math.abs(position.value - index);
    const shown = 1 - smoothstep(0.34, 0.5, away);
    return { opacity: shown, transform: [{ scale: 0.7 + shown * 0.3 }] };
  });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      {tab.icon({ color: colors.onBubble, size: ICON, focused: true })}
      <Badge badge={tab.badge} colors={colors} ring={colors.bubble} />
    </Animated.View>
  );
}

function Badge({ badge, colors, ring }: { badge: GooeyTab['badge']; colors: GooeyColors; ring?: string }) {
  const scale = useSharedValue(1);
  const last = useRef(badge);
  useEffect(() => {
    const before = typeof last.current === 'number' ? last.current : 0;
    const now = typeof badge === 'number' ? badge : 0;
    if (now > before || (badge === 'dot' && last.current !== 'dot')) {
      scale.value = withSequence(withSpring(1.35, { stiffness: 500, damping: 12 }), withSpring(1, { stiffness: 300, damping: 16 }));
    }
    last.current = badge;
  }, [badge, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  if (badge === undefined || badge === 0) return null;
  const border = ring ?? colors.bar;
  if (badge === 'dot') {
    return <Animated.View style={[styles.dot, { backgroundColor: colors.badge, borderColor: border }, style]} />;
  }
  const text = badge > 99 ? '99+' : String(badge);
  return (
    <Animated.View style={[styles.badge, { backgroundColor: colors.badge, borderColor: border }, style]}>
      <Text style={[styles.badgeText, { color: colors.onBadge }]}>{text}</Text>
    </Animated.View>
  );
}

/** An action that buds off the centre button. Its icon and label appear once it has broken free. */
function ActionBubble({
  action,
  index,
  bloom,
  place,
  live,
  cradle,
  colors,
  onPress,
}: {
  action: GooeyAction;
  index: number;
  bloom: SharedValue<number>;
  place: (i: number, open: number) => { t: number; x: number; y: number; r: number };
  live: boolean;
  cradle: boolean;
  colors: GooeyColors;
  onPress: () => void;
}) {
  const iconStyle = useAnimatedStyle(() => {
    const a = place(index, bloom.value);
    return {
      opacity: smoothstep(0.45, 0.8, a.t),
      transform: [{ translateX: a.x - 11 }, { translateY: a.y - 11 }, { scale: 0.6 + 0.4 * smoothstep(0.4, 0.9, a.t) }],
    };
  });
  const labelStyle = useAnimatedStyle(() => {
    const a = place(index, bloom.value);
    const shown = smoothstep(0.78, 1, a.t);
    return { opacity: shown, transform: [{ translateX: a.x - 60 }, { translateY: a.y - ACTION - 30 + (1 - shown) * 6 }] };
  });
  const hitStyle = useAnimatedStyle(() => {
    const a = place(index, 1);
    return { transform: [{ translateX: a.x - ACTION }, { translateY: a.y - ACTION }] };
  });
  return (
    <>
      <Animated.View pointerEvents="none" style={[styles.actionIcon, iconStyle]}>
        {action.icon({ color: cradle ? colors.onCenter : colors.bubble, size: 22, focused: true })}
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.actionLabelBox, labelStyle]}>
        <View style={[styles.actionLabel, { backgroundColor: colors.bar }]}>
          <Text numberOfLines={1} style={[styles.actionLabelText, { color: cradle ? colors.center : colors.bubble }]}>
            {action.label}
          </Text>
        </View>
      </Animated.View>
      {live ? (
        <Animated.View style={[styles.actionHit, hitStyle]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={onPress}
            style={[StyleSheet.absoluteFill, { borderRadius: ACTION }, webPointer]}
          />
        </Animated.View>
      ) : null}
    </>
  );
}

function actionAngles(count: number): number[] {
  const deg = (d: number) => (d * Math.PI) / 180;
  switch (count) {
    case 1:
      return [deg(-90)];
    case 2:
      return [deg(-125), deg(-55)];
    case 3:
      return [deg(-148), deg(-90), deg(-32)];
    default:
      return Array.from({ length: count }, (_, i) => deg(-160 + (140 * i) / Math.max(count - 1, 1)));
  }
}

function parseHex(color: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (!match) return null;
  const value = parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function withAlphaWorkletless(color: string, alpha: number) {
  const rgb = parseHex(color);
  return rgb ? `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})` : color;
}

function mix(color: string, target: number, amount: number) {
  const rgb = parseHex(color);
  if (!rgb) return color;
  const out = rgb.map((c) => Math.round(c + (target - c) * amount));
  return `rgb(${out[0]}, ${out[1]}, ${out[2]})`;
}

function lighten(color: string, amount: number) {
  return mix(color, 255, amount);
}

function darken(color: string, amount: number) {
  return mix(color, 0, amount);
}

const styles = StyleSheet.create({
  root: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  stage: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  tabs: { position: 'absolute', left: 0, right: 0 },
  tab: { position: 'absolute', top: 0 },
  hit: { position: 'absolute' },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  closeMark: { position: 'absolute' },
  barIcon: { position: 'absolute', width: ICON, height: ICON },
  labelBox: { position: 'absolute', height: 16 },
  label: {
    position: 'absolute',
    left: 2,
    right: 2,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
    userSelect: 'none',
  },
  labelFocused: { fontWeight: '700' },
  bubbleIcons: { position: 'absolute', left: 0, top: 0, width: ICON, height: ICON },
  badge: {
    position: 'absolute',
    top: -7,
    left: 14,
    minWidth: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10.5, fontWeight: '800', fontVariant: ['tabular-nums'] },
  dot: { position: 'absolute', top: -3, left: 17, width: 11, height: 11, borderRadius: 6, borderWidth: 2 },
  actionIcon: { position: 'absolute', left: 0, top: 0, width: 22, height: 22 },
  actionLabelBox: { position: 'absolute', left: 0, top: 0, width: 120, alignItems: 'center' },
  actionLabel: {
    paddingHorizontal: 10,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  actionLabelText: { fontSize: 12, fontWeight: '700' },
  actionHit: { position: 'absolute', left: 0, top: 0, width: ACTION * 2, height: ACTION * 2 },
});
