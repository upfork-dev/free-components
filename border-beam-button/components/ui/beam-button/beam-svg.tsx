"use client";

import { useEffect, useId, useState, type CSSProperties, type RefObject } from "react";

type BeamSvgProps = {
  surface: "dark" | "light" | "auto";
  /** The button the beam runs around. Its border box is measured, so the beam follows the real border. */
  targetRef: RefObject<HTMLElement | null>;
  /** A rect the button flashes on press (Web Animations API). */
  flashRef: RefObject<SVGRectElement | null>;
  dualBeam: boolean;
};

/*
 * How the beam moves: the rect has pathLength 100, and every dash pattern sums to 100 and starts with a
 * zero-length dash and a gap of LEAD - length. The visible dash therefore always ends LEAD units after the
 * pattern's start, so every layer of the comet shares one leading edge, and a layer can grow or shrink
 * (hover, loading) without the head moving. Animating stroke-dashoffset from 0 to -100 carries that edge once
 * round the real perimeter at a constant speed (a rotating conic gradient races through the corners). One
 * registered custom property, --bb-offset, carries that animation for the whole comet; every layer reads it.
 *
 * How the comet looks: a continuous fade, never bands of color. It is a stack of thin layers of growing
 * length whose opacities are solved so that, where they overlap, they add up to a smooth curve (bright at
 * the head, nothing at the tail); a blur under a pixel removes the last trace of a step.
 */
const LEAD = 60;
const SCALE = { idle: 1, hover: 1.5, loading: 1.8 };

type Layer = { length: number; opacity: number };

/**
 * `count` layers whose lengths grow evenly up to `length`, with opacities chosen so the stacked coverage at
 * each step follows peak × (1 - distance / length) ^ power, the shape of the fade.
 */
function fade(count: number, length: number, peak: number, power: number): Layer[] {
  const target = Array.from({ length: count }, (_, k) => peak * (1 - (k + 0.5) / count) ** power);
  const opacity = new Array<number>(count);
  // Segment k (counted from the head) is covered by layers k..count-1: solve from the tail inward.
  for (let k = count - 1; k >= 0; k--) {
    const behind = k === count - 1 ? 0 : target[k + 1];
    opacity[k] = 1 - (1 - target[k]) / (1 - behind);
  }
  return opacity.map((o, k) => ({ length: (length * (k + 1)) / count, opacity: Math.max(0, o) }));
}

const BODY = fade(24, 26, 0.92, 1.6); // the colored body and tail
const HEAD = fade(4, 3.6, 0.95, 1.1); // the bright core at the front

/** Dash patterns for one layer in each state, as CSS variables the classes below choose between. */
function dashVars(length: number): CSSProperties {
  const pattern = (scale: number) => {
    const l = (length * scale).toFixed(2);
    return `0 ${(LEAD - length * scale).toFixed(2)} ${l} ${100 - LEAD}`;
  };
  return {
    "--bb-dash-idle": pattern(SCALE.idle),
    "--bb-dash-hover": pattern(SCALE.hover),
    "--bb-dash-loading": pattern(SCALE.loading),
  } as CSSProperties;
}

/* On each comet: the one animation that moves it. */
const travel =
  "animate-bb-beam [animation-duration:var(--bb-duration)] [animation-delay:var(--bb-delay,0s)] " +
  "group-data-[offscreen]/bb:[animation-play-state:paused]";
/* On each layer: its offset, and its dash for the button's state (eased when the state changes). */
const moving =
  "[stroke-dashoffset:var(--bb-offset)] transition-[stroke-dasharray] duration-500 ease-out " +
  "[stroke-dasharray:var(--bb-dash-idle)] group-data-[hover]/bb:group-data-[state=idle]/bb:[stroke-dasharray:var(--bb-dash-hover)] " +
  "group-data-[state=loading]/bb:[stroke-dasharray:var(--bb-dash-loading)]";

/* The success and error flash, readable on each surface. */
const stateRing = {
  dark: "stroke-emerald-400 group-data-[state=error]/bb:stroke-red-400",
  light: "stroke-emerald-600 group-data-[state=error]/bb:stroke-red-600",
  auto:
    "stroke-emerald-600 group-data-[state=error]/bb:stroke-red-600 " +
    "dark:stroke-emerald-400 dark:group-data-[state=error]/bb:stroke-red-400",
};

