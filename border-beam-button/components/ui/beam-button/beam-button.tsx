"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, RotateCcw } from "lucide-react";
import { BeamSvg } from "./beam-svg";
import { usePointerVars } from "./use-pointer-vars";

export type BeamState = "idle" | "loading" | "success" | "error";
export type BeamAccent = "ember" | "violet" | "aurora" | "mono" | { from: string; to: string };
/** "auto" is the light surface that turns dark with your site's `dark:` variant. */
export type BeamSurface = "dark" | "light" | "auto";

export type BeamButtonProps = {
  children: ReactNode;
  /** Renders a next/link instead of a <button>. */
  href?: string;
  size?: "sm" | "md" | "lg";
  accent?: BeamAccent;
  surface?: BeamSurface;
  /** Trailing icon. Default: an arrow. `false` for none. */
  icon?: ReactNode | false;
  /** Controlled state. Leave it out and a Promise returned by onClick drives the states instead. */
  state?: BeamState;
  onClick?: (event: MouseEvent<HTMLElement>) => void | Promise<unknown>;
  loadingText?: string;
  successText?: string;
  errorText?: string;
  /** Seconds per lap. Default 3. */
  beamDuration?: number;
  /** A second beam half a lap behind the first. */
  dualBeam?: boolean;
  /** The button leans up to 4px toward the cursor. */
  magnetic?: boolean;
  uppercase?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
  ref?: Ref<HTMLButtonElement | HTMLAnchorElement>;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "children" | "className" | "disabled">;

type Colors = { from: string; to: string; head: string };

/* Beam colors per surface: a near-white head on the dark surface, a deep one on the light surface. */
const accents: Record<Exclude<BeamAccent, object>, { dark: Colors; light: Colors }> = {
  ember: {
    dark: { from: "#fdba74", to: "#ef4444", head: "#fff7ed" },
    light: { from: "#f97316", to: "#dc2626", head: "#9a3412" },
  },
  violet: {
    dark: { from: "#c4b5fd", to: "#8b5cf6", head: "#f5f3ff" },
    light: { from: "#a78bfa", to: "#6d28d9", head: "#4c1d95" },
  },
  aurora: {
    dark: { from: "#22d3ee", to: "#a78bfa", head: "#ecfeff" },
    light: { from: "#06b6d4", to: "#7c3aed", head: "#155e75" },
  },
  mono: {
    dark: { from: "#ffffff", to: "#a1a1aa", head: "#ffffff" },
    light: { from: "#3f3f46", to: "#a1a1aa", head: "#09090b" },
  },
};

function accentVars(accent: BeamAccent): CSSProperties {
  const { dark, light } =
    typeof accent === "string"
      ? accents[accent]
      : { dark: { ...accent, head: "#ffffff" }, light: { ...accent, head: accent.to } };
  return {
    "--bb-from-d": dark.from,
    "--bb-to-d": dark.to,
    "--bb-head-d": dark.head,
    "--bb-from-l": light.from,
    "--bb-to-l": light.to,
    "--bb-head-l": light.head,
  } as CSSProperties;
}

const DARK_VARS = "[--bb-from:var(--bb-from-d)] [--bb-to:var(--bb-to-d)] [--bb-head:var(--bb-head-d)]";
const LIGHT_VARS = "[--bb-from:var(--bb-from-l)] [--bb-to:var(--bb-to-l)] [--bb-head:var(--bb-head-l)]";

const surfaces: Record<BeamSurface, string> = {
  dark:
    `${DARK_VARS} border-white/10 bg-linear-to-b from-[#1C1C1F] to-[#0E0E10] text-white/90 ` +
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_1px_2px_rgba(0,0,0,0.5),0_10px_24px_-12px_rgba(0,0,0,0.8)]",
  light:
    `${LIGHT_VARS} border-zinc-950/10 bg-linear-to-b from-white to-zinc-100 text-zinc-900 ` +
    "shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_2px_rgba(9,9,11,0.08),0_10px_24px_-14px_rgba(9,9,11,0.35)]",
  auto:
    `${LIGHT_VARS} border-zinc-950/10 bg-linear-to-b from-white to-zinc-100 text-zinc-900 ` +
    "shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_2px_rgba(9,9,11,0.08),0_10px_24px_-14px_rgba(9,9,11,0.35)] " +
    "dark:[--bb-from:var(--bb-from-d)] dark:[--bb-to:var(--bb-to-d)] dark:[--bb-head:var(--bb-head-d)] " +
    "dark:border-white/10 dark:from-[#1C1C1F] dark:to-[#0E0E10] dark:text-white/90 " +
    "dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_1px_2px_rgba(0,0,0,0.5),0_10px_24px_-12px_rgba(0,0,0,0.8)]",
};

