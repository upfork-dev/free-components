import * as Haptics from 'expo-haptics';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  LinearTransition,
  interpolateColor,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { useScheme, type Scheme } from '../../lib/use-scheme';
import { CHIP_THEMES, Chip, SIZES, type CheckPlacement, type ChipSize, type ChipVariant } from './chip';

export type ChipOption<V extends string | number = string> = {
  value: V;
  label: string;
  icon?: (props: { color: string; size: number }) => ReactNode;
  emoji?: string;
  /** This option's own colour (its fill and check). */
  color?: string;
  /** A number after the label ("Shoes 128"). */
  count?: number;
  disabled?: boolean;
  accessibilityHint?: string;
};

export type ChoiceChipsProps<V extends string | number = string> = {
  options: ChipOption<V>[];
  /** 'multiple' (checkboxes) or 'single' (radio buttons). */
  mode?: 'multiple' | 'single';
  /** Controlled: the selected values. */
  value?: V[];
  defaultValue?: V[];
  onChange?: (value: V[], changed: { value: V; selected: boolean }) => void;
  max?: number;
  min?: number;
  /** A tap was refused because of `max` or `min`. */
  onLimit?: (kind: 'max' | 'min') => void;
  /** 'wrap' flows onto lines, 'scroll' is one row that scrolls, 'grid' is equal columns. */
  layout?: 'wrap' | 'scroll' | 'grid';
  columns?: number;
  variant?: ChipVariant;
  size?: ChipSize;
  checkPlacement?: CheckPlacement;
  accent?: string;
  gap?: number;
  /** A line under the group (for instance "Pick up to 5"); it pulses when a tap is refused. */
  helperText?: string;
  /** A field that filters the options; selected ones stay pinned above. */
  searchable?: boolean | { placeholder?: string };
  /** The group's question, for screen readers. */
  accessibilityLabel: string;
  scheme?: Scheme;
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;
};

const REFLOW = LinearTransition.springify().stiffness(260).damping(30).mass(1);
const REFLOW_CALM = LinearTransition.duration(160);

/**
 * A group of choice chips: an interest picker, a filter, a single choice. Chips reflow like objects sliding as they
 * grow their checks, and a tap past the limit gets a polite refusal.
 */