/** The measured SVG layer that draws the beam, the focus ring and the state flashes on the border. */
export function BeamSvg({ targetRef, flashRef, dualBeam, surface }: BeamSvgProps) {
  const uid = useId().replace(/[^\w-]/g, "");
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const box = entry.borderBoxSize?.[0];
      const width = Math.round(box ? box.inlineSize : el.offsetWidth);
      const height = Math.round(box ? box.blockSize : el.offsetHeight);
      setSize((prev) => (prev?.width === width && prev.height === height ? prev : { width, height }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [targetRef]);

  // Before the first measurement (and on the server) the button shows its plain CSS border.
  if (!size) return null;

  const { width, height } = size;
  const gradient = `bb-gradient-${uid}`;
  const glow = `bb-glow-${uid}`;
  const soften = `bb-soften-${uid}`;
  // The SVG covers the border box; the rect runs along the middle of the 1px border.
  const rect = { x: 0.5, y: 0.5, width: width - 1, height: height - 1, rx: (height - 1) / 2, pathLength: 100 };
  // Filter regions well beyond the rect, so nothing blurred is ever clipped into a box.
  const region = { x: -24, y: -24, width: width + 48, height: height + 48, filterUnits: "userSpaceOnUse" as const };

  return (
    <svg
      data-beam-svg=""
      aria-hidden
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      overflow="visible"
      fill="none"
      className="pointer-events-none absolute -inset-px animate-bb-fade-in"
    >
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2={width} y2={height} gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: "var(--bb-from)" }} />
          <stop offset="1" style={{ stopColor: "var(--bb-to)" }} />
        </linearGradient>
        <filter id={glow} {...region} colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
        <filter id={soften} {...region} colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="0.85" />
        </filter>
      </defs>

      {/* Reduced motion: a still gradient border instead of the moving beam. Disabled: a faint one. */}
      <rect
        {...rect}
        stroke={`url(#${gradient})`}
        strokeWidth={1}
        className="opacity-0 motion-reduce:opacity-70 group-data-[disabled]/bb:opacity-30"
      />

      {(dualBeam ? [0, 1] : [0]).map((beam) => (
        <g
          key={beam}
          data-beam=""
          className={`${travel} motion-reduce:hidden group-data-[disabled]/bb:hidden`}
          style={beam ? ({ "--bb-delay": "calc(var(--bb-duration) * -0.5)" } as CSSProperties) : undefined}
        >
          {/* The glow: the front half of the comet, blurred wide. */}
          <rect
            {...rect}
            stroke={`url(#${gradient})`}
            strokeWidth={3}
            filter={`url(#${glow})`}
            opacity={0.5}
            className={moving}
            style={dashVars(14)}
          />
          {/* The comet: a smooth fade from the bright head back to nothing. */}
          <g filter={`url(#${soften})`}>
            {BODY.map((layer, i) => (
              <rect
                key={`b${i}`}
                {...rect}
                stroke={`url(#${gradient})`}
                strokeWidth={1.6}
                opacity={layer.opacity}
                className={moving}
                style={dashVars(layer.length)}
              />
            ))}
            {HEAD.map((layer, i) => (
              <rect
                key={`h${i}`}
                {...rect}
                stroke="var(--bb-head)"
                strokeWidth={1.9}
                opacity={layer.opacity}
                className={moving}
                style={dashVars(layer.length)}
              />
            ))}
          </g>
        </g>
      ))}

      {/* Keyboard focus: the beam fills the whole border. */}
      <rect
        {...rect}
        stroke={`url(#${gradient})`}
        strokeWidth={1.5}
        className="opacity-0 transition-opacity duration-200 group-focus-visible/bb:opacity-100"
      />
      {/* Press: the border flashes once in the accent. */}
      <rect ref={flashRef} {...rect} stroke={`url(#${gradient})`} strokeWidth={2} opacity={0} />
      {/* Success and error: the border flashes green or red. */}
      <rect
        {...rect}
        strokeWidth={1.5}
        className={`${stateRing[surface]} opacity-0 group-data-[state=success]/bb:animate-bb-flash group-data-[state=error]/bb:animate-bb-flash`}
      />
    </svg>
  );
}
