"use client";

import { useEffect, useRef } from "react";

/** A soft light that follows the cursor across the section (mouse only), via CSS variables once per frame. */
export function CursorSpotlight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const light = ref.current;
    const section = light?.parentElement;
    if (!light || !section || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    const render = () => {
      frame = 0;
      light.style.setProperty("--ih-mx", `${x}px`);
      light.style.setProperty("--ih-my", `${y}px`);
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const box = section.getBoundingClientRect();
      x = event.clientX - box.left;
      y = event.clientY - box.top;
      light.dataset.on = "";
      frame ||= requestAnimationFrame(render);
    };
    const onLeave = () => delete light.dataset.on;
    section.addEventListener("pointermove", onMove, { passive: true });
    section.addEventListener("pointerleave", onLeave);
    return () => {
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <div ref={ref} aria-hidden className="ih-spotlight" />;
}
