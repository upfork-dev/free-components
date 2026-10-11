"use client";

import { AnimatePresence, motion } from "motion/react";
import { Monitor, Redo2, Smartphone, Tablet, Undo2 } from "lucide-react";
import type { CSSProperties } from "react";
import { useDemo } from "./use-demo-store";
import { BREAKPOINT_WIDTH, type Breakpoint, type NodeId, type SizeMode } from "./demo-types";
import { HeroVisual } from "./hero-visual";
import { CollaboratorCursors } from "./collaborator-cursors";
import { onRadioKeys } from "./radio-keys";

const BREAKPOINTS: { id: Breakpoint; Icon: typeof Monitor }[] = [
  { id: "Desktop", Icon: Monitor },
  { id: "Tablet", Icon: Tablet },
  { id: "Mobile", Icon: Smartphone },
];

/**
 * Caption card width per Size mode: Fill spans the hero (minus padding), Fit shrinks to its content up to 70%,
 * Fixed is 360px at the 1200px design width (scaled with the frame: cqw is the frame's width), Min is compact.
 */
const CAPTION_SIZE: Record<SizeMode, CSSProperties> = {
  Fill: { width: "calc(100% - 2 * var(--pad))" },
  Fit: { width: "fit-content", maxWidth: "70%" },
  Fixed: { width: "calc(360 / 1200 * 100cqw)", maxWidth: "calc(100% - 2 * var(--pad))" },
  Min: { width: "fit-content", maxWidth: "70%" },
};

/** The center of the studio: breakpoints, undo/redo, and a live preview frame of the page. */
export function Canvas() {
  const { state, dispatch, canUndo, canRedo, enableCollaborators } = useDemo();
  const width = BREAKPOINT_WIDTH[state.breakpoint];
  // The frame is as wide as the real width allows: 1200px fills the canvas, 768px is 64%, 390px is 32.5%.
  const framePercent = (width / 1200) * 100;

  return (
    <div className="flex min-h-0 min-w-0 flex-col bg-(--ih-canvas)">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-(--ih-panel-line) bg-(--ih-panel) px-2.5">
        <div role="radiogroup" aria-label="Breakpoint" onKeyDown={onRadioKeys} className="flex rounded-lg bg-(--ih-control) p-0.5">
          {BREAKPOINTS.map(({ id, Icon }) => {
            const active = state.breakpoint === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={active}
                tabIndex={active ? 0 : -1}
                aria-label={id}
                onClick={() => dispatch({ type: "set", patch: { breakpoint: id } })}
                data-tour-id={`bp-${id}`}
                className={`flex h-6 cursor-pointer items-center gap-1.5 rounded-md px-2 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-(--ih-selection) ${
                  active
                    ? "bg-(--ih-control-active) text-(--ih-panel-text) shadow-sm"
                    : "text-(--ih-panel-text-2) hover:text-(--ih-panel-text)"
                }`}
              >
                <Icon aria-hidden className="size-3.5" />
                <span className="hidden xl:inline">{id}</span>
              </button>
            );
          })}
        </div>
        <span className="font-mono text-[11px] text-(--ih-panel-text-2) tabular-nums" aria-live="polite">
          {width}
        </span>
        <div className="ms-auto flex items-center gap-0.5">
          <button
            type="button"
            aria-label="Undo"
            disabled={!canUndo}
            onClick={() => dispatch({ type: "undo" })}
            className="grid size-7 cursor-pointer place-items-center rounded-md text-(--ih-panel-text-2) enabled:hover:bg-(--ih-control) enabled:hover:text-(--ih-panel-text) disabled:cursor-default disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-(--ih-selection)"
          >
            <Undo2 aria-hidden className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label="Redo"
            disabled={!canRedo}
            onClick={() => dispatch({ type: "redo" })}
            className="grid size-7 cursor-pointer place-items-center rounded-md text-(--ih-panel-text-2) enabled:hover:bg-(--ih-control) enabled:hover:text-(--ih-panel-text) disabled:cursor-default disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-(--ih-selection)"
          >
            <Redo2 aria-hidden className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden px-4 pt-9 pb-14 sm:px-6 sm:pt-10 md:pb-6" data-tour-id="canvas">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,var(--ih-panel-line)_1px,transparent_1.2px)] bg-size-[16px_16px]"
        />
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 260, damping: 32 }}
          className="@container relative mx-auto h-full"
          style={{ width: `max(${framePercent}%, 240px)`, maxWidth: "100%" } as CSSProperties}
        >
          <div className="relative h-full overflow-hidden rounded-lg border border-(--ih-site-line) bg-(--ih-site) shadow-[0_20px_50px_-30px_rgb(0_0_0/0.5)]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={state.selectedNode}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="absolute inset-0"
              >
                <SitePreview node={state.selectedNode} />
              </motion.div>
            </AnimatePresence>
          </div>
          <Selection label={`${state.selectedNode} · ${width} × Auto`} />
        </motion.div>
        {enableCollaborators && <CollaboratorCursors />}
      </div>
    </div>
  );
}