/* Success and error colors that stay readable on each surface. */
const tones: Record<BeamSurface, { ok: string; bad: string }> = {
  dark: { ok: "text-emerald-400", bad: "text-red-400" },
  light: { ok: "text-emerald-600", bad: "text-red-600" },
  auto: { ok: "text-emerald-600 dark:text-emerald-400", bad: "text-red-600 dark:text-red-400" },
};

const sizes = {
  sm: "h-11 px-5 text-xs",
  md: "h-13 px-7 text-sm",
  lg: "h-15 px-9 text-base",
};

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const isPromise = (value: unknown): value is Promise<unknown> =>
  typeof (value as Promise<unknown> | undefined)?.then === "function";

/**
 * A pill call to action with a comet of light running around its border. The beam keeps a constant
 * speed on the real rounded border, speeds up on hover, and turns into a spinner while loading.
 * Async aware: return a Promise from onClick (or put it in a form) and it shows loading, success and
 * error by itself.
 */
export function BeamButton({
  children,
  href,
  size = "md",
  accent = "ember",
  surface = "dark",
  icon,
  state: stateProp,
  onClick,
  loadingText = "Building…",
  successText = "Ready",
  errorText = "Try again",
  beamDuration = 3,
  dualBeam = false,
  magnetic = false,
  uppercase = true,
  fullWidth = false,
  disabled = false,
  className,
  ref,
  type = "button",
  style,
  ...rest
}: BeamButtonProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const flashRef = useRef<SVGRectElement | null>(null);
  const waveRef = useRef<HTMLSpanElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hoverRef = useRef(false);
  const rateRef = useRef({ frame: 0, rate: 1 });

  const [autoState, setAutoState] = useState<BeamState>("idle");
  const { pending } = useFormStatus();
  const state: BeamState = stateProp ?? (type === "submit" && pending ? "loading" : autoState);
  const busy = state === "loading";

  usePointerVars(rootRef, magnetic && !disabled);

  const setRefs = useCallback(
    (node: HTMLButtonElement | HTMLAnchorElement | null) => {
      rootRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  /** Eases the beam's playback rate to a new value: no jump, no restart. */
  const easeBeamRate = useCallback((target: number) => {
    const root = rootRef.current;
    if (!root) return;
    const beams = (root.querySelector("[data-beam-svg]")?.getAnimations({ subtree: true }) ?? []).filter(
      (animation): animation is CSSAnimation =>
        animation instanceof CSSAnimation && animation.animationName === "bb-beam",
    );
    const ramp = rateRef.current;
    cancelAnimationFrame(ramp.frame);
    const from = ramp.rate;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 450);
      ramp.rate = from + (target - from) * (1 - (1 - t) ** 3);
      beams.forEach((animation) => animation.updatePlaybackRate(ramp.rate));
      if (t < 1) ramp.frame = requestAnimationFrame(step);
    };
    ramp.frame = requestAnimationFrame(step);
  }, []);

  const targetRate = useCallback(
    () => (busy ? beamDuration : hoverRef.current ? 2.5 : 1),
    [busy, beamDuration],
  );

  // Loading turns the beam into a spinner: one lap per second, whatever the normal duration.
  useEffect(() => {
    easeBeamRate(targetRate());
  }, [easeBeamRate, targetRate]);

  // Off screen, the beam and the dots stop.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) delete el.dataset.offscreen;
      else el.dataset.offscreen = "";
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(
    () => () => {
      clearTimeout(timerRef.current);
      cancelAnimationFrame(rateRef.current.frame);
    },
    [],
  );

  const settle = (next: "success" | "error") => {
    setAutoState(next);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setAutoState("idle"), next === "success" ? 2000 : 2500);
  };

  /** The press: a flash around the border and a shockwave from the point that was pressed. */
  const pressEffects = (clientX?: number, clientY?: number) => {
    const root = rootRef.current;
    if (!root) return;
    flashRef.current?.animate([{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0 }], {
      duration: 650,
      easing: "ease-out",
    });
    const wave = waveRef.current;
    if (!wave || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = root.getBoundingClientRect();
    const x = clientX === undefined ? box.width / 2 : clientX - box.left;
    const y = clientY === undefined ? box.height / 2 : clientY - box.top;
    // A soft ring of light drawn at its final size and scaled up from the pressed point.
    const reach = Math.hypot(Math.max(x, box.width - x), Math.max(y, box.height - y)) * 2;
    Object.assign(wave.style, { left: `${x}px`, top: `${y}px`, width: `${reach}px`, height: `${reach}px` });
    wave.animate(
      [
        { transform: "translate(-50%, -50%) scale(0.05)", opacity: 1 },
        { transform: "translate(-50%, -50%) scale(0.45)", opacity: 0.7, offset: 0.35 },
        { transform: "translate(-50%, -50%) scale(1)", opacity: 0 },
      ],
      { duration: 750, easing: "cubic-bezier(0.25, 0.6, 0.3, 1)" },
    );
  };

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    if (disabled || busy) {
      event.preventDefault();
      return;
    }
    if (event.detail === 0) pressEffects(); // keyboard: Enter or Space
    const result = onClick?.(event);
    if (stateProp === undefined && isPromise(result)) {
      clearTimeout(timerRef.current);
      setAutoState("loading");
      result.then(
        () => settle("success"),
        () => settle("error"),
      );
    }
  };

  const onPointerEnter = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse" || disabled) return;
    hoverRef.current = true;
    event.currentTarget.dataset.hover = "";
    easeBeamRate(targetRate());
  };
  const onPointerLeave = (event: PointerEvent<HTMLElement>) => {
    hoverRef.current = false;
    delete event.currentTarget.dataset.hover;
    delete event.currentTarget.dataset.pressed;
    easeBeamRate(targetRate());
  };
  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (disabled || busy || event.button !== 0) return;
    event.currentTarget.dataset.pressed = "";
    pressEffects(event.clientX, event.clientY);
  };
  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    delete event.currentTarget.dataset.pressed;
  };

  const text = typeof children === "string" ? children : null;
  const trailing = icon === undefined ? <ArrowRight className="size-4" /> : icon;
  const labels: Record<BeamState, ReactNode> = {
    idle: children,
    loading: loadingText,
    success: successText,
    error: errorText,
  };
  const layer = (shown: boolean) =>
    cx(
      "col-start-1 row-start-1 inline-flex items-center justify-center gap-2 transition-[opacity,translate] duration-300 ease-out",
      shown ? "opacity-100" : "pointer-events-none opacity-0 motion-safe:translate-y-1",
    );

  const content = (
    <>
      {/* Accent glow around the button on hover. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-px -z-10 rounded-full opacity-0 shadow-[0_0_40px_-8px_var(--bb-to)] transition-opacity duration-300 group-data-[hover]/bb:opacity-100"
      />

      {/* Inside the pill: drifting dots, brighter dots and a spotlight near the cursor, the shockwave. */}
      <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
        <span className="absolute -inset-1.5 animate-bb-dots bg-[radial-gradient(circle,currentColor_0.8px,transparent_1.2px)] bg-size-[6px_6px] opacity-[0.08] group-data-[offscreen]/bb:[animation-play-state:paused] motion-reduce:animate-none" />
        <span
          className="absolute -inset-1.5 animate-bb-dots bg-[radial-gradient(circle,currentColor_0.8px,transparent_1.2px)] bg-size-[6px_6px] opacity-0 transition-opacity duration-300 group-data-[hover]/bb:opacity-30 group-data-[offscreen]/bb:[animation-play-state:paused] motion-reduce:animate-none"
          style={{
            maskImage: "radial-gradient(56px circle at var(--bb-px) var(--bb-py), #000, transparent)",
            WebkitMaskImage: "radial-gradient(56px circle at var(--bb-px) var(--bb-py), #000, transparent)",
          }}
        />
        <span className="absolute inset-0 bg-[radial-gradient(120px_circle_at_var(--bb-px)_var(--bb-py),color-mix(in_oklab,var(--bb-from)_22%,transparent),transparent_70%)] opacity-0 transition-opacity duration-300 group-data-[hover]/bb:opacity-100" />
        <span
          ref={waveRef}
          className="absolute rounded-full bg-[radial-gradient(circle_closest-side,transparent_58%,color-mix(in_oklab,var(--bb-from)_80%,transparent)_78%,transparent)] opacity-0"
        />
      </span>

      {/* The stretch of border nearest the cursor lights up. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-full bg-[radial-gradient(52px_circle_at_var(--bb-px)_var(--bb-py),var(--bb-to),transparent_75%)] p-px opacity-0 transition-opacity duration-300 group-data-[hover]/bb:opacity-100"
        style={{
          mask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
          WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
        }}
      />

      <BeamSvg targetRef={rootRef} flashRef={flashRef} dualBeam={dualBeam} surface={surface} />

      {/* Every label sits in one grid cell, so the button is as wide as the widest and never jumps. */}
      <span className="relative grid">
        <span aria-hidden className={layer(state === "idle")}>
          {text ? <RollingText text={text} /> : children}
          {trailing && (
            <span className="relative inline-flex overflow-hidden">
              <span className="inline-flex motion-safe:group-data-[hover]/bb:animate-bb-arrow">{trailing}</span>
            </span>
          )}
        </span>
        <span aria-hidden className={layer(state === "loading")}>
          <Spinner />
          {loadingText}
        </span>
        <span aria-hidden className={layer(state === "success")}>
          <CheckDraw className={tones[surface].ok} />
          {successText}
        </span>
        <span aria-hidden className={layer(state === "error")}>
          <RotateCcw className={cx("size-4", tones[surface].bad)} />
          {errorText}
        </span>
        <span className="sr-only">{labels[state]}</span>
      </span>
    </>
  );

  const shared = {
    className: cx(
      "group/bb relative isolate items-center justify-center rounded-full border font-semibold whitespace-nowrap select-none",
      "cursor-pointer [--bb-px:50%] [--bb-py:50%]",
      "[translate:var(--bb-mx,0px)_var(--bb-my,0px)] [scale:var(--bb-scale,1)] transition-[scale] duration-150 ease-out",
      "data-[pressed]:[--bb-scale:0.97] motion-safe:data-[state=error]:animate-bb-shake",
      "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--bb-to)",
      uppercase && "uppercase tracking-[0.12em]",
      fullWidth ? "flex w-full" : "inline-flex",
      sizes[size],
      surfaces[surface],
      disabled && "cursor-not-allowed opacity-50",
      busy && "cursor-progress",
      className,
    ),
    style: { ...accentVars(accent), "--bb-duration": `${beamDuration}s`, ...style } as CSSProperties,
    "data-state": state,
    "data-surface": surface,
    "data-disabled": disabled ? "" : undefined,
    "aria-disabled": disabled || undefined,
    "aria-busy": busy || undefined,
    onClick: handleClick,
    onPointerEnter,
    onPointerLeave,
    onPointerDown,
    onPointerUp,
    onPointerCancel: onPointerUp,
  };

  return (
    <>
      {href ? (
        <Link
          href={href}
          ref={setRefs}
          {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}
          {...shared}
        >
          {content}
        </Link>
      ) : (
        <button ref={setRefs} type={type} {...rest} {...shared}>
          {content}
        </button>
      )}
      {/* Outside the button, so the button's name stays its label; announces loading, success, error. */}
      <span aria-live="polite" className="sr-only">
        {state === "idle" ? "" : labels[state]}
      </span>
    </>
  );
}

/** The label as letters that roll up on hover, each a little after the one before. */
function RollingText({ text }: { text: string }) {
  const space = String.fromCharCode(160);
  return (
    <span className="inline-flex">
      {Array.from(text).map((char, i) => {
        const glyph = char === " " ? space : char;
        const delay = { transitionDelay: `${i * 15}ms` };
        return (
          <span key={i} className="relative inline-block overflow-hidden">
            <span
              className="block transition-transform duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-safe:group-data-[hover]/bb:-translate-y-full"
              style={delay}
            >
              {glyph}
            </span>
            <span
              className="absolute inset-0 block translate-y-full transition-transform duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-safe:group-data-[hover]/bb:translate-y-0"
              style={delay}
            >
              {glyph}
            </span>
          </span>
        );
      })}
    </span>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-3.5 animate-bb-spin motion-reduce:animate-none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** A check mark that draws itself when the button turns to success. */
function CheckDraw({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`size-4 ${className}`}>
      <path
        d="M5 12.5l4.5 4.5L19 7.5"
        pathLength={1}
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="[stroke-dasharray:1] [stroke-dashoffset:1] group-data-[state=success]/bb:animate-bb-check motion-reduce:[stroke-dashoffset:0]"
      />
    </svg>
  );
}
