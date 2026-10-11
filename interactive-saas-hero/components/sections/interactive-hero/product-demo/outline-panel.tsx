"use client";

import { useState, type ComponentType } from "react";
import { motion } from "motion/react";
import { CreditCard, LayoutGrid, MessageSquareQuote, Monitor, PanelTop, Search, Sparkles, X } from "lucide-react";
import { useDemo } from "./use-demo-store";
import { BREAKPOINT_WIDTH, NODES, VISUALS, type NodeId } from "./demo-types";
import { HeroVisual } from "./hero-visual";
import { onRadioKeys } from "./radio-keys";

export const NODE_ICON: Record<NodeId, { Icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>; color: string }> = {
  Header: { Icon: PanelTop, color: "#38bdf8" },
  Hero: { Icon: Sparkles, color: "#a78bfa" },
  Features: { Icon: LayoutGrid, color: "#34d399" },
  Pricing: { Icon: CreditCard, color: "#fbbf24" },
  Testimonials: { Icon: MessageSquareQuote, color: "#f472b6" },
};

/**
 * The outline: the page's layers (click to select, search to filter) and the hero's assets.
 * `variant="rail"` is the icon-only column of medium screens.
 */
export function OutlinePanel({ variant = "full" }: { variant?: "full" | "rail" }) {
  const { state, dispatch } = useDemo();
  const [query, setQuery] = useState<string | null>(null);
  const shown = NODES.filter((n) => !query || n.toLowerCase().includes(query.toLowerCase()));
  const select = (node: NodeId) => dispatch({ type: "set", patch: { selectedNode: node } });

  if (variant === "rail") {
    return (
      <nav aria-label="Layers" className="flex flex-col items-center gap-1 border-e border-(--ih-panel-line) bg-(--ih-panel) py-3">
        {NODES.map((node) => {
          const { Icon, color } = NODE_ICON[node];
          const active = state.selectedNode === node;
          return (
            <button
              key={node}
              type="button"
              aria-label={node}
              aria-pressed={active}
              onClick={() => select(node)}
              data-tour-id={`node-${node}`}
              className={`group relative grid size-9 cursor-pointer place-items-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-(--ih-selection) ${
                active ? "bg-(--ih-control-active)" : "hover:bg-(--ih-control)"
              }`}
            >
              <span style={{ color }}>
                <Icon aria-hidden className="size-4" />
              </span>
              <span className="pointer-events-none absolute start-full z-20 ms-2 rounded-md bg-(--ih-panel-text) px-2 py-1 text-[11px] font-medium whitespace-nowrap text-(--ih-panel) opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                {node}
              </span>
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <div className="flex min-h-0 flex-col border-e border-(--ih-panel-line) bg-(--ih-panel) text-(--ih-panel-text)">
      <div className="flex h-10 shrink-0 items-center justify-between px-3">
        {query === null ? (
          <>
            <span className="text-[11px] font-semibold tracking-wide text-(--ih-panel-text-2) uppercase">Layers</span>
            <button
              type="button"
              aria-label="Search layers"
              onClick={() => setQuery("")}
              className="grid size-6 cursor-pointer place-items-center rounded-md text-(--ih-panel-text-2) hover:bg-(--ih-control) hover:text-(--ih-panel-text) focus-visible:outline-2 focus-visible:outline-(--ih-selection)"
            >
              <Search aria-hidden className="size-3.5" />
            </button>
          </>
        ) : (
          <div className="flex w-full items-center gap-1.5 rounded-md bg-(--ih-control) px-2">
            <Search aria-hidden className="size-3.5 shrink-0 text-(--ih-panel-text-2)" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setQuery(null)}
              aria-label="Filter layers"
              placeholder="Filter layers"
              data-demo-typing=""
              className="h-7 min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-(--ih-panel-text-2)"
            />
            <button
              type="button"
              aria-label="Close search"
              onClick={() => setQuery(null)}
              className="grid size-5 cursor-pointer place-items-center rounded text-(--ih-panel-text-2) hover:text-(--ih-panel-text)"
            >
              <X aria-hidden className="size-3" />
            </button>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] font-medium">
          <Monitor aria-hidden className="size-3.5 text-(--ih-panel-text-2)" />
          <span className="truncate">
            {state.breakpoint} — {BREAKPOINT_WIDTH[state.breakpoint]}
          </span>
          <span className="ms-auto rounded bg-(--ih-selection)/15 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-(--ih-selection) uppercase">
            Primary
          </span>
        </div>
        <ul className="mt-0.5 space-y-0.5 ps-3" aria-label="Layers">
          {shown.map((node) => {
            const { Icon, color } = NODE_ICON[node];
            const active = state.selectedNode === node;
            return (
              <li key={node}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => select(node)}
                  data-tour-id={`node-${node}`}
                  className="relative flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-start text-[12px] focus-visible:outline-2 focus-visible:outline-(--ih-selection)"
                >
                  {active && (
                    <motion.span
                      layoutId="ih-outline-pill"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                      className="absolute inset-0 rounded-md bg-(--ih-selection)/15 ring-1 ring-(--ih-selection)/40"
                    />
                  )}
                  <span className="relative" style={{ color }}>
                    <Icon aria-hidden className="size-3.5" />
                  </span>
                  <span className={`relative ${active ? "text-(--ih-panel-text)" : "text-(--ih-panel-text-2)"}`}>{node}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {shown.length === 0 && <p className="px-3 py-3 text-[12px] text-(--ih-panel-text-2)">No layers found</p>}
      </div>

      <div className="shrink-0 border-t border-(--ih-panel-line) p-3">
        <p className="text-[11px] font-semibold tracking-wide text-(--ih-panel-text-2) uppercase">Assets</p>
        <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Hero visual" onKeyDown={onRadioKeys}>
          {VISUALS.map((visual) => {
            const active = state.heroVisual === visual;
            return (
              <button
                key={visual}
                type="button"
                role="radio"
                aria-checked={active}
                tabIndex={active ? 0 : -1}
                onClick={() => dispatch({ type: "set", patch: { heroVisual: visual } })}
                className={`group flex cursor-pointer flex-col items-center gap-1 rounded-lg p-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-(--ih-selection) ${
                  active ? "bg-(--ih-control-active) ring-1 ring-(--ih-selection)" : "hover:bg-(--ih-control)"
                }`}
              >
                <span className="grid aspect-square w-full place-items-center overflow-hidden rounded-md bg-(--ih-canvas)">
                  <HeroVisual visual={visual} glow={10} className="w-[62%]" />
                </span>
                <span className="text-[10px] text-(--ih-panel-text-2)">{visual}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
