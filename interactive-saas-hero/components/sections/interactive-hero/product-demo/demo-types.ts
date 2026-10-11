export type Breakpoint = "Desktop" | "Tablet" | "Mobile";
export type NodeId = "Header" | "Hero" | "Features" | "Pricing" | "Testimonials";
export type Position = "Top" | "Center" | "Bottom";
export type SizeMode = "Fill" | "Fit" | "Fixed" | "Min";
export type Blend = "Normal" | "Overlay" | "Screen";
export type HeroVisual = "Ring" | "Orb" | "Prism";
export type PublishState = "idle" | "publishing" | "live";

/** Everything the demo shows. The default is the initial render and the reset target of the tour. */
export type DemoState = {
  selectedNode: NodeId;
  breakpoint: Breakpoint;
  position: Position;
  sizeMode: SizeMode;
  blur: number;
  glow: number;
  blend: Blend;
  heroVisual: HeroVisual;
  publishState: PublishState;
};

export const DEFAULT_STATE: DemoState = {
  selectedNode: "Hero",
  breakpoint: "Desktop",
  position: "Bottom",
  sizeMode: "Fit",
  blur: 8,
  glow: 20,
  blend: "Overlay",
  heroVisual: "Ring",
  publishState: "idle",
};

export const BREAKPOINT_WIDTH: Record<Breakpoint, number> = { Desktop: 1200, Tablet: 768, Mobile: 390 };
export const NODES: NodeId[] = ["Header", "Hero", "Features", "Pricing", "Testimonials"];
export const VISUALS: HeroVisual[] = ["Ring", "Orb", "Prism"];
