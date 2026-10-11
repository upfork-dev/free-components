"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, Layers, Rocket, SlidersHorizontal, X } from "lucide-react";
import { DemoProvider, useDemo } from "./use-demo-store";
import { TitleBar } from "./title-bar";
import { OutlinePanel } from "./outline-panel";
import { Canvas } from "./canvas";
import { PropertiesPanel } from "./properties-panel";
import { GhostTour } from "./ghost-cursor";

export type AppWindowProps = {
  productName?: string;
  projectName?: string;
  enableTour?: boolean;
  enableCollaborators?: boolean;
};

const PUBLISH_MS = 1200;
const LIVE_MS = 4000;

/**
 * The product demo: a macOS-style window running a small working copy of the builder. Its height never
 * depends on its content: 16:10 on large screens, a fixed 560px below.
 */
export function AppWindow({
  productName = "Nebula",
  projectName = "Aurora",
  enableTour = true,
  enableCollaborators = true,
}: AppWindowProps) {
  return (
    <DemoProvider productName={productName} projectName={projectName} enableCollaborators={enableCollaborators}>
      <Window enableTour={enableTour} />
    </DemoProvider>
  );
}

function Window({ enableTour }: { enableTour: boolean }) {
  const { state, dispatch, productName, projectName } = useDemo();
  const [sheet, setSheet] = useState<"layers" | "properties" | null>(null);
  const [toast, setToast] = useState(false);
  const [copied, setCopied] = useState<"domain" | "invite" | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const sheetOpener = useRef<HTMLButtonElement | null>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const domain = `${projectName}.${productName}.app`.toLowerCase();

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));

  /** Publish: spinner, a progress line across the title bar, "Live", a toast, then back to idle. */
  const publish = () => {
    if (state.publishState !== "idle") return; // ignore clicks while publishing or live
    dispatch({ type: "publish", phase: "publishing" });
    setAnnouncement("Publishing…");
    later(PUBLISH_MS, () => {
      dispatch({ type: "publish", phase: "live" });
      setToast(true);
      setAnnouncement(`Deployed to ${domain} in 0.8 seconds.`);
    });
    later(PUBLISH_MS + LIVE_MS, () => {
      dispatch({ type: "publish", phase: "idle" });
      setToast(false);
    });
  };

  const copy = async (text: string, what: "domain" | "invite") => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard blocked (insecure origin or denied): the feedback still shows, the demo stays calm */
    }
    setCopied(what);
    setAnnouncement(what === "invite" ? "Invite link copied." : `${domain} copied.`);
    later(1600, () => setCopied(null));
  };

  /** Undo and redo from the keyboard, only while focus is inside the demo and never while typing. */
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (event.key === "Escape" && sheet) {
      setSheet(null);
      sheetOpener.current?.focus();
      return;
    }
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") return;
    if (target.closest("[data-demo-typing]")) return;
    event.preventDefault();
    dispatch({ type: event.shiftKey ? "redo" : "undo" });
  };

  const openSheet = (which: "layers" | "properties", opener: HTMLButtonElement) => {
    sheetOpener.current = opener;
    setSheet((current) => (current === which ? null : which));
  };

  return (
    <div
      ref={windowRef}
      role="region"
      aria-label="Interactive product demo"
      dir="ltr"
      onKeyDown={onKeyDown}
      className="relative flex h-[560px] flex-col overflow-hidden rounded-2xl border border-(--ih-win-line) bg-(--ih-win) shadow-(--ih-win-shadow) backdrop-blur-xl lg:aspect-[16/10] lg:h-auto"
    >
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-linear-to-r from-transparent via-white/25 to-transparent" />
      <TitleBar onShare={() => copy(window.location.href, "invite")} onPublish={publish} inviteCopied={copied === "invite"} />

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[52px_minmax(0,1fr)_232px] lg:grid-cols-[224px_minmax(0,1fr)_248px]">
        <div className="hidden min-h-0 md:contents lg:hidden">
          <OutlinePanel variant="rail" />
        </div>
        <div className="hidden min-h-0 lg:contents">
          <OutlinePanel />
        </div>
        <Canvas />
        <div className="hidden min-h-0 md:contents">
          <PropertiesPanel />
        </div>
      </div>

      {/* Small screens: the canvas alone, with the outline and the properties as bottom sheets. */}
      <div className="absolute end-3 bottom-3 z-20 flex gap-2 md:hidden">
        <button
          type="button"
          aria-expanded={sheet === "layers"}
          onClick={(e) => openSheet("layers", e.currentTarget)}
          className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-(--ih-panel-line) bg-(--ih-panel) px-3 text-[11px] font-medium text-(--ih-panel-text) shadow-lg focus-visible:outline-2 focus-visible:outline-(--ih-selection)"
        >
          <Layers aria-hidden className="size-3.5" />
          Layers
        </button>
        <button
          type="button"
          aria-expanded={sheet === "properties"}
          onClick={(e) => openSheet("properties", e.currentTarget)}
          className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-(--ih-panel-line) bg-(--ih-panel) px-3 text-[11px] font-medium text-(--ih-panel-text) shadow-lg focus-visible:outline-2 focus-visible:outline-(--ih-selection)"
        >
          <SlidersHorizontal aria-hidden className="size-3.5" />
          Properties
        </button>
      </div>
      <AnimatePresence>
        {sheet && (
          <>
            <motion.button
              key="scrim"
              type="button"
              aria-label="Close panel"
              tabIndex={-1}
              onClick={() => setSheet(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 bg-black/40 md:hidden"
            />
            <motion.div
              key="sheet"
              role="dialog"
              aria-label={sheet === "layers" ? "Layers" : "Properties"}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              className="absolute inset-x-0 bottom-0 z-40 flex max-h-[72%] flex-col overflow-hidden rounded-t-2xl border-t border-(--ih-panel-line) bg-(--ih-panel) shadow-2xl md:hidden"
            >
              <div className="flex h-10 shrink-0 items-center justify-between px-3">
                <span aria-hidden className="absolute top-1.5 left-1/2 h-1 w-9 -translate-x-1/2 rounded-full bg-(--ih-panel-line)" />
                <span className="text-[12px] font-semibold text-(--ih-panel-text)">{sheet === "layers" ? "Layers" : "Properties"}</span>
                <button
                  type="button"
                  autoFocus
                  aria-label="Close panel"
                  onClick={() => {
                    setSheet(null);
                    sheetOpener.current?.focus();
                  }}
                  className="grid size-7 cursor-pointer place-items-center rounded-md text-(--ih-panel-text-2) hover:bg-(--ih-control) focus-visible:outline-2 focus-visible:outline-(--ih-selection)"
                >
                  <X aria-hidden className="size-4" />
                </button>
              </div>
              <div className="grid min-h-0 flex-1 overflow-y-auto [&>div]:border-0">
                {sheet === "layers" ? <OutlinePanel /> : <PropertiesPanel />}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* The deploy toast. The domain is plain text: it's a demo. */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className="absolute end-3 bottom-14 z-30 flex items-center gap-3 rounded-xl border border-(--ih-panel-line) bg-(--ih-panel) py-2.5 ps-3 pe-2 text-[12px] text-(--ih-panel-text) shadow-2xl md:bottom-4 md:end-[264px] lg:end-[264px]"
          >
            <span className="grid size-7 place-items-center rounded-lg bg-emerald-500/15 text-emerald-500">
              <Rocket aria-hidden className="size-3.5" />
            </span>
            <span>
              Deployed to <span className="font-mono font-medium">{domain}</span>
              <span className="text-(--ih-panel-text-2)"> · 0.8s</span>
            </span>
            <button
              type="button"
              onClick={() => copy(domain, "domain")}
              aria-label={`Copy ${domain}`}
              className="flex h-7 cursor-pointer items-center gap-1 rounded-md px-2 text-[11px] font-medium text-(--ih-panel-text-2) hover:bg-(--ih-control) hover:text-(--ih-panel-text) focus-visible:outline-2 focus-visible:outline-(--ih-selection)"
            >
              {copied === "domain" ? <Check aria-hidden className="size-3.5 text-emerald-500" /> : <Copy aria-hidden className="size-3.5" />}
              {copied === "domain" ? "Copied" : "Copy"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <GhostTour windowRef={windowRef} publish={publish} enabled={enableTour} />

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
