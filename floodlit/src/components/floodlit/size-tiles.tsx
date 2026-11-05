"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import type { ShoeSize } from "./types";

export type SizeUnit = "eu" | "us" | "uk";

export function sizeLabel(size: ShoeSize, unit: SizeUnit): string {
  return (unit === "us" ? size.us : unit === "uk" ? size.uk : size.eu) ?? size.eu;
}

export type SizeTilesProps = {
  sizes: ShoeSize[];
  value: string | null;
  unit: SizeUnit;
  onChange: (eu: string) => void;
  label: string;
  soldOutLabel: string;
  /** One soft pulse when somebody needs to choose first. Change the number to play it. */
  pulse?: number;
};

/** Sizes as a radio group, in the room's own material. Sold out stays visible, struck through, never selectable. */
export function SizeTiles({ sizes, value, unit, onChange, label, soldOutLabel, pulse = 0 }: SizeTilesProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const group = useRef<HTMLDivElement>(null);
  // A pulse must not remount the tiles: that would take the keyboard's focus away with them.
  useEffect(() => {
    if (pulse > 0) group.current?.animate([{ transform: "none" }, { transform: "translate3d(0,-2px,0) scale(1.012)", offset: 0.4 }, { transform: "none" }], { duration: 500, easing: "cubic-bezier(0.22,0.8,0.24,1)" });
  }, [pulse]);
  const firstOpen = sizes.findIndex((s) => s.stock > 0);
  const current = sizes.findIndex((s) => s.eu === value);
  const tabStop = current >= 0 ? current : firstOpen;

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    const by = keys[e.key];
    if (!by) return;
    e.preventDefault();
    const n = sizes.length;
    for (let step = 1; step <= n; step++) {
      const k = (i + by * step + n * step) % n;
      if (sizes[k].stock > 0) {
        refs.current[k]?.focus();
        onChange(sizes[k].eu);
        return;
      }
    }
  }

  return (
    <div ref={group} className="fl-tiles" role="radiogroup" aria-label={label}>
      {sizes.map((size, i) => {
        const out = size.stock <= 0;
        const on = size.eu === value;
        const text = sizeLabel(size, unit);
        return (
          <button
            key={size.eu}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            aria-disabled={out || undefined}
            aria-label={out ? `${text}, ${soldOutLabel}` : text}
            tabIndex={i === tabStop ? 0 : -1}
            className="fl-tile"
            data-on={on || undefined}
            data-out={out || undefined}
            onClick={() => {
              if (!out) onChange(size.eu);
            }}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            <span>{text}</span>
            {out ? (
              <svg className="fl-tile-strike" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <line x1="4" y1="96" x2="96" y2="4" vectorEffect="non-scaling-stroke" />
              </svg>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
