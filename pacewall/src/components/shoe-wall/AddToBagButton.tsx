"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { defaultLabels } from "./labels";
import type { ShoeWallLabels } from "./types";

export type AddState = "needs-size" | "ready" | "adding" | "added" | "again" | "error" | "sold-out";

export type AddToBagButtonProps = {
  /** No size chosen yet. */
  needsSize: boolean;
  soldOut?: boolean;
  /** Resolves when the bag has it. A rejected promise shows the error state. */
  onAdd: () => void | Promise<void>;
  /** The size is missing: move focus to the sizes and give them a soft pulse. */
  onNeedSize?: () => void;
  /** Changes when the size does: the button goes back to ready at once. */
  sizeKey?: string | null;
  labels?: Partial<ShoeWallLabels>;
  onStateChange?: (state: AddState) => void;
};

const MIN_ADDING = 350;
const AGAIN_AFTER = 2400;

/** One fixed size. No state ever moves anything around it. */
export function AddToBagButton({ needsSize, soldOut, onAdd, onNeedSize, sizeKey, labels: given, onStateChange }: AddToBagButtonProps) {
  const labels = { ...defaultLabels, ...given };
  const [phase, setPhase] = useState<"idle" | "adding" | "added" | "again" | "error">("idle");
  const timer = useRef<number>(0);
  const busy = useRef(false);

  // A different size means a fresh start.
  const [lastSize, setLastSize] = useState(sizeKey);
  if (lastSize !== sizeKey) {
    setLastSize(sizeKey);
    setPhase("idle");
  }

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const state: AddState = soldOut ? "sold-out" : needsSize ? "needs-size" : phase === "idle" ? "ready" : phase;

  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  const click = useCallback(async () => {
    if (soldOut) return;
    if (needsSize) {
      onNeedSize?.();
      return;
    }
    if (busy.current) return; // A double click is one click.
    busy.current = true;
    setPhase("adding");
    const started = performance.now();
    let failed = false;
    try {
      await onAdd();
    } catch {
      failed = true;
    }
    const left = MIN_ADDING - (performance.now() - started);
    if (left > 0) await new Promise((r) => window.setTimeout(r, left));
    busy.current = false;
    if (failed) {
      setPhase("error");
      return;
    }
    setPhase("added");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPhase("again"), AGAIN_AFTER);
  }, [needsSize, onAdd, onNeedSize, soldOut]);

  const text: Record<AddState, string> = {
    "needs-size": labels.chooseSize,
    ready: labels.addToBag,
    adding: labels.adding,
    added: labels.inBag,
    again: labels.addAnother,
    error: labels.addFailed,
    "sold-out": labels.soldOutButton,
  };

  return (
    <button
      type="button"
      className="pw-add"
      data-state={state}
      data-testid="pw-add"
      aria-disabled={state === "sold-out" || undefined}
      aria-busy={state === "adding" || undefined}
      onClick={click}
    >
      <span className="pw-add-text" key={state}>
        {state === "added" ? (
          <svg className="pw-add-check" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M2.5 8.5 6.5 12.5 13.5 4" pathLength={1} />
          </svg>
        ) : null}
        {text[state]}
      </span>
      <span className="pw-add-sweep" aria-hidden />
    </button>
  );
}
