"use client";
/* eslint-disable @next/next/no-img-element -- A plain <img> by default, so this installs in any project. */

import { useLayoutEffect, useRef, type ReactNode, type SyntheticEvent } from "react";
import type { RenderImageProps, ShoePhoto } from "./types";

type Props = {
  photo: ShoePhoto;
  sizes: string;
  index: number;
  eager: boolean;
  high: boolean;
  renderImage?: (p: RenderImageProps) => ReactNode;
  className?: string;
};

function ready(img: HTMLImageElement, how: "now" | "fade") {
  if (!img.dataset.ready) img.dataset.ready = how;
}

const ASK_AGAIN_MS = [300, 900, 2000, 4000, 8000];
const failing = new Set<HTMLImageElement>();

function askAll() {
  failing.forEach(ask);
}

function forget(img: HTMLImageElement) {
  failing.delete(img);
  if (failing.size === 0) {
    window.removeEventListener("resize", askAll);
    document.removeEventListener("visibilitychange", askAll);
  }
}

/**
 * Has it got a picture after all? `naturalWidth` alone cannot say: in a window with no size, as in a
 * hidden pane, `sizes` works out to 0 and a picture that loaded fine reads 0 wide. `decode()` can: it
 * resolves for a real picture and rejects for a broken one.
 */
function ask(img: HTMLImageElement) {
  if (!img.isConnected || img.dataset.error === undefined) {
    forget(img);
    return;
  }
  const answer = img.naturalWidth > 0 ? Promise.resolve() : img.decode ? img.decode() : Promise.reject(new Error("no decode"));
  answer.then(
    () => {
      clearFailed(img);
      ready(img, "now");
    },
    () => undefined,
  );
}

/** A load is the last word: a picture that has its pixels always shows. */
export function clearFailed(img: HTMLImageElement) {
  delete img.dataset.error;
  forget(img);
}

/**
 * Hide it now, so a real failure never shows a broken icon or alt text, and keep asking. "Complete, with
 * no pixels" and a stray error event can both be passing states, and when the pixels come the load
 * event may already have gone. So being hidden here is never final, however late the answer comes.
 */
export function markFailed(img: HTMLImageElement) {
  img.dataset.error = "";
  if (failing.has(img)) return;
  if (failing.size === 0) {
    window.addEventListener("resize", askAll);
    document.addEventListener("visibilitychange", askAll);
  }
  failing.add(img);
  ask(img);
  for (const wait of ASK_AGAIN_MS) window.setTimeout(() => ask(img), wait);
}

/** The shoe's picture. A first-screen picture is marked ready from the server so LCP never waits for hydration. */
export function ShoeImage({ photo, sizes, index, eager, high, renderImage, className = "pw-img" }: Props) {
  const box = useRef<HTMLSpanElement>(null);

  // A picture that finished before hydration has already fired its load event.
  useLayoutEffect(() => {
    const img = box.current?.querySelector("img");
    if (!img?.complete) return;
    if (img.naturalWidth > 0) ready(img, "now");
    else markFailed(img);
  }, []);

  const onLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    clearFailed(img);
    if (img.dataset.ready) return;
    (img.decode ? img.decode() : Promise.resolve()).then(
      () => ready(img, "fade"),
      () => ready(img, "fade"),
    );
  };
  const onError = (e: SyntheticEvent<HTMLImageElement>) => markFailed(e.currentTarget);

  const common = {
    src: photo.src,
    srcSet: photo.srcSet,
    sizes,
    alt: photo.alt,
    width: photo.width,
    height: photo.height,
    loading: eager ? ("eager" as const) : ("lazy" as const),
    fetchPriority: high ? ("high" as const) : ("auto" as const),
    decoding: "async" as const,
    draggable: false,
    className,
    onLoad,
    onError,
  };

  return (
    <span ref={box} style={{ display: "contents" }}>
      {photo.lqip ? (
        <span
          className="pw-lq"
          aria-hidden
          style={{ backgroundImage: `url("${photo.lqip}")`, "--pw-ratio": `${photo.width} / ${photo.height}` } as React.CSSProperties}
        />
      ) : null}
      {renderImage ? (
        renderImage(common)
      ) : photo.avifSrcSet ? (
        <picture style={{ display: "contents" }}>
          <source type="image/avif" srcSet={photo.avifSrcSet} sizes={sizes} />
          <img {...common} alt={photo.alt} data-ready={eager ? "now" : undefined} style={{ "--pw-i": index } as React.CSSProperties} />
        </picture>
      ) : (
        <img {...common} alt={photo.alt} data-ready={eager ? "now" : undefined} style={{ "--pw-i": index } as React.CSSProperties} />
      )}
    </span>
  );
}
