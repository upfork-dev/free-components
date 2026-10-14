import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Easing, cancelAnimation, useDerivedValue, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { FocusScrollHandle } from './focus-scroll';

export type AutoAdvanceOptions = {
  /** How long each item stays current, in ms. */
  durations: readonly number[];
  /** Whether the timeline is running. */
  playing: boolean;
  /** Whether the list follows the current item. Turn it off while the person browses; the timeline keeps going. */
  following?: boolean;
  loop?: boolean;
  startIndex?: number;
  /** Where in the first item the timeline starts, from 0 to 1. */
  startProgress?: number;
  onEnd?: () => void;
};

export type AutoAdvance = {
  /** The current item. */
  index: number;
  /** How far through the current item, from 0 to 1: feed it to a karaoke fill. */
  progress: SharedValue<number>;
  /** Time since the start, in ms. */
  elapsed: SharedValue<number>;
  /** The whole timeline, in ms. */
  total: number;
  /** Jumps to an item and starts it from its beginning. */
  seek: (index: number) => void;
};

/**
 * Steps a Focus Scroll item by item on a timeline (lyrics, a guided reading, a slideshow). The list follows the
 * current item while `following` is on.
 */
export function useAutoAdvance(
  ref: RefObject<FocusScrollHandle | null>,
  { durations, playing, following = true, loop = false, startIndex = 0, startProgress = 0, onEnd }: AutoAdvanceOptions,
): AutoAdvance {
  const count = durations.length;
  const first = Math.min(Math.max(startIndex, 0), Math.max(count - 1, 0));
  const [index, setIndex] = useState(first);
  // Bumped on every jump, so seeking to the item already current restarts it too.
  const [epoch, setEpoch] = useState(0);
  const current = useRef(first);
  const jumps = useRef(0);
  const progress = useSharedValue(startProgress);
  // Where the current item's progress resumes from. Kept on this side: a shared value read here can be a frame late.
  const from = useRef(startProgress);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  const starts = useMemo(() => {
    const out: number[] = [];
    let at = 0;
    for (const duration of durations) {
      out.push(at);
      at += duration;
    }
    return { out, total: at };
  }, [durations]);

  const startsOut = starts.out;
  const elapsed = useDerivedValue(() => (startsOut[index] ?? 0) + progress.value * (durations[index] ?? 0));

  const goTo = useCallback(
    (next: number) => {
      current.current = next;
      jumps.current += 1;
      from.current = 0;
      progress.value = 0;
      setIndex(next);
      setEpoch((value) => value + 1);
    },
    [progress],
  );

  const advance = useCallback(() => {
    const next = current.current + 1;
    if (next < count) goTo(next);
    else if (loop) goTo(0);
    else onEndRef.current?.();
  }, [count, loop, goTo]);

  useEffect(() => {
    if (!playing || count === 0) return;
    const mine = jumps.current;
    const remaining = Math.max(0, (1 - from.current) * (durations[index] ?? 0));
    progress.value = withTiming(1, { duration: remaining, easing: Easing.linear }, (finished) => {
      if (finished) scheduleOnRN(advance);
    });
    return () => {
      cancelAnimation(progress);
      // Paused (not a jump): remember where. A jump has already reset the start to 0.
      if (jumps.current === mine) from.current = progress.value;
    };
  }, [playing, index, epoch, count, durations, advance, progress]);

  useEffect(() => {
    if (following) ref.current?.scrollToIndex(index, { animated: true });
  }, [index, following, ref]);

  const seek = useCallback(
    (next: number) => {
      cancelAnimation(progress);
      goTo(Math.min(Math.max(next, 0), Math.max(count - 1, 0)));
    },
    [count, goTo, progress],
  );

  return { index, progress, elapsed, total: starts.total, seek };
}
