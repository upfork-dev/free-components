import type { Design } from "./use-demo-store";

/**
 * The ghost-cursor tour as data. Targets are data-tour-id attributes, located with getBoundingClientRect at
 * every step (so resizing never breaks the tour). The tour's changes go through the same store as a visitor's,
 * but are never recorded in the undo history.
 */
export type TourStep =
  | { kind: "click"; target: string; patch: Partial<Design> }
  | { kind: "drag"; target: string; field: "glow" | "blur"; min: number; max: number; from: number; to: number }
  | { kind: "publish"; target: string }
  | { kind: "wait"; ms: number }
  | { kind: "waitForLive" }
  | { kind: "reset" };

export const TOUR: TourStep[] = [
  { kind: "click", target: "node-Hero", patch: { selectedNode: "Hero" } },
  { kind: "click", target: "position-Center", patch: { position: "Center" } },
  { kind: "drag", target: "slider-glow", field: "glow", min: 0, max: 60, from: 20, to: 50 },
  { kind: "click", target: "bp-Mobile", patch: { breakpoint: "Mobile" } },
  { kind: "wait", ms: 700 },
  { kind: "publish", target: "publish" },
  { kind: "waitForLive" },
  { kind: "wait", ms: 900 },
  { kind: "click", target: "bp-Desktop", patch: { breakpoint: "Desktop" } },
  { kind: "wait", ms: 900 },
  { kind: "reset" },
];

/** Idle time before the tour starts, and before it resumes after a visitor's interaction. */
export const TOUR_START_IDLE_MS = 4000;
export const TOUR_RESUME_IDLE_MS = 10000;
/** Pause between two runs of the tour. */
export const TOUR_LOOP_PAUSE_MS = 2500;
