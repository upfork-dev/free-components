"use client";

import { forwardRef } from "react";
import { contrastInk } from "./lighting";

export type PillState = "needs-size" | "ready" | "adding" | "added" | "error" | "another";

export type AddToBagPillProps = {
  state: PillState;
  labels: Record<PillState, string>;
  /** The shoe's colour, and the text colour that passes contrast on it. */
  color: string;
  ink: string;
  onClick: () => void;
};

/**
 * One fixed size, whatever it says. Nothing around it moves. Its sweep is a transform only, its text swaps inside a
 * fixed-height mask, and its outline is an SVG stroke rather than a masked ring.
 */
export const AddToBagPill = forwardRef<HTMLButtonElement, AddToBagPillProps>(function AddToBagPill({ state, labels, color, ink, onClick }, ref) {
  const busy = state === "adding";
  return (
    <button
      ref={ref}
      type="button"
      className="fl-pill"
      data-state={state}
      aria-busy={busy || undefined}
      style={{ "--fl-pill-fill": color, "--fl-pill-ink": ink, "--fl-pill-base": contrastInk(ink) } as React.CSSProperties}
      onClick={() => {
        if (!busy) onClick();
      }}
    >
      {/* No viewBox: a stretched one turns round ends into points on a wide pill. */}
      <svg className="fl-pill-line" aria-hidden="true">
        <rect width="100%" height="100%" rx="27.25" ry="27.25" />
      </svg>
      <span className="fl-pill-sweep" aria-hidden="true" />
      <span className="fl-pill-text">
        {/* Every label is present; only the one in use is visible, so the button never changes size. */}
        {(Object.keys(labels) as PillState[]).map((key) => (
          <span key={key} className="fl-pill-label" data-show={key === state || undefined} aria-hidden={key !== state}>
            {labels[key]}
          </span>
        ))}
      </span>
      <span className="fl-pill-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
          <path className="fl-pill-plus" d="M12 5v14M5 12h14" />
          <path className="fl-pill-check" d="M5 12.5l4.5 4.5L19 7.5" pathLength="1" />
        </svg>
      </span>
    </button>
  );
});
