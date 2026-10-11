"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { SecondaryCta } from "./secondary-cta";

/** YouTube and Vimeo links become embed URLs; anything else plays as a file in <video>. */
function embedOf(src: string) {
  const youtube = src.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (youtube) return `https://www.youtube-nocookie.com/embed/${youtube[1]}?autoplay=1&rel=0`;
  const vimeo = src.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1`;
  return null;
}

/**
 * "Watch demo": a glass button that opens an accessible modal (a native <dialog>: focus is trapped while it
 * is open and returns to the button after) with a 16:9 video, loaded only once the dialog opens.
 * Escape and a click on the backdrop close it.
 */
export function VideoCta({ label, videoSrc }: { label: string; videoSrc: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const embed = embedOf(videoSrc);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <>
      <SecondaryCta
        label={label}
        onClick={() => {
          setLoaded(true);
          setOpen(true);
        }}
      />
      <dialog
        ref={dialog}
        aria-label={label}
        onClose={() => setOpen(false)}
        onClick={(event) => event.target === event.currentTarget && setOpen(false)}
        className="m-auto w-[min(960px,calc(100vw-32px))] overflow-visible bg-transparent p-0 backdrop:bg-black/70 backdrop:backdrop-blur-sm open:animate-[ih-dialog-in_0.25s_ease-out]"
      >
        <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
          {open &&
            loaded &&
            (embed ? (
              <iframe
                src={embed}
                title={label}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                className="size-full"
              />
            ) : (
              <video src={videoSrc} controls autoPlay playsInline className="size-full object-contain" />
            ))}
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close video"
          className="absolute -end-3 -top-3 grid size-9 cursor-pointer place-items-center rounded-full border border-white/15 bg-zinc-900 text-white shadow-lg transition-colors hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:-end-4 sm:-top-4"
        >
          <X aria-hidden className="size-4" />
        </button>
      </dialog>
    </>
  );
}
