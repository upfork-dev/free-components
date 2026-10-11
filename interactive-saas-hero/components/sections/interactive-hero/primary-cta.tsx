"use client";

import Link from "next/link";
import { useEffect, useRef, type CSSProperties } from "react";
import { ArrowRight } from "lucide-react";

const MAGNET_MAX = 6;

/** A small seeded random generator, so the particles are identical on the server and in the browser. */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = seeded(7);
const PARTICLES = Array.from({ length: 10 }, () => ({
  "--x": `${(8 + random() * 84).toFixed(1)}%`,
  "--s": `${(1.5 + random() * 2).toFixed(1)}px`,
  "--d": `${(2.2 + random() * 2.4).toFixed(2)}s`,
  "--delay": `${(-random() * 4).toFixed(2)}s`,
})) as CSSProperties[];

/**
 * The primary call to action: a gradient pill with an animated border, rising particles, a glow that grows
 * on hover and a gentle magnetic pull toward the cursor (desktop only, eased, CSS variables only).
 */
export function PrimaryCta({ label, href }: { label: string; href: string }) {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const m = { x: 0, y: 0, tx: 0, ty: 0, frame: 0 };
    const step = () => {
      // a light spring: ease toward the target, settle when close
      m.x += (m.tx - m.x) * 0.16;
      m.y += (m.ty - m.y) * 0.16;
      el.style.setProperty("--ih-mag-x", `${m.x.toFixed(2)}px`);
      el.style.setProperty("--ih-mag-y", `${m.y.toFixed(2)}px`);
      m.frame = Math.abs(m.tx - m.x) + Math.abs(m.ty - m.y) > 0.05 ? requestAnimationFrame(step) : 0;
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || reduced.matches) return;
      const box = el.getBoundingClientRect();
      const nx = (event.clientX - (box.left - m.x)) / box.width - 0.5;
      const ny = (event.clientY - (box.top - m.y)) / box.height - 0.5;
      m.tx = Math.max(-1, Math.min(1, nx * 2)) * MAGNET_MAX;
      m.ty = Math.max(-1, Math.min(1, ny * 2)) * MAGNET_MAX;
      m.frame ||= requestAnimationFrame(step);
    };
    const onLeave = () => {
      m.tx = m.ty = 0;
      m.frame ||= requestAnimationFrame(step);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(m.frame);
    };
  }, []);

  return (
    <Link
      ref={ref}
      href={href}
      className="ih-cta group inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--ih-accent)"
    >
      <span aria-hidden className="ih-particles">
        {PARTICLES.map((style, i) => (
          <i key={i} style={style} />
        ))}
      </span>
      <span className="relative">{label}</span>
      <ArrowRight
        aria-hidden
        className="relative size-4 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none"
      />
    </Link>
  );
}
