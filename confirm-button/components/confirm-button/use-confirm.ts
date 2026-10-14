import { useCallback, useEffect, useRef, useState } from 'react';
import { ReduceMotion, cancelAnimation, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const linear = (t: number) => {
  'worklet';
  return t < 0 ? 0 : t > 1 ? 1 : t;
};

export type ConfirmState = 'idle' | 'armed' | 'busy' | 'done' | 'error';

export type UseConfirmOptions = {
  onConfirm: () => void | Promise<unknown>;
  onArm?: () => void;
  onCancel?: () => void;
  /** ms before an armed button disarms by itself; 0 = never. */
  armTimeout?: number;
  /** ms in done before going back to idle. */
  resetAfter?: number;
  persistDone?: boolean;
  /** ms in error before going back to idle. */
  errorFor?: number;
  /** Start armed (for a poster): the countdown starts on the first interaction. */
  defaultArmed?: boolean;
};

export type UseConfirm = {
  state: ConfirmState;
  /** The error `onConfirm` threw or rejected with, while in error. */
  error: unknown;
  arm: () => void;
  cancel: () => void;
  /** Runs `onConfirm`: busy until its promise settles, then done or error. */
  confirm: () => void;
  /** The countdown: 1 → 0 while armed. */
  countdown: ReturnType<typeof useSharedValue<number>>;
  /** Hold the countdown while the pill is pressed. */
  pause: () => void;
  resume: () => void;
  /** Back to idle now. */
  reset: () => void;
};

/**
 * The button's state machine without its look: idle → armed → busy → done (or error) → idle, a countdown that
 * disarms an armed button, timers that never fire after unmount. For your own visuals.
 */
export function useConfirm({
  onConfirm,
  onArm,
  onCancel,
  armTimeout = 4000,
  resetAfter = 1400,
  persistDone = false,
  errorFor = 2400,
  defaultArmed = false,
}: UseConfirmOptions): UseConfirm {
  const [state, setState] = useState<ConfirmState>(defaultArmed ? 'armed' : 'idle');
  const [error, setError] = useState<unknown>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const countdown = useSharedValue(1);
  // A poster starts armed and waits: its countdown starts on the first interaction.
  const waiting = useRef(defaultArmed);
  const left = useRef(armTimeout);

  const disarm = useCallback(() => {
    if (!mounted.current || stateRef.current !== 'armed') return;
    setState('idle');
    onCancel?.();
  }, [onCancel]);

  const run = useCallback(
    (ms: number) => {
      if (armTimeout <= 0) return;
      cancelAnimation(countdown);
      const from = countdown.value;
      left.current = ms;
      // A timer, not motion: with reduce motion on, Reanimated would otherwise finish it at once (and disarm).
      countdown.value = withTiming(0, { duration: Math.max(1, ms * from), easing: linear, reduceMotion: ReduceMotion.Never }, (finished) => {
        if (finished) scheduleOnRN(disarm);
      });
    },
    [armTimeout, countdown, disarm],
  );

  const arm = useCallback(() => {
    if (stateRef.current !== 'idle') return;
    setState('armed');
    onArm?.();
    waiting.current = false;
    countdown.value = 1;
    run(armTimeout);
  }, [armTimeout, countdown, onArm, run]);

  const cancel = useCallback(() => {
    if (stateRef.current !== 'armed') return;
    cancelAnimation(countdown);
    setState('idle');
    onCancel?.();
  }, [countdown, onCancel]);

  const pause = useCallback(() => {
    if (stateRef.current !== 'armed') return;
    if (waiting.current) {
      // The first touch on a poster that was armed from the start: from now on the countdown runs.
      waiting.current = false;
      return;
    }
    cancelAnimation(countdown);
  }, [countdown]);

  const resume = useCallback(() => {
    if (stateRef.current !== 'armed' || waiting.current) return;
    run(armTimeout);
  }, [armTimeout, run]);

  const fail = useCallback((e: unknown) => {
    if (!mounted.current) return;
    setError(e);
    setState('error');
  }, []);

  const confirm = useCallback(() => {
    const now = stateRef.current;
    if (now !== 'armed' && now !== 'idle') return;
    cancelAnimation(countdown);
    let result: void | Promise<unknown>;
    try {
      result = onConfirm();
    } catch (e) {
      fail(e);
      return;
    }
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      setState('busy');
      (result as Promise<unknown>).then(
        () => mounted.current && setState('done'),
        (e) => fail(e),
      );
    } else {
      setState('done');
    }
  }, [countdown, fail, onConfirm]);

  const reset = useCallback(() => {
    cancelAnimation(countdown);
    countdown.value = 1;
    setError(null);
    setState('idle');
  }, [countdown]);

  // Done and error go back to idle by themselves.
  useEffect(() => {
    if (state === 'done' && !persistDone) {
      const timer = setTimeout(() => mounted.current && reset(), resetAfter);
      return () => clearTimeout(timer);
    }
    if (state === 'error') {
      const timer = setTimeout(() => mounted.current && reset(), errorFor);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [state, persistDone, resetAfter, errorFor, reset]);

  // A poster that starts armed shows a full ring until someone touches it.
  useEffect(() => {
    if (defaultArmed) countdown.value = 1;
    // Once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { state, error, arm, cancel, confirm, countdown, pause, resume, reset };
}
