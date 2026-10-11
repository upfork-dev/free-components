"use client";

import { useEffect, type RefObject } from "react";

/** The farthest the magnetic pull moves the button, in px. */
const MAGNET_MAX = 4;

/**
 * Writes the pointer position inside the element to CSS variables, at most once per frame and without
 * React state, so moving the mouse never re-renders anything:
 *
 * - `--bb-px` / `--bb-py`: the pointer in px from the element's top-left corner (spotlight, dots,
 *   border glow);
 * - `--bb-mx` / `--bb-my`: the magnetic offset, eased toward the pointer (only with `magnetic`).
 *
 * Mouse only (pointer: fine), and no magnetic pull when the visitor prefers reduced motion.
 */
export function usePointerVars(ref: RefObject<HTMLElement | null>, magnetic: boolean) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const finePointer = matchMedia("(pointer: fine)");
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

    let frame = 0;
    let px = 0;
    let py = 0;
    let targetX = 0;
    let targetY = 0;
    let magnetX = 0;
    let magnetY = 0;

    const render = () => {
      frame = 0;
      el.style.setProperty("--bb-px", `${px.toFixed(1)}px`);
      el.style.setProperty("--bb-py", `${py.toFixed(1)}px`);
      if (!magnetic || reducedMotion.matches) return;
      magnetX += (targetX - magnetX) * 0.2;
      magnetY += (targetY - magnetY) * 0.2;
      const settled = Math.abs(targetX - magnetX) < 0.02 && Math.abs(targetY - magnetY) < 0.02;
      if (settled) {
        magnetX = targetX;
        magnetY = targetY;
      }
      el.style.setProperty("--bb-mx", `${magnetX.toFixed(2)}px`);
      el.style.setProperty("--bb-my", `${magnetY.toFixed(2)}px`);
      if (!settled) frame = requestAnimationFrame(render);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !finePointer.matches) return;
      const box = el.getBoundingClientRect();
      // Measured from the untranslated box, so the magnetic offset doesn't feed back into itself.
      const left = box.left - magnetX;
      const top = box.top - magnetY;
      px = event.clientX - left;
      py = event.clientY - top;
      const halfW = box.width / 2;
      const halfH = box.height / 2;
      targetX = Math.max(-1, Math.min(1, (px - halfW) / halfW)) * MAGNET_MAX;
      targetY = Math.max(-1, Math.min(1, (py - halfH) / halfH)) * MAGNET_MAX;
      schedule();
    };
    const onLeave = () => {
      targetX = 0;
      targetY = 0;
      schedule();
    };

    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(frame);
    };
  }, [ref, magnetic]);
}
