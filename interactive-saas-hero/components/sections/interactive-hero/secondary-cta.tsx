"use client";

import { Play } from "lucide-react";

/** The secondary call to action: a glass button with a play icon in a softly pulsing ring. */
export function SecondaryCta({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex h-12 cursor-pointer items-center justify-center gap-3 rounded-full border border-(--ih-glass-line) bg-(--ih-glass) ps-2 pe-5 text-sm font-semibold text-(--ih-text) backdrop-blur-md transition-colors duration-300 hover:bg-(--ih-glass-hover) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--ih-accent)"
    >
      <span className="relative grid size-8 place-items-center rounded-full bg-(--ih-glass-hover)">
        <span aria-hidden className="ih-play-ring" />
        <Play aria-hidden className="size-3.5 translate-x-px fill-current" />
      </span>
      {label}
    </button>
  );
}
