"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { defaultLabels } from "./labels";
import type { Shoe, ShoeSize, ShoeWallLabels } from "./types";

type System = "eu" | "us" | "uk";
const SYSTEM_NAMES: Record<System, string> = { eu: "EU", us: "US", uk: "UK" };

export type SizePickerProps = {
  shoe: Shoe;
  value: string | null;
  onChange: (eu: string) => void;
  labels?: Partial<ShoeWallLabels>;
  onSizeGuide?: (shoe: Shoe) => void;
  /** The reserved line under the sizes: a hint from the button, when there is one. */
  hint?: string | null;
  groupRef?: (el: HTMLDivElement | null) => void;
};

/** A radio group with arrow keys. Sizes come from the data; nothing is ever computed. */
export function SizePicker({ shoe, value, onChange, labels: given, onSizeGuide, hint, groupRef }: SizePickerProps) {
  const labels = { ...defaultLabels, ...given };
  const [system, setSystem] = useState<System>("eu");
  const id = useId();
  const cells = useRef<Map<string, HTMLButtonElement>>(new Map());

  const systems = (["eu", "us", "uk"] as System[]).filter((s) => s === "eu" || shoe.sizes.some((z) => z[s]));
  const read = (size: ShoeSize) => size[system] ?? size.eu;
  const chosen = shoe.sizes.find((s) => s.eu === value) ?? null;
  const low = chosen && chosen.stock > 0 && chosen.stock <= 2 ? labels.onlyLeft(chosen.stock) : null;
  const available = shoe.sizes.filter((s) => s.stock > 0);
  const tabStop = chosen && chosen.stock > 0 ? chosen.eu : available[0]?.eu;

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const forward = e.key === "ArrowDown" || e.key === (rtl ? "ArrowLeft" : "ArrowRight");
    const backward = e.key === "ArrowUp" || e.key === (rtl ? "ArrowRight" : "ArrowLeft");
    if (!forward && !backward) return;
    e.preventDefault();
    const step = forward ? 1 : -1;
    for (let i = index + step; i >= 0 && i < shoe.sizes.length; i += step) {
      const next = shoe.sizes[i];
      if (next.stock > 0) {
        onChange(next.eu);
        cells.current.get(next.eu)?.focus();
        return;
      }
    }
  };

  return (
    <div className="pw-sizes">
      <div className="pw-sizes-head">
        <span id={id} className="pw-sizes-label" data-testid="pw-size-label">
          {chosen ? labels.sizeEcho(SYSTEM_NAMES[system], read(chosen)) : labels.size}
        </span>
        {systems.length > 1 ? (
          <div className="pw-systems" role="group" aria-label={labels.sizeSystem}>
            {systems.map((s) => (
              <button key={s} type="button" className="pw-system" aria-pressed={system === s} onClick={() => setSystem(s)}>
                {SYSTEM_NAMES[s]}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="pw-size-grid" role="radiogroup" aria-labelledby={id} ref={groupRef}>
        {shoe.sizes.map((size, index) => {
          const soldOut = size.stock <= 0;
          const selected = size.eu === value && !soldOut;
          return (
            <button
              key={size.eu}
              ref={(el) => {
                if (el) cells.current.set(size.eu, el);
                else cells.current.delete(size.eu);
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={soldOut || undefined}
              aria-label={soldOut ? `${SYSTEM_NAMES[system]} ${read(size)}, ${labels.soldOut}` : `${SYSTEM_NAMES[system]} ${read(size)}`}
              tabIndex={size.eu === tabStop ? 0 : -1}
              className="pw-size"
              onClick={() => {
                if (!soldOut) onChange(size.eu);
              }}
              onKeyDown={(e) => onKey(e, index)}
            >
              {read(size)}
              {soldOut ? (
                <svg className="pw-size-cross" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                  <line x1="0" y1="100" x2="100" y2="0" vectorEffect="non-scaling-stroke" />
                </svg>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="pw-sizes-foot">
        <span className="pw-size-note" data-hint={hint ? "true" : undefined} aria-live="polite">
          {hint ?? low ?? ""}
        </span>
        {onSizeGuide ? (
          <button type="button" className="pw-text-button" onClick={() => onSizeGuide(shoe)}>
            {labels.sizeGuide}
          </button>
        ) : null}
      </div>
    </div>
  );
}
