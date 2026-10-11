"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import type { AppWindowProps } from "./app-window";

const AppWindow = dynamic(() => import("./app-window").then((m) => m.AppWindow), {
  ssr: false,
  loading: () => <DemoSkeleton />,
});

/**
 * The product demo, hydrated only when it comes near the viewport: until then (and while its code loads) a
 * static window of exactly the same size holds its place, so nothing shifts. The scroll tilt is applied here,
 * around both, so the hand-over from skeleton to demo is seamless.
 */
export function ProductDemo(props: AppWindowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setNear(true);
        observer.disconnect();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tilt>
      <div ref={ref}>{near ? <AppWindow {...props} /> : <DemoSkeleton />}</div>
    </Tilt>
  );
}

/**
 * The window starts tilted back in 3D and flattens as it scrolls into view (scroll-linked, spring-smoothed).
 * With reduced motion it is simply flat: a CSS override, so it holds from the first paint, before hydration.
 */
function Tilt({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.35"] });
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.6 });
  const rotateX = useTransform(progress, [0, 1], [18, 0]);
  const scale = useTransform(progress, [0, 1], [0.92, 1]);
  const y = useTransform(progress, [0, 1], [40, 0]);
  return (
    <div ref={ref} style={{ perspective: 1200 }}>
      <motion.div style={{ rotateX, scale, y, transformOrigin: "50% 0%" }} className="motion-reduce:transform-none!">
        {children}
      </motion.div>
    </div>
  );
}

/** The static stand-in: the window's frame, bars and panels, same size, no script. */
export function DemoSkeleton() {
  const line = "rounded-full bg-(--ih-control)";
  return (
    <div
      aria-hidden
      className="relative flex h-[560px] flex-col overflow-hidden rounded-2xl border border-(--ih-win-line) bg-(--ih-win) shadow-(--ih-win-shadow) lg:aspect-[16/10] lg:h-auto"
    >
      <div className="flex h-11 shrink-0 items-center gap-1.5 border-b border-(--ih-panel-line) bg-(--ih-bar) px-3.5">
        <span className="size-3 rounded-full bg-[#ff5f57]" />
        <span className="size-3 rounded-full bg-[#febc2e]" />
        <span className="size-3 rounded-full bg-[#28c840]" />
        <span className={`ms-3 hidden h-5 w-48 sm:block ${line}`} />
        <span className="ms-auto h-7 w-[78px] rounded-md bg-(--ih-selection)/70" />
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[52px_minmax(0,1fr)_232px] lg:grid-cols-[224px_minmax(0,1fr)_248px]">
        <div className="hidden flex-col gap-3 border-e border-(--ih-panel-line) bg-(--ih-panel) p-3 md:flex">
          {[60, 80, 70, 76, 64, 88].map((w, i) => (
            <span key={i} className={`h-2.5 ${line}`} style={{ width: `${w}%` }} />
          ))}
        </div>
        <div className="flex min-h-0 flex-col bg-(--ih-canvas)">
          <div className="h-10 shrink-0 border-b border-(--ih-panel-line) bg-(--ih-panel)" />
          <div className="min-h-0 flex-1 px-4 pt-9 pb-14 sm:px-6 sm:pt-10 md:pb-6">
            <div className="h-full rounded-lg border border-(--ih-site-line) bg-(--ih-site)" />
          </div>
        </div>
        <div className="hidden flex-col gap-3 border-s border-(--ih-panel-line) bg-(--ih-panel) p-3.5 md:flex">
          {[40, 100, 30, 100, 36, 100, 100].map((w, i) => (
            <span key={i} className={`h-2.5 ${line}`} style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
