"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useMotionValue, type MotionValue } from "motion/react";
import { COLLABORATORS } from "./collaborators";

/**
 * Two fake collaborators drifting over the canvas on gentle, randomized paths (medium screens and up).
 * Decorative: no pointer events, hidden from assistive tech, paused off screen or in a hidden tab, and
 * standing still for visitors who prefer reduced motion.
 */
export function CollaboratorCursors() {
  const area = useRef<HTMLDivElement>(null);
  const sara = { x: useMotionValue(0), y: useMotionValue(0) };
  const alex = { x: useMotionValue(0), y: useMotionValue(0) };
  const people = [sara, alex];

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const placeAt = (p: { x: MotionValue<number>; y: MotionValue<number> }, fx: number, fy: number) => {
      p.x.set(el.clientWidth * fx);
      p.y.set(el.clientHeight * fy);
    };
    placeAt(sara, 0.68, 0.3);
    placeAt(alex, 0.3, 0.72);
    if (reduced) return;

    let visible = false;
    let stopped = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const drift = (p: { x: MotionValue<number>; y: MotionValue<number> }, seed: number) => {
      if (stopped) return;
      if (!visible || document.hidden) {
        timers.push(setTimeout(() => drift(p, seed), 600));
        return;
      }
      const w = el.clientWidth;
      const h = el.clientHeight;
      const duration = 2.6 + Math.random() * 1.8;
      // Wander within the canvas, keeping clear of the edges.
      animate(p.x, w * (0.12 + Math.random() * 0.76), { duration, ease: "easeInOut" });
      animate(p.y, h * (0.14 + Math.random() * 0.7), { duration, ease: "easeInOut" });
      timers.push(setTimeout(() => drift(p, seed), duration * 1000 + 300 + seed * 400));
    };
    const observer = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    observer.observe(el);
    drift(sara, 0);
    drift(alex, 1);
    return () => {
      stopped = true;
      timers.forEach(clearTimeout);
      observer.disconnect();
    };
    // the motion values are stable for the component's life
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={area} aria-hidden className="pointer-events-none absolute inset-0 z-20 hidden md:block">
      {COLLABORATORS.map((c, i) => (
        <motion.div key={c.name} style={{ x: people[i].x, y: people[i].y }} className="absolute top-0 left-0">
          <svg width="16" height="18" viewBox="0 0 16 18" className="drop-shadow-[0_1px_2px_rgb(0_0_0/0.35)]">
            <path d="M1.5 1.2v13l3.6-3.3 2.3 5.3 2.4-1-2.3-5.3h4.9z" fill={c.color} stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" />
          </svg>
          <span
            className="absolute top-4 left-3 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-white shadow"
            style={{ background: c.color }}
          >
            {c.name}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