/** The blue selection: an outline with corner handles and a label chip. */
function Selection({ label }: { label: string }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 rounded-lg ring-[1.5px] ring-(--ih-selection)">
      {["-top-1 -left-1", "-top-1 -right-1", "-bottom-1 -left-1", "-bottom-1 -right-1"].map((pos) => (
        <span key={pos} className={`absolute ${pos} size-2 rounded-[2px] border-[1.5px] border-(--ih-selection) bg-white`} />
      ))}
      <span className="absolute -top-6 left-0 rounded bg-(--ih-selection) px-1.5 py-0.5 font-mono text-[10px] whitespace-nowrap text-white">
        {label}
      </span>
    </div>
  );
}

/** A mini website, CSS only, reflowing with container queries (so Mobile really is a mobile layout). */
function SitePreview({ node }: { node: NodeId }) {
  return (
    <div className="flex h-full flex-col text-(--ih-site-text)">
      <MiniNav />
      <div className="relative min-h-0 flex-1">
        {node === "Hero" && <HeroPreview />}
        {node === "Header" && <HeaderPreview />}
        {node === "Features" && <FeaturesPreview />}
        {node === "Pricing" && <PricingPreview />}
        {node === "Testimonials" && <TestimonialsPreview />}
      </div>
    </div>
  );
}

function MiniNav() {
  return (
    <div className="flex h-9 shrink-0 items-center gap-3 border-b border-(--ih-site-line) px-3 @md:h-10 @md:px-5">
      <span className="flex items-center gap-1.5 text-[10px] font-semibold @md:text-[11px]">
        <span className="size-3 rounded-[4px] bg-linear-to-br from-(--ih-cta-from) to-(--ih-cta-to)" />
        Orion
      </span>
      <span className="ms-auto hidden gap-3 @md:flex">
        {[28, 36, 24, 30].map((w) => (
          <span key={w} className="h-1.5 rounded-full bg-(--ih-site-block)" style={{ width: w }} />
        ))}
      </span>
      <span className="ms-auto h-4 w-10 rounded-full bg-(--ih-selection) @md:ms-0" />
    </div>
  );
}