export function ChoiceChips<V extends string | number = string>({
  options,
  mode = 'multiple',
  value: controlled,
  defaultValue = [],
  onChange,
  max,
  min = 0,
  onLimit,
  layout = 'wrap',
  columns = 3,
  variant = 'tinted',
  size = 'md',
  checkPlacement = 'trailing',
  accent = '#FF6B3D',
  gap = 10,
  helperText,
  searchable = false,
  accessibilityLabel,
  scheme: schemeProp,
  haptics = true,
  style,
}: ChoiceChipsProps<V>) {
  const scheme = useScheme(schemeProp);
  const theme = CHIP_THEMES[scheme];
  const reduceMotion = useReducedMotion();
  const [own, setOwn] = useState<V[]>(defaultValue);
  const value = controlled ?? own;
  const [shakes, setShakes] = useState<Record<string, number>>({});
  const [query, setQuery] = useState('');
  const pulse = useSharedValue(0);
  const single = mode === 'single';
  const role = single ? 'radio' : 'checkbox';
  const reflow = reduceMotion ? REFLOW_CALM : REFLOW;

  const refuse = (option: ChipOption<V>, kind?: 'max' | 'min') => {
    setShakes((current) => ({ ...current, [String(option.value)]: (current[String(option.value)] ?? 0) + 1 }));
    if (haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    if (kind) {
      onLimit?.(kind);
      pulse.value = withSequence(withTiming(1, { duration: 160 }), withTiming(0, { duration: 520 }));
      AccessibilityInfo.announceForAccessibility(
        kind === 'max' ? `You can pick up to ${max}` : `Pick at least ${min}`,
      );
    }
  };

  const toggle = (option: ChipOption<V>) => {
    if (option.disabled) {
      refuse(option);
      return;
    }
    const selected = value.includes(option.value);
    let next: V[];
    if (single) {
      if (selected) {
        if (min > 0) {
          refuse(option, 'min');
          return;
        }
        next = [];
      } else next = [option.value];
    } else if (selected) {
      if (value.length - 1 < min) {
        refuse(option, 'min');
        return;
      }
      next = value.filter((v) => v !== option.value);
    } else {
      if (max !== undefined && value.length >= max) {
        refuse(option, 'max');
        return;
      }
      next = [...value, option.value];
    }
    if (haptics) Haptics.selectionAsync().catch(() => undefined);
    if (controlled === undefined) setOwn(next);
    onChange?.(next, { value: option.value, selected: !selected });
  };

  const filter = query.trim().toLowerCase();
  const shown = useMemo(
    () => (filter ? options.filter((o) => o.label.toLowerCase().includes(filter)) : options),
    [options, filter],
  );
  const pinned = searchable ? options.filter((o) => value.includes(o.value)) : [];
  const browse = searchable ? shown.filter((o) => !value.includes(o.value)) : shown;

  const renderChip = (option: ChipOption<V>, extra?: { block?: boolean; style?: StyleProp<ViewStyle> }) => {
    const start = filter ? option.label.toLowerCase().indexOf(filter) : -1;
    return (
      <Chip
        key={String(option.value)}
        label={option.label}
        selected={value.includes(option.value)}
        onPress={() => toggle(option)}
        disabled={option.disabled}
        icon={option.icon}
        emoji={option.emoji}
        count={option.count}
        accent={option.color ?? accent}
        variant={variant}
        size={size}
        checkPlacement={checkPlacement}
        shake={shakes[String(option.value)] ?? 0}
        highlight={start >= 0 ? [start, start + filter.length] : null}
        role={role}
        accessibilityHint={option.accessibilityHint}
        block={extra?.block}
        style={extra?.style}
        scheme={scheme}
      />
    );
  };

  const helperStyle = useAnimatedStyle(() => ({
    color: interpolateColor(pulse.value, [0, 1], [theme.muted, accent]),
    transform: [{ scale: 1 + pulse.value * 0.04 }],
  }));

  const placeholder = typeof searchable === 'object' ? searchable.placeholder : undefined;

  return (
    <View style={style} accessibilityRole={single ? 'radiogroup' : 'list'} accessibilityLabel={accessibilityLabel}>
      {searchable ? (
        <View style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Circle cx={10.8} cy={10.8} r={6.3} stroke={theme.muted} strokeWidth={2} />
            <Path d="m15.6 15.6 4.4 4.4" stroke={theme.muted} strokeWidth={2} strokeLinecap="round" />
          </Svg>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={placeholder ?? 'Search'}
            placeholderTextColor={theme.muted}
            accessibilityLabel={placeholder ?? 'Search'}
            style={[styles.searchInput, { color: theme.label }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as ViewStyle) : null]}
          />
        </View>
      ) : null}

      {pinned.length > 0 ? (
        <Animated.View layout={reflow} style={[styles.wrap, { gap, marginBottom: gap + 4 }]}>
          {pinned.map((option) => (
            <Animated.View key={String(option.value)} layout={reflow}>
              {renderChip(option)}
            </Animated.View>
          ))}
        </Animated.View>
      ) : null}

      {layout === 'scroll' ? (
        <ScrollRow gap={gap}>{browse.map((option) => renderChip(option))}</ScrollRow>
      ) : layout === 'grid' ? (
        <View style={{ gap }}>
          {rows(browse, columns).map((row, r) => (
            <View key={r} style={[styles.row, { gap }]}>
              {row.map((option) => renderChip(option, { block: true }))}
              {Array.from({ length: columns - row.length }, (_, i) => (
                <View key={`blank${i}`} style={styles.blank} />
              ))}
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.wrap, { gap }]}>
          {browse.map((option) => (
            <Animated.View key={String(option.value)} layout={reflow}>
              {renderChip(option)}
            </Animated.View>
          ))}
        </View>
      )}

      {searchable && browse.length === 0 && filter ? (
        <Text style={[styles.empty, { color: theme.muted }]}>No match for “{query}”</Text>
      ) : null}

      {helperText ? (
        <Animated.Text accessibilityLiveRegion="polite" style={[styles.helper, { fontSize: SIZES[size].font - 2 }, helperStyle]}>
          {helperText}
        </Animated.Text>
      ) : null}
    </View>
  );
}

/** `ChoiceChips.Counter`: the same as `ChipCounter`. */
ChoiceChips.Counter = ChipCounter;

/** One scrolling row whose chips fade as they near its edges (by their own opacity: no painted fade). */
function ScrollRow({ gap, children }: { gap: number; children: ReactNode[] }) {
  const offset = useSharedValue(0);
  const width = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      offset.value = event.contentOffset.x;
    },
  });
  return (
    <Animated.ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
      onLayout={(event: LayoutChangeEvent) => {
        width.value = event.nativeEvent.layout.width;
      }}
      contentContainerStyle={[styles.scroll, { gap }]}>
      {children.map((child, i) => (
        <EdgeFade key={i} offset={offset} width={width}>
          {child}
        </EdgeFade>
      ))}
    </Animated.ScrollView>
  );
}

