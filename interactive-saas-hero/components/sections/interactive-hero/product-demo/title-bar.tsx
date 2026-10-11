"use client";

import { Share2 } from "lucide-react";
import { useDemo } from "./use-demo-store";
import { COLLABORATORS } from "./collaborators";
import { PublishButton } from "./publish-button";

/** The window's title bar: traffic lights, the studio chip, who else is here, Share and Publish. */
export function TitleBar({
  onShare,
  onPublish,
  inviteCopied = false,
}: {
  onShare?: () => void;
  onPublish?: () => void;
  inviteCopied?: boolean;
}) {
  const { productName, projectName, state } = useDemo();
  return (
    <div className="relative flex h-11 shrink-0 items-center gap-3 border-b border-(--ih-panel-line) bg-(--ih-bar) px-3.5">
      <div className="flex gap-1.5" aria-hidden>
        <span className="size-3 rounded-full bg-[#ff5f57]" />
        <span className="size-3 rounded-full bg-[#febc2e]" />
        <span className="size-3 rounded-full bg-[#28c840]" />
      </div>
      <p className="ms-2 hidden min-w-0 truncate rounded-md bg-(--ih-control) px-2.5 py-1 text-[11px] font-medium text-(--ih-panel-text-2) sm:block">
        <span className="text-(--ih-panel-text)">{productName} Studio</span> — Project: {projectName}
      </p>
      <div className="ms-auto flex items-center gap-2">
        <div className="me-1 hidden -space-x-1.5 md:flex" aria-label="Also here: Sara and Alex">
          {COLLABORATORS.map((c) => (
            // eslint-disable-next-line @next/next/no-img-element -- 22px presence avatars
            <img
              key={c.name}
              src={c.avatar}
              alt={c.name}
              title={c.name}
              width={22}
              height={22}
              loading="lazy"
              className="size-[22px] rounded-full object-cover ring-2"
              style={{ ["--tw-ring-color" as string]: c.color }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={onShare}
          aria-label="Copy invite link"
          className="group relative grid size-7 cursor-pointer place-items-center rounded-md text-(--ih-panel-text-2) transition-colors hover:bg-(--ih-control) hover:text-(--ih-panel-text) focus-visible:outline-2 focus-visible:outline-(--ih-selection)"
          data-tour-id="share"
        >
          <Share2 aria-hidden className="size-3.5" />
          <span
            aria-hidden
            className={`pointer-events-none absolute top-full right-0 z-30 mt-2 rounded-md bg-(--ih-panel-text) px-2 py-1 text-[11px] font-medium whitespace-nowrap text-(--ih-panel) shadow-lg transition-all duration-200 ${
              inviteCopied ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
            }`}
          >
            Invite link copied
          </span>
        </button>
        <PublishButton onPublish={onPublish} />
      </div>
      {/* A thin progress line across the bar while publishing. */}
      <span
        aria-hidden
        className={`absolute inset-x-0 bottom-0 h-px origin-left bg-(--ih-selection) transition-transform ${
          state.publishState === "publishing" ? "scale-x-100 duration-[1200ms] ease-out" : "scale-x-0 duration-0"
        }`}
      />
    </div>
  );
}
