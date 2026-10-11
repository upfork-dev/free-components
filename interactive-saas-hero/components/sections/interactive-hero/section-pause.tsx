"use client";

import { useEffect, useRef } from "react";

/** Pauses every CSS loop in the section (aurora, particles, borders, shine) while it is off screen or the tab is hidden. */
export function SectionPause() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const section = ref.current?.closest<HTMLElement>(".ih");
    if (!section) return;
    let visible = true;
    const apply = () => {
      if (visible && !document.hidden) delete section.dataset.ihPaused;
      else section.dataset.ihPaused = "";
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      apply();
    });
    observer.observe(section);
    document.addEventListener("visibilitychange", apply);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", apply);
    };
  }, []);

  return <span ref={ref} hidden />;
}
