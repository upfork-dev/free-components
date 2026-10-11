"use client";

import { Check, Loader2 } from "lucide-react";
import { useDemo } from "./use-demo-store";

/** Publish: a spinner while deploying, then a green "Live". The flow itself lives in the app window. */
export function PublishButton({ onPublish }: { onPublish?: () => void }) {
  const { state } = useDemo();
  const phase = state.publishState;
  return (
    <button
      type="button"
      onClick={onPublish}
      aria-disabled={phase !== "idle" || undefined}
      data-tour-id="publish"
      className={`inline-flex h-7 min-w-[78px] cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 text-[11px] font-semibold text-white transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ih-selection) ${
        phase === "live" ? "bg-emerald-600" : "bg-(--ih-selection) hover:brightness-110"
      }`}
    >
      {phase === "publishing" && <Loader2 aria-hidden className="size-3 animate-spin motion-reduce:animate-none" />}
      {phase === "live" && <Check aria-hidden className="size-3" />}
      {phase === "idle" ? "Publish" : phase === "publishing" ? "Publishing" : "Live"}
    </button>
  );
}
