import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedReaction,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useScheme } from '../../lib/use-scheme';
import { clamp } from './layout';
import { FilmstripStrip } from './strip';
import { SwapText } from './swap-text';
import type { FilmItem, FilmstripHandle, FilmstripProps } from './types';
import { FilmstripViewer } from './viewer';

export const FILMSTRIP_THEMES = {
  dark: { page: '#050506', counter: 'rgba(0, 0, 0, 0.45)', counterBorder: 'rgba(255, 255, 255, 0.14)', counterText: '#FFFFFF' },
  light: { page: '#F7F7F5', counter: 'rgba(255, 255, 255, 0.85)', counterBorder: 'rgba(0, 0, 0, 0.08)', counterText: '#111111' },
} as const;

/**
 * A photo viewer with a filmstrip: the big picture on top, and along the bottom the current item open
 * to its true shape between slivers of the others. One float index drives both, so scrubbing the
 * strip pages the viewer frame by frame and swiping the viewer slides the strip.
 */
export function Filmstrip<T extends FilmItem>({
  data,
  renderImage,
  index,
  defaultIndex = 0,
  onIndexChange,
  position: positionProp,
  thumbHeight = 52,
  sliverWidth = 14,
  gap = 3,
  showCounter = true,
  renderCaption,
  viewer = true,
  onRequestClose,
  onEndReached,
  endThreshold = 4,
  scheme: schemeProp,
  haptics = true,
  style,
  ref,
}: FilmstripProps<T> & { ref?: Ref<FilmstripHandle> }) {
  const scheme = useScheme(schemeProp);
  const theme = FILMSTRIP_THEMES[scheme];
  const reduceMotion = useReducedMotion();
  const n = data.length;
  const last = Math.max(0, n - 1);
  const start = clamp(index ?? defaultIndex, 0, last);
  const own = useSharedValue(start);
  const position = positionProp ?? own;

  // The item under the centre, live (counter, caption, loading more).
  const [live, setLive] = useState(start);
  useAnimatedReaction(
    () => Math.round(position.value),
    (now, before) => {
      if (now !== before) scheduleOnRN(setLive, Math.min(Math.max(now, 0), last));
    },
    [last],
  );

  const settledAt = useRef(start);
  const settle = useCallback(
    (i: number) => {
      if (i === settledAt.current) return;
      settledAt.current = i;
      onIndexChange?.(i);
    },
    [onIndexChange],
  );

  const goTo = useCallback(
    (i: number, animated = true) => {
      const target = clamp(i, 0, last);
      cancelAnimation(position);
      if (!animated) {
        position.value = target;
        settle(target);
        return;
      }
      const done = (finished?: boolean) => {
        'worklet';
        if (finished) scheduleOnRN(settle, target);
      };
      position.value = reduceMotion
        ? withTiming(target, { duration: 160 }, done)
        : withSpring(target, { stiffness: 260, damping: 30, mass: 1 }, done);
    },
    [last, position, reduceMotion, settle],
  );

  useImperativeHandle(ref, () => ({ scrollToIndex: goTo }), [goTo]);

  // Controlled: follow `index` when it changes from outside.
  useEffect(() => {
    if (index === undefined || index === settledAt.current) return;
    goTo(index);
  }, [index, goTo]);

  // New items appended (infinite loading) keep the position; a shorter list keeps it in range.
  useEffect(() => {
    if (position.value > last) position.value = last;
  }, [last, position]);

  // Loading more, once per length.
  const askedAt = useRef(-1);
  useEffect(() => {
    if (!onEndReached || n === 0) return;
    if (live >= n - 1 - endThreshold && askedAt.current !== n) {
      askedAt.current = n;
      onEndReached();
    }
  }, [live, n, endThreshold, onEndReached]);

  // The counter is read when it changes (screen readers).
  const announced = useRef(live);
  useEffect(() => {
    if (!showCounter || live === announced.current) return;
    announced.current = live;
    const timer = setTimeout(() => AccessibilityInfo.announceForAccessibility(`${live + 1} of ${n}`), 350);
    return () => clearTimeout(timer);
  }, [live, n, showCounter]);

  const viewerOptions = typeof viewer === 'object' ? viewer : {};
  const item = data[live];

  return (
    <View style={[styles.root, { backgroundColor: theme.page }, style]}>
      {viewer !== false ? (
        <View style={styles.viewerArea}>
          <FilmstripViewer
            data={data}
            position={position}
            renderImage={renderImage}
            parallax={viewerOptions.parallax}
            zoom={viewerOptions.zoom}
            fit={viewerOptions.fit}
            onIndexChange={settle}
            onRequestClose={onRequestClose}
            haptics={haptics}
          />
          {showCounter && n > 0 ? (
            <View pointerEvents="none" style={styles.counterSlot}>
              <View style={[styles.counter, { backgroundColor: theme.counter, borderColor: theme.counterBorder }]}>
                <SwapText text={`${live + 1} / ${n}`} style={[styles.counterText, { color: theme.counterText }]} />
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
      {renderCaption && item ? <Animated.View style={styles.caption}>{renderCaption(item, live)}</Animated.View> : null}
      {n > 1 ? (
        <FilmstripStrip
          data={data}
          position={position}
          renderImage={renderImage}
          thumbHeight={thumbHeight}
          sliverWidth={sliverWidth}
          gap={gap}
          onIndexChange={settle}
          scheme={scheme}
          haptics={haptics}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  viewerArea: { flex: 1 },
  counterSlot: { position: 'absolute', left: 0, right: 0, bottom: 12, alignItems: 'center' },
  counter: { height: 26, borderRadius: 13, paddingHorizontal: 11, justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  counterText: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  caption: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 },
});
