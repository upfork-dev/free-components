"use client";

import { useEffect, useRef, type RefObject } from "react";
import { animate, motion, useMotionValue, type AnimationPlaybackControls } from "motion/react";
import { useDemo } from "./use-demo-store";
import { TOUR, TOUR_LOOP_PAUSE_MS, TOUR_RESUME_IDLE_MS, TOUR_START_IDLE_MS, type TourStep } from "./tour-script";

const EASE = [0.45, 0, 0.2, 1] as const;
const CANCELLED = Symbol("tour cancelled");

/**
 * The autoplay tour: a white system-style cursor that plays the product by itself once the demo has been in
 * view and idle for a few seconds (medium screens and up, with a mouse, without reduced motion). Any real
 * interaction inside the demo stops it at once and keeps the state it reached; it may come back after a
 * longer idle spell.
 */
export function GhostTour({
  windowRef,
  publish,
  enabled,
}: {
  windowRef: RefObject<HTMLDivElement | null>;
  publish: () => void;
  enabled: boolean;
}) {
  const { state, dispatch } = useDemo();
  const cursorRef = useRef<HTMLDivElement>(null);
  const rippleRef = useRef<HTMLSpanElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const live = useRef({ state, dispatch, publish });

  useEffect(() => {
    live.current = { state, dispatch, publish };
  }, [state, dispatch, publish]);

  useEffect(() => {
    const win = windowRef.current;
    const cursor = cursorRef.current;
    const ripple = rippleRef.current;
    if (!enabled || !win || !cursor || !ripple) return;

    const fits = matchMedia("(min-width: 768px) and (hover: hover) and (pointer: fine)");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let inView = false;
    let running = false;
    let token = 0;
    let idle: ReturnType<typeof setTimeout> | undefined;
    let current: AnimationPlaybackControls | null = null;

    const allowed = () => fits.matches && !reduced.matches && inView && !document.hidden;
    const schedule = (ms: number) => {
      clearTimeout(idle);
      if (allowed()) idle = setTimeout(() => !running && allowed() && run(), ms);
    };
    const halt = () => {
      token++;
      running = false;
      current?.stop();
      delete cursor.dataset.on;
    };
    const guard = (mine: number) => {
      if (mine !== token) throw CANCELLED;
    };
    const sleep = (ms: number, mine: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, ms)).then(() => guard(mine));

    /** A target's center (or a point along it) in the window's own coordinates. */
    const pointOf = (id: string, fx = 0.5) => {
      const el = [...win.querySelectorAll<HTMLElement>(`[data-tour-id="${id}"]`)].find((node) => {
        const box = node.getBoundingClientRect();
        return box.width > 0 && box.height > 0;
      });
      if (!el) return null;
      const box = el.getBoundingClientRect();
      const frame = win.getBoundingClientRect();
      const scale = frame.width / win.offsetWidth || 1; // the window may still be tilting into place
      return { x: (box.left - frame.left + box.width * fx) / scale, y: (box.top - frame.top + box.height / 2) / scale };
    };

    const moveTo = async (point: { x: number; y: number }, mine: number) => {
      const distance = Math.hypot(point.x - x.get(), point.y - y.get());
      const duration = Math.min(1.1, 0.35 + distance / 900);
      current = animate(x, point.x, { duration, ease: EASE });
      animate(y, point.y, { duration, ease: EASE });
      await current;
      guard(mine);
    };
    const click = async (mine: number) => {
      animate(ripple, { scale: [0.2, 2.4], opacity: [0.55, 0] }, { duration: 0.5, ease: "easeOut" });
      await animate(cursor, { scale: [1, 0.86, 1] }, { duration: 0.22 });
      guard(mine);
    };

    const perform = async (step: TourStep, mine: number) => {
      const { dispatch: send } = live.current;
      if (step.kind === "wait") return sleep(step.ms, mine);
      if (step.kind === "reset") return send({ type: "reset" });
      if (step.kind === "waitForLive") {
        for (let waited = 0; waited < 4000 && live.current.state.publishState !== "live"; waited += 100) await sleep(100, mine);
        return;
      }
      const target = pointOf(step.target, step.kind === "drag" ? (step.from - step.min) / (step.max - step.min) : 0.5);
      if (!target) return;
      await moveTo(target, mine);
      await sleep(140, mine);
      if (step.kind === "click") {
        await click(mine);
        send({ type: "set", patch: step.patch, record: false });
      } else if (step.kind === "publish") {
        await click(mine);
        live.current.publish();
      } else if (step.kind === "drag") {
        await click(mine);
        const end = pointOf(step.target, (step.to - step.min) / (step.max - step.min));
        if (!end) return;
        const startX = target.x;
        current = animate(0, 1, {
          duration: 1.3,
          ease: EASE,
          onUpdate: (t) => {
            x.set(startX + (end.x - startX) * t);
            send({ type: "set", patch: { [step.field]: Math.round(step.from + (step.to - step.from) * t) }, record: false });
          },
        });
        await current;
        guard(mine);
      }
      await sleep(380, mine);
    };

    const run = async () => {
      running = true;
      const mine = ++token;
      const start = pointOf("canvas") ?? { x: win.offsetWidth / 2, y: win.offsetHeight / 2 };
      x.set(start.x);
      y.set(start.y + 60);
      cursor.dataset.on = "";
      try {
        while (mine === token) {
          for (const step of TOUR) await perform(step, mine);
          await sleep(TOUR_LOOP_PAUSE_MS, mine);
        }
      } catch (error) {
        if (error !== CANCELLED) throw error;
      }
    };

    // A visitor's own pointer, key or touch inside the demo stops the tour and keeps the state it reached.
    const interrupt = () => {
      if (running) halt();
      schedule(TOUR_RESUME_IDLE_MS);
    };
    const events = ["pointerdown", "pointermove", "keydown", "touchstart", "wheel"] as const;
    events.forEach((type) => win.addEventListener(type, interrupt, { passive: true }));
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView) schedule(TOUR_START_IDLE_MS);
        else halt();
      },
      { threshold: 0.4 },
    );
    observer.observe(win);
    const onVisibility = () => (document.hidden ? halt() : schedule(TOUR_START_IDLE_MS));
    document.addEventListener("visibilitychange", onVisibility);
    const onPreference = () => (allowed() ? schedule(TOUR_START_IDLE_MS) : halt());
    fits.addEventListener("change", onPreference);
    reduced.addEventListener("change", onPreference);

    return () => {
      halt();
      clearTimeout(idle);
      observer.disconnect();
      events.forEach((type) => win.removeEventListener(type, interrupt));
      document.removeEventListener("visibilitychange", onVisibility);
      fits.removeEventListener("change", onPreference);
      reduced.removeEventListener("change", onPreference);
    };
  }, [enabled, windowRef, x, y]);

  return (
    <motion.div aria-hidden style={{ x, y }} className="pointer-events-none absolute top-0 left-0 z-50">
      <div ref={cursorRef} className="opacity-0 transition-opacity duration-300 data-[on]:opacity-100">
        <span ref={rippleRef} className="absolute -top-4 -left-4 size-8 rounded-full border-2 border-white/80 opacity-0" />
        <svg width="20" height="22" viewBox="0 0 20 22" className="drop-shadow-[0_2px_4px_rgb(0_0_0/0.45)]">
          <path d="M2 1.5v16.2l4.4-4.1 2.8 6.6 3-1.3-2.8-6.5h6.1z" fill="#fff" stroke="#0b0d12" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      </div>
    </motion.div>
  );
}