function EdgeFade({ offset, width, children }: { offset: SharedValue<number>; width: SharedValue<number>; children: ReactNode }) {
  const x = useSharedValue(0);
  const w = useSharedValue(0);
  const style = useAnimatedStyle(() => {
    if (width.value === 0) return { opacity: 1 };
    const left = x.value - offset.value;
    const right = left + w.value;
    const fade = 28;
    const a = Math.min(1, Math.max(0, (right - 4) / fade));
    const b = Math.min(1, Math.max(0, (width.value - left - 4) / fade));
    return { opacity: Math.min(a, b) };
  });
  return (
    <Animated.View
      style={style}
      onLayout={(event: LayoutChangeEvent) => {
        x.value = event.nativeEvent.layout.x;
        w.value = event.nativeEvent.layout.width;
      }}>
      {children}
    </Animated.View>
  );
}

function rows<T>(items: T[], columns: number) {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += columns) out.push(items.slice(i, i + columns));
  return out;
}

/** "3 of 5", the count rolling to its new number. */
export function ChipCounter({
  count,
  max,
  color,
  accent = '#FF6B3D',
}: {
  count: number;
  max?: number;
  color: string;
  accent?: string;
}) {
  const last = useRef(count);
  const direction = count >= last.current ? 1 : -1;
  last.current = count;
  return (
    <View style={styles.counter} accessible accessibilityLabel={max ? `${count} of ${max} picked` : `${count} picked`}>
      <View style={styles.counterDigits}>
        <Animated.Text
          key={count}
          entering={direction > 0 ? FromBelow : FromAbove}
          style={[styles.counterText, { color: count > 0 ? accent : color }]}>
          {count}
        </Animated.Text>
      </View>
      {max ? <Text style={[styles.counterText, { color }]}> of {max}</Text> : null}
    </View>
  );
}

function FromBelow() {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ translateY: 10 }] },
    animations: { opacity: withTiming(1, { duration: 180 }), transform: [{ translateY: withTiming(0, { duration: 220 }) }] },
  };
}

function FromAbove() {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ translateY: -10 }] },
    animations: { opacity: withTiming(1, { duration: 180 }), transform: [{ translateY: withTiming(0, { duration: 220 }) }] },
  };
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  row: { flexDirection: 'row' },
  blank: { flex: 1 },
  scroll: { paddingVertical: 2, paddingHorizontal: 2 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  empty: { fontSize: 14, marginTop: 4 },
  helper: { marginTop: 12, fontWeight: '600', alignSelf: 'flex-start' },
  counter: { flexDirection: 'row', alignItems: 'center' },
  counterDigits: { minWidth: 10, alignItems: 'flex-end', overflow: 'hidden' },
  counterText: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