function HeroPreview() {
  const { state } = useDemo();
  const justify = { Top: "start", Center: "center", Bottom: "end" }[state.position];
  return (
    <div className="absolute inset-0 grid overflow-hidden [--pad:12px] @md:[--pad:20px]" style={{ alignItems: justify, padding: "var(--pad)" } as CSSProperties}>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <HeroVisual
          visual={state.heroVisual}
          glow={state.glow}
          blend={state.blend}
          className="w-[52%] max-w-[300px] @md:w-[38%]"
        />
      </div>
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 300, damping: 34 }}
        data-tour-id="caption"
        className="relative mx-auto rounded-xl border border-(--ih-site-glass-line) bg-(--ih-site-glass) p-3 text-start shadow-[0_10px_30px_-12px_rgb(0_0_0/0.35)] @md:rounded-2xl @md:p-4"
        style={{
          ...CAPTION_SIZE[state.sizeMode],
          backdropFilter: `blur(${state.blur}px) saturate(140%)`,
          WebkitBackdropFilter: `blur(${state.blur}px) saturate(140%)`,
        }}
      >
        <p className="text-[12px] font-semibold text-(--ih-site-text) @md:text-[15px]">Orion Canvas</p>
        {state.sizeMode !== "Min" && (
          <p className="mt-1 text-[10px] leading-snug text-(--ih-site-text-2) @md:text-[11.5px]">
            A limitless canvas with modern layout, motion, and type features—ready for production.
          </p>
        )}
        <div className="mt-2.5 flex gap-1.5">
          <span className="rounded-md bg-(--ih-selection) px-2 py-1 text-[9.5px] font-medium text-white @md:text-[10.5px]">Auto layout</span>
          {state.sizeMode !== "Min" && (
            <span className="rounded-md bg-(--ih-site-block) px-2 py-1 text-[9.5px] font-medium @md:text-[10.5px]">Drag</span>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function HeaderPreview() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
      <div className="h-2.5 w-3/5 rounded-full bg-(--ih-site-block)" />
      <div className="h-2 w-2/5 rounded-full bg-(--ih-site-block)" />
      <div className="mt-2 flex gap-2">
        <span className="h-5 w-16 rounded-full bg-(--ih-selection)/80" />
        <span className="h-5 w-16 rounded-full bg-(--ih-site-block)" />
      </div>
    </div>
  );
}

function FeaturesPreview() {
  return (
    <div className="grid h-full grid-cols-1 content-center gap-2.5 p-4 @md:grid-cols-3 @md:p-6">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-(--ih-site-line) p-3">
          <span className="block size-5 rounded-md bg-(--ih-selection)/25" />
          <span className="mt-3 block h-2 w-3/4 rounded-full bg-(--ih-site-block)" />
          <span className="mt-2 block h-1.5 w-full rounded-full bg-(--ih-site-block)" />
          <span className="mt-1.5 hidden h-1.5 w-5/6 rounded-full bg-(--ih-site-block) @md:block" />
        </div>
      ))}
    </div>
  );
}

function PricingPreview() {
  return (
    <div className="grid h-full grid-cols-1 content-center gap-2.5 p-4 @md:grid-cols-3 @md:p-6">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`rounded-xl border p-3 ${i === 1 ? "border-(--ih-selection) bg-(--ih-selection)/5" : "border-(--ih-site-line)"}`}
        >
          <span className="block h-1.5 w-10 rounded-full bg-(--ih-site-block)" />
          <span className="mt-2 block h-3.5 w-14 rounded bg-(--ih-site-text)/70" />
          {[0, 1, 2].map((r) => (
            <span key={r} className="mt-2 hidden h-1.5 w-full rounded-full bg-(--ih-site-block) @md:block" />
          ))}
          <span className={`mt-3 block h-4 w-full rounded-md ${i === 1 ? "bg-(--ih-selection)" : "bg-(--ih-site-block)"}`} />
        </div>
      ))}
    </div>
  );
}

function TestimonialsPreview() {
  return (
    <div className="grid h-full grid-cols-1 content-center gap-2.5 p-4 @md:grid-cols-2 @md:p-6">
      {[0, 1].map((i) => (
        <div key={i} className={`rounded-xl border border-(--ih-site-line) p-3 ${i === 1 ? "hidden @md:block" : ""}`}>
          <span className="block h-1.5 w-full rounded-full bg-(--ih-site-block)" />
          <span className="mt-1.5 block h-1.5 w-11/12 rounded-full bg-(--ih-site-block)" />
          <span className="mt-1.5 block h-1.5 w-2/3 rounded-full bg-(--ih-site-block)" />
          <span className="mt-3 flex items-center gap-2">
            <span className="size-5 rounded-full bg-(--ih-selection)/30" />
            <span className="h-1.5 w-16 rounded-full bg-(--ih-site-block)" />
          </span>
        </div>
      ))}
    </div>
  );
}
