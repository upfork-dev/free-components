"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { AddToBagButton } from "./AddToBagButton";
import { defaultFormatPrice, defaultLabels } from "./labels";
import { clearFailed, markFailed } from "./ShoeImage";
import { SizePicker } from "./SizePicker";
import { dropOf, isSoldOut, markAway } from "./Slot";
import type { Shoe, ShoeSize, ShoeView, ShoeWallLabels } from "./types";

export type ShoeDetailProps = {
  shoe: Shoe;
  /** The wall order, for previous and next. */
  shoes?: Shoe[];
  /** The list item the shoe came from. Without it the view opens with a plain fade. */
  from?: HTMLElement | null;
  /** The wall to fade while the view is open. */
  wallRoot?: HTMLElement | null;
  /** False for a deep link: a plain fade, with the rail already in place. */
  morph?: boolean;
  closing?: boolean;
  onClose: () => void;
  onClosed?: () => void;
  onNavigate?: (shoe: Shoe) => void;
  onAddToBag?: (shoe: Shoe, size: ShoeSize) => void | Promise<void>;
  onAdded?: (shoe: Shoe, size: ShoeSize, image: HTMLElement | null) => void;
  onViewBag?: () => void;
  onSizeGuide?: (shoe: Shoe) => void;
  chosenSize?: string | null;
  onChooseSize?: (eu: string) => void;
  labels?: Partial<ShoeWallLabels>;
  formatPrice?: (amount: number, currency: string) => string;
  theme?: "auto" | "light" | "dark";
  dir?: "ltr" | "rtl";
  detailTop?: number;
};

const OPEN_MS = 640;
const CLOSE_MS = 520;
const MIN_ZOOM = 1.15;
const easeWeighted = (t: number) => (t < 0.5 ? 8 * t * t * t * t : 1 - (-2 * t + 2) ** 4 / 2);
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Sampled so the arc and the weight stay plain data: the sole's centre travels, and nothing else moves. */
function travelFrames(dx: number, dy: number, scale: number, reverse: boolean): Keyframe[] {
  const frames: Keyframe[] = [];
  const steps = 32;
  const lift = Math.min(70, Math.hypot(dx, dy) * 0.1);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // The first moments are a rise, so the shoe answers before it sets off.
    const e = reverse ? easeWeighted(t) : 0.04 * Math.min(1, t * 8) + 0.96 * easeWeighted(Math.max(0, (t - 0.0625) / 0.9375));
    const k = reverse ? e : 1 - e;
    const x = dx * k;
    const arc = Math.sin(Math.PI * e) * lift;
    const y = dy * k - arc;
    const s = 1 + (scale - 1) * k;
    frames.push({ transform: `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0px) scale(${s.toFixed(4)})` });
  }
  return frames;
}

function largest(photo: Shoe["photo"]): string {
  return photo.srcSet?.split(",").pop()?.trim().split(" ")[0] ?? photo.src;
}

export function ShoeDetail(props: ShoeDetailProps) {
  const { shoe, shoes = [], from, wallRoot, morph = true, closing, onClose, onClosed, onNavigate, theme = "auto", dir, detailTop = 0 } = props;
  const labels = { ...defaultLabels, ...props.labels };
  const formatPrice = props.formatPrice ?? defaultFormatPrice;
  const titleId = useId();

  const root = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const shoeBox = useRef<HTMLDivElement>(null);
  const camera = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  const sizeGroup = useRef<HTMLDivElement | null>(null);
  const large = useRef<HTMLImageElement>(null);
  const line = useRef<HTMLSpanElement>(null);

  // Started from the wall's picture, so opening never waits for a download.
  const [first] = useState(() => ({ id: shoe.id, src: from?.querySelector("img")?.currentSrc || shoe.photo.src }));
  const baseSrc = first.id === shoe.id ? first.src : shoe.photo.src;

  // The panel cannot be seen for its first 260 ms. Mounting it a frame later keeps its layout out of
  // the click's frame, and by then the flight runs on the compositor and does not wait for the page.
  const [panelOn, setPanelOn] = useState(!morph || !from);
  const openedAt = useRef(0);

  const [viewIndex, setViewIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [localSize, setLocalSize] = useState<string | null>(null);
  const [state, setState] = useState<string>("needs-size");
  const [failed, setFailed] = useState(false);
  const landed = useRef(false);

  const inStock = (eu: string | null | undefined) => !!eu && shoe.sizes.some((s) => s.eu === eu && s.stock > 0);
  const remembered = props.chosenSize ?? localSize;
  const sizeValue = inStock(remembered) ? (remembered as string) : null;
  const soldOut = isSoldOut(shoe);
  const views: ShoeView[] = shoe.views?.length ? shoe.views : [];
  const index = shoes.findIndex((s) => s.id === shoe.id);

  /* ---------- The journey there ---------- */
  const running = useRef<Animation[]>([]);

  const resetCamera = useCallback(() => {
    setZoomed(false);
    setViewIndex(0);
    if (camera.current) {
      camera.current.style.transition = "";
      camera.current.style.transform = "";
    }
  }, []);

  /**
   * Reads every position first and starts every animation after. Mixing the two made the browser
   * recalculate styles once per part, and that was most of a 180 ms click.
   */
  const measureWall = useCallback(() => {
    if (!wallRoot) return [];
    const origin = from?.getBoundingClientRect();
    const ox = origin ? origin.left + origin.width / 2 : window.innerWidth / 2;
    const oy = origin ? origin.top + origin.height / 2 : window.innerHeight / 2;
    const reach = Math.hypot(window.innerWidth, window.innerHeight);
    const seen: { part: HTMLElement; distance: number }[] = [];
    for (const part of wallRoot.querySelectorAll<HTMLElement>(".pw-bar, .pw-head, .pw-wall > .pw-slot, .pw-wall > .pw-ghost, .pw-more-line")) {
      const rect = part.getBoundingClientRect();
      if (rect.bottom < -40 || rect.top > window.innerHeight + 40) continue;
      seen.push({ part, distance: Math.hypot(rect.left + rect.width / 2 - ox, rect.top + rect.height / 2 - oy) / reach });
    }
    return seen;
  }, [from, wallRoot]);

  const recedeWall = useCallback(
    (seen: { part: HTMLElement; distance: number }[], reverse: boolean, delay: number, total: number) => {
      const animations: Animation[] = [];
      for (const { part, distance } of seen) {
        const lag = Math.min(1, distance * 1.4) * (total * 0.45);
        const frames =
          part === from
            ? [{ opacity: 1 }, { opacity: 1 }]
            : [
                { opacity: 1, transform: "scale(1)" },
                { opacity: 0, transform: "scale(0.985)" },
              ];
        animations.push(
          part.animate(reverse ? [...frames].reverse() : frames, {
            duration: total - (reverse ? 0 : lag * 0.2),
            delay: reverse ? delay : lag * 0.5,
            easing: reverse ? "cubic-bezier(0.3,0,0.3,1)" : "cubic-bezier(0.4,0,0.6,1)",
            fill: "both",
          }),
        );
      }
      return animations;
    },
    [from],
  );

  useLayoutEffect(() => {
    const box = shoeBox.current;
    const railEl = rail.current;
    if (!box || !railEl) return;
    const reduced = reducedMotion();
    const animations: Animation[] = [];
    openedAt.current = performance.now();

    const sourceFly = from?.querySelector<HTMLElement>(".pw-fly") ?? null;
    const sourceStage = sourceFly?.parentElement ?? null;
    const sourceShelf = from?.querySelector<HTMLElement>(".pw-shelf") ?? null;

    const seen = measureWall();
    if (!reduced && morph && from && sourceStage && sourceShelf) {
      // The shoe here takes over from the one on the shelf, in the same place, in the same frame.
      const a = sourceStage.getBoundingClientRect();
      const b = box.getBoundingClientRect();
      const s = sourceShelf.getBoundingClientRect();
      const r = railEl.getBoundingClientRect();
      markAway(from, true);
      animations.push(
        box.animate(travelFrames(a.left + a.width / 2 - (b.left + b.width / 2), a.bottom - b.bottom, a.width / b.width, false), { duration: OPEN_MS, easing: "linear", fill: "both" }),
        railEl.animate(
          [
            { transform: `translate3d(${s.left - r.left}px, ${s.top - r.top}px, 0) scaleX(${s.width / r.width})` },
            { transform: "translate3d(0,0,0) scaleX(1)" },
          ],
          { duration: 480, delay: 40, easing: "cubic-bezier(0.5,0,0.2,1)", fill: "both" },
        ),
        ...recedeWall(seen, false, 0, 320),
      );
    } else {
      // A deep link, or reduced motion: a plain fade with the rail already in place.
      markAway(from, true);
      animations.push(box.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: "ease-out", fill: "both" }));
      animations.push(railEl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, fill: "both" }));
      if (reduced) {
        for (const { part } of seen) {
          if (part !== from) animations.push(part.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: "both" }));
        }
      } else {
        animations.push(...recedeWall(seen, false, 0, 200));
      }
    }
    if (line.current) animations.push(line.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320, delay: 180, easing: "ease-out", fill: "both" }));
    if (backdrop.current) {
      animations.push(backdrop.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduced || !morph || !from ? 200 : 320, easing: "ease-out", fill: "both" }));
    }
    running.current = animations;

    back.current?.focus({ preventScroll: true });
    return () => {
      for (const a of animations) a.cancel();
      markAway(from, false);
    };
    // The journey belongs to this view's life, once. Moving between shoes is its own motion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (panelOn) return;
    const frame = requestAnimationFrame(() => setPanelOn(true));
    return () => cancelAnimationFrame(frame);
  }, [panelOn]);

  useLayoutEffect(() => {
    if (!panelOn || !panel.current) return;
    const reduced = reducedMotion();
    const waited = performance.now() - openedAt.current;
    const animations = [...panel.current.querySelectorAll<HTMLElement>("[data-enter]")].map((item, i) =>
      item.animate(
        reduced
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [
              { opacity: 0, transform: "translate3d(0,10px,0)" },
              { opacity: 1, transform: "translate3d(0,0,0)" },
            ],
        { duration: reduced ? 160 : 320, delay: reduced ? 0 : Math.max(0, 260 - waited) + i * 60, easing: "cubic-bezier(0.22,0.9,0.3,1)", fill: "both" },
      ),
    );
    running.current = [...running.current, ...animations];
    return () => {
      for (const a of animations) a.cancel();
    };
  }, [panelOn]);

  // Once the shoe has landed, the larger picture comes in without a jump.
  useEffect(() => {
    landed.current = false;
    const timer = window.setTimeout(() => {
      landed.current = true;
      const img = large.current;
      if (!img) return;
      const show = () => img.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: "ease-out", fill: "forwards" });
      if (img.complete && img.naturalWidth) {
        img.decode().then(show, show);
      } else {
        img.onload = () => {
          img.decode().then(show, show);
        };
      }
    }, OPEN_MS);
    return () => window.clearTimeout(timer);
  }, [shoe.id]);

  /* ---------- The journey back ---------- */
  const closeStarted = useRef(false);
  useLayoutEffect(() => {
    if (!closing || closeStarted.current) return;
    closeStarted.current = true;
    resetCamera();
    const box = shoeBox.current;
    const railEl = rail.current;
    const reduced = reducedMotion();
    const finish = () => {
      markAway(from, false);
      for (const a of running.current) a.cancel();
      onClosed?.();
    };
    const items = panel.current ? [...panel.current.querySelectorAll<HTMLElement>("[data-enter]")] : [];
    for (const a of running.current) a.cancel();
    running.current = [];
    const sourceStage = from?.querySelector<HTMLElement>(".pw-fly")?.parentElement ?? null;
    const sourceShelf = from?.querySelector<HTMLElement>(".pw-shelf") ?? null;
    const seen = measureWall();
    const list: Animation[] = [];
    if (!box || !railEl || reduced || !from || !sourceStage || !sourceShelf) {
      const whole = root.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: "ease-out", fill: "both" });
      if (reduced) {
        for (const { part } of seen) {
          if (part !== from) list.push(part.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: "both" }));
        }
      } else {
        list.push(...recedeWall(seen, true, 0, 200));
      }
      running.current = list;
      if (whole) whole.onfinish = finish;
      else finish();
      return;
    }
    const a = sourceStage.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    const s = sourceShelf.getBoundingClientRect();
    const r = railEl.getBoundingClientRect();
    for (const item of items) {
      list.push(item.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: "ease-out", fill: "both" }));
    }
    if (line.current) list.push(line.current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: "ease-out", fill: "both" }));
    const flight = box.animate(travelFrames(a.left + a.width / 2 - (b.left + b.width / 2), a.bottom - b.bottom, a.width / b.width, true), { duration: CLOSE_MS, easing: "linear", fill: "both" });
    list.push(
      railEl.animate(
        [
          { transform: "translate3d(0,0,0) scaleX(1)" },
          { transform: `translate3d(${s.left - r.left}px, ${s.top - r.top}px, 0) scaleX(${s.width / r.width})` },
        ],
        { duration: CLOSE_MS - 40, easing: "cubic-bezier(0.5,0,0.2,1)", fill: "both" },
      ),
    );
    // The wall starts back at 180 ms and is at full strength as the shoe lands.
    list.push(...recedeWall(seen, true, 180, CLOSE_MS - 180));
    if (backdrop.current) {
      list.push(backdrop.current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: CLOSE_MS - 180, delay: 180, easing: "linear", fill: "both" }));
    }
    list.push(flight);
    running.current = list;
    flight.onfinish = finish;
    // Runs once, when closing turns true.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing]);

  /* ---------- Looking closer: a camera over the same photograph ---------- */
  // Never past the photograph's own pixels. One image pixel per screen dot on a plain screen,
  // and 1.5 per CSS pixel on a dense one, which is still crisp. If that means less zoom, zoom less.
  const focusZoom = useCallback((wanted: number) => {
    const img = large.current;
    const box = camera.current;
    if (!img || !box || !box.offsetWidth) return 1;
    const natural = img.naturalWidth || 0;
    const density = Math.min(window.devicePixelRatio || 1, 1.5);
    return Math.min(wanted, natural / (box.offsetWidth * density));
  }, []);

  const [zoomable, setZoomable] = useState(false);
  const checkZoomable = useCallback(() => setZoomable(focusZoom(2.2) >= MIN_ZOOM), [focusZoom]);
  useEffect(() => {
    checkZoomable();
    window.addEventListener("resize", checkZoomable);
    return () => window.removeEventListener("resize", checkZoomable);
  }, [checkZoomable, shoe.id]);

  const setCamera = useCallback((x: number, y: number, s: number, animate: boolean) => {
    const box = camera.current;
    const view = viewport.current;
    if (!box || !view) return;
    if (s <= 1.001) {
      box.style.transition = animate ? "transform 580ms cubic-bezier(0.3,0.1,0.15,1)" : "";
      box.style.transform = "";
      return;
    }
    const b = box.offsetWidth;
    const h = box.offsetHeight;
    const v = view.getBoundingClientRect();
    const parent = (box.parentElement as HTMLElement).getBoundingClientRect();
    const left = parent.left - v.left;
    const top = parent.top - v.top;
    const tx = v.width / 2 - (left + x * b * s);
    const ty = v.height / 2 - (top + y * h * s);
    box.style.transition = animate ? "transform 580ms cubic-bezier(0.3,0.1,0.15,1)" : "";
    box.style.transformOrigin = "0 0";
    box.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${s.toFixed(3)})`;
  }, []);

  const chooseView = (i: number) => {
    setViewIndex(i);
    setZoomed(false);
    const view = views[i];
    if (view?.kind === "focus") setCamera(view.x, view.y, focusZoom(view.zoom), true);
    else setCamera(0.5, 0.5, 1, true);
  };

  // Follow the pointer while zoomed, eased, with a transform only.
  const zoomTarget = useRef({ x: 0.5, y: 0.5, cx: 0.5, cy: 0.5, s: 1, frame: 0 });
  const stepZoom = useCallback(() => {
    const step = () => {
      const z = zoomTarget.current;
      z.cx += (z.x - z.cx) * 0.14;
      z.cy += (z.y - z.cy) * 0.14;
      setCamera(z.cx, z.cy, z.s, false);
      z.frame = Math.abs(z.x - z.cx) + Math.abs(z.y - z.cy) > 0.0006 ? requestAnimationFrame(step) : 0;
    };
    step();
  }, [setCamera]);

  const pointAt = (e: { clientX: number; clientY: number }) => {
    const parent = camera.current?.parentElement?.getBoundingClientRect();
    if (!parent) return { x: 0.5, y: 0.5 };
    return {
      x: Math.min(1, Math.max(0, (e.clientX - parent.left) / parent.width)),
      y: Math.min(1, Math.max(0, (e.clientY - parent.top) / parent.height)),
    };
  };

  const zoomIn = (e: { clientX: number; clientY: number }) => {
    const z = zoomTarget.current;
    const p = pointAt(e);
    const reach = focusZoom(2.2);
    if (reach < MIN_ZOOM) return;
    z.x = z.cx = p.x;
    z.y = z.cy = p.y;
    z.s = reach;
    setZoomed(true);
    setViewIndex(0);
    setCamera(p.x, p.y, z.s, true);
  };

  const zoomOut = useCallback(() => {
    cancelAnimationFrame(zoomTarget.current.frame);
    zoomTarget.current.frame = 0;
    setZoomed(false);
    setViewIndex(0);
    setCamera(0.5, 0.5, 1, true);
  }, [setCamera]);

  const onShoePointerMove = (e: ReactPointerEvent) => {
    if (!zoomed || e.pointerType === "touch") return;
    const z = zoomTarget.current;
    const p = pointAt(e);
    z.x = p.x;
    z.y = p.y;
    if (!z.frame) z.frame = requestAnimationFrame(stepZoom);
  };

  /* ---------- Touch: swipe down to close, sideways for views, double tap and pinch to zoom ---------- */
  const gesture = useRef<{ x: number; y: number; time: number; id: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; scale: number } | null>(null);
  const lastTap = useRef(0);

  const onViewportDown = (e: ReactPointerEvent) => {
    if (e.pointerType !== "touch") return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale: zoomed ? zoomTarget.current.s : 1 };
      gesture.current = null;
    } else {
      gesture.current = { x: e.clientX, y: e.clientY, time: performance.now(), id: e.pointerId };
    }
  };
  const onViewportMove = (e: ReactPointerEvent) => {
    if (e.pointerType !== "touch" || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const s = Math.max(1, Math.min(focusZoom(2.2), (pinch.current.scale * d) / pinch.current.distance));
      const p = pointAt({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
      zoomTarget.current = { ...zoomTarget.current, x: p.x, y: p.y, cx: p.x, cy: p.y, s };
      setZoomed(s > 1.02);
      setCamera(p.x, p.y, s, false);
    }
  };
  const onViewportUp = (e: ReactPointerEvent) => {
    if (e.pointerType !== "touch") return;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    const start = gesture.current;
    gesture.current = null;
    if (!start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const quick = performance.now() - start.time < 600;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      const now = performance.now();
      if (now - lastTap.current < 320) {
        lastTap.current = 0;
        if (zoomed) zoomOut();
        else zoomIn(e);
      } else {
        lastTap.current = now;
      }
      return;
    }
    if (zoomed) return;
    if (quick && dy > 70 && Math.abs(dy) > Math.abs(dx) * 1.3) {
      onClose();
    } else if (quick && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3 && views.length > 1) {
      const rtl = dir === "rtl";
      const step = dx < 0 !== rtl ? 1 : -1;
      const next = Math.min(views.length - 1, Math.max(0, viewIndex + step));
      if (next !== viewIndex) chooseView(next);
    }
  };

  /* ---------- Moving around ---------- */
  const walking = useRef<HTMLElement | null>(null);
  const go = useCallback(
    (step: number) => {
      if (index < 0 || shoes.length < 2 || !onNavigate) return;
      const next = shoes[(index + step + shoes.length) % shoes.length];
      walking.current = shoeBox.current ? (shoeBox.current.cloneNode(true) as HTMLElement) : null;
      onNavigate(next);
    },
    [index, onNavigate, shoes],
  );

  // The current shoe walks off along the rail as the next walks on.
  const previousId = useRef(shoe.id);
  useLayoutEffect(() => {
    if (previousId.current === shoe.id) return;
    const before = shoes.findIndex((s) => s.id === previousId.current);
    previousId.current = shoe.id;
    const forward = before === shoes.length - 1 && index === 0 ? true : before === 0 && index === shoes.length - 1 ? false : index >= before;
    resetCamera();
    const box = shoeBox.current;
    if (!box || reducedMotion()) return;
    const sign = (forward ? 1 : -1) * (dir === "rtl" ? -1 : 1);
    const width = box.offsetWidth;
    // The old shoe leaves as a copy, so one React commit is all this takes.
    const parent = box.parentElement;
    const leaving = walking.current;
    if (parent && leaving) {
      const copy = leaving;
      walking.current = null;
      copy.setAttribute("aria-hidden", "true");
      copy.style.pointerEvents = "none";
      parent.insertBefore(copy, box);
      const out = copy.animate(
        [
          { transform: "translate3d(0,0,0)", opacity: 1 },
          { transform: `translate3d(${-sign * width * 0.55}px, 0, 0)`, opacity: 0 },
        ],
        { duration: 300, easing: "cubic-bezier(0.4,0,1,1)", fill: "both" },
      );
      out.onfinish = () => copy.remove();
      out.oncancel = () => copy.remove();
    }
    box.animate(
      [
        { transform: `translate3d(${sign * width * 0.55}px, 0, 0)`, opacity: 0 },
        { transform: "translate3d(0,0,0)", opacity: 1 },
      ],
      { duration: 420, easing: "cubic-bezier(0.22,0.9,0.3,1)", delay: 60, fill: "backwards" },
    );
    panel.current?.animate([{ opacity: 0.2 }, { opacity: 1 }], { duration: 300, easing: "ease-out" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shoe.id]);

  /* ---------- Keys, focus, scroll ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (zoomed) zoomOut();
        else onClose();
        return;
      }
      const target = e.target as HTMLElement;
      const inGroup = target.getAttribute("role") === "radio";
      if (!inGroup && e.key === "ArrowLeft") go(dir === "rtl" ? 1 : -1);
      if (!inGroup && e.key === "ArrowRight") go(dir === "rtl" ? -1 : 1);
      if (e.key === "Tab" && root.current) {
        const all = [...root.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex="0"]')].filter((el) => el.offsetParent !== null);
        if (!all.length) return;
        const first = all[0];
        const last = all[all.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (!root.current.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dir, go, onClose, zoomed, zoomOut]);

  // Scrolling is held by stopping its events. Setting overflow on the page would re-lay out all of it
  // in the click's own frame, and the scrollbar staying where it is means nothing can shift.
  useEffect(() => {
    const inside = (target: EventTarget | null) => {
      const el = target instanceof Element ? target.closest<HTMLElement>(".pw-panel, .pw-detail, .pw-bag-list") : null;
      return !!el && el.scrollHeight > el.clientHeight;
    };
    const stop = (e: Event) => {
      if (!inside(e.target)) e.preventDefault();
    };
    const SCROLL_KEYS = new Set(["PageUp", "PageDown", "Home", "End", "ArrowUp", "ArrowDown", " "]);
    const keys = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (!SCROLL_KEYS.has(e.key) || inside(el)) return;
      if (el && /^(BUTTON|A|SUMMARY|INPUT)$/.test(el.tagName) && (e.key === " " || el.getAttribute("role") === "radio")) return;
      e.preventDefault();
    };
    document.addEventListener("wheel", stop, { passive: false });
    document.addEventListener("touchmove", stop, { passive: false });
    document.addEventListener("keydown", keys);
    return () => {
      document.removeEventListener("wheel", stop);
      document.removeEventListener("touchmove", stop);
      document.removeEventListener("keydown", keys);
    };
  }, []);

  /* ---------- Size and bag ---------- */
  const chooseSize = (eu: string) => {
    setLocalSize(eu);
    props.onChooseSize?.(eu);
    setHint(null);
    setFailed(false);
  };

  const pulseSizes = () => {
    const group = sizeGroup.current;
    if (!group) return;
    setHint(labels.chooseSizeHint);
    group.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
    if (!reducedMotion()) {
      group.animate([{ transform: "scale(1)" }, { transform: "scale(1.018)" }, { transform: "scale(1)" }], { duration: 360, easing: "ease-in-out" });
    }
  };

  const add = async () => {
    const size = shoe.sizes.find((s) => s.eu === sizeValue);
    if (!size) return;
    setFailed(false);
    try {
      await props.onAddToBag?.(shoe, size);
      props.onAdded?.(shoe, size, camera.current);
    } catch (error) {
      setFailed(true);
      throw error;
    }
  };

  const confirmation =
    state === "added" ? (
      <>
        {labels.inBag} ·{" "}
        <button type="button" className="pw-text-button" onClick={props.onViewBag}>
          {labels.viewBag}
        </button>
      </>
    ) : failed && state === "error" ? (
      labels.addFailedReason
    ) : (
      ""
    );

  const price = formatPrice(shoe.price, shoe.currency);
  const was = shoe.compareAtPrice ? formatPrice(shoe.compareAtPrice, shoe.currency) : null;
  const [left, right] = shoe.photo.contact;
  const above = (shoe.photo.height * shoe.photo.baseline) / shoe.photo.width;

  const panelBody = (
    <>
      <div data-enter className="pw-kicker">
        {shoe.category}
      </div>
      <h2 data-enter id={titleId} className="pw-dname">
        {shoe.name}
      </h2>
      <div data-enter className="pw-dprice">
        {was ? (
          <s>
            <span className="pw-visually-hidden">{labels.wasPrice} </span>
            {was}
          </s>
        ) : null}
        {price}
      </div>
      {shoe.description ? (
        <p data-enter className="pw-ddesc">
          {shoe.description}
        </p>
      ) : null}
      <div data-enter>
        <SizePicker
          shoe={shoe}
          value={sizeValue}
          onChange={chooseSize}
          labels={labels}
          onSizeGuide={props.onSizeGuide}
          hint={hint}
          groupRef={(el) => {
            sizeGroup.current = el;
          }}
        />
      </div>
      <div data-enter className="pw-buy">
        <AddToBagButton
          key={shoe.id}
          needsSize={!sizeValue}
          soldOut={soldOut}
          sizeKey={sizeValue}
          onAdd={add}
          onNeedSize={pulseSizes}
          labels={labels}
          onStateChange={setState}
        />
        <div className="pw-confirm" data-testid="pw-confirm" role="status">
          {confirmation}
        </div>
      </div>
      <a data-enter className="pw-full-link" href={shoe.href}>
        {labels.viewFullDetails}
      </a>
      {shoe.returnsNote ? (
        <p data-enter className="pw-returns">
          {shoe.returnsNote}
        </p>
      ) : null}
      {shoe.details?.length ? (
        <div data-enter className="pw-more">
          {shoe.details.map((d) => (
            <details key={d.title}>
              <summary>{d.title}</summary>
              <p>{d.body}</p>
            </details>
          ))}
        </div>
      ) : null}
    </>
  );

  const dialog = (
    <div
      ref={root}
      className="pw-root pw-detail-root"
      data-theme={theme}
      dir={dir}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="pw-detail"
      style={{ top: detailTop }}
    >
      <div ref={backdrop} className="pw-detail-bg" aria-hidden />
      <div className="pw-detail">
        <div className="pw-dstage">
          <span ref={line} className="pw-dline" aria-hidden />
          <button ref={back} type="button" className="pw-back" onClick={onClose}>
            <svg width="20" height="14" viewBox="0 0 20 14" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M20 7H2M8 1 2 7l6 6" />
            </svg>
            {labels.back}
          </button>

          <div
            ref={viewport}
            className="pw-dview"
            data-camera={zoomed || viewIndex > 0 ? "on" : undefined}
            onPointerDown={onViewportDown}
            onPointerMove={onViewportMove}
            onPointerUp={onViewportUp}
            onPointerCancel={onViewportUp}
          >
            <div className="pw-rail" ref={rail} aria-hidden />
            <div
              ref={shoeBox}
              className="pw-dshoe"
              data-tone={shoe.lightness !== undefined && shoe.lightness < 0.2 ? "dark" : undefined}
              style={{ "--pw-drop": dropOf(shoe), "--pw-above": above } as React.CSSProperties}
            >
              <span className="pw-contact pw-dcontact" aria-hidden style={{ insetInlineStart: `${left * 100}%`, width: `${(right - left) * 100}%` }} />
              <div
                ref={camera}
                className="pw-dcam"
                data-zoomed={zoomed ? "true" : undefined}
                data-zoomable={zoomable ? "true" : undefined}
                onClick={(e) => {
                  if (e.detail === 0) return;
                  if (window.matchMedia("(hover: none)").matches) return;
                  if (zoomed) zoomOut();
                  else zoomIn(e);
                }}
                onPointerMove={onShoePointerMove}
                onPointerLeave={(e) => {
                  if (zoomed && e.pointerType !== "touch") zoomOut();
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
              className="pw-img"
              data-ready="now"
              src={baseSrc}
              alt={shoe.photo.alt}
              width={shoe.photo.width}
              height={shoe.photo.height}
              draggable={false}
              key={`base-${shoe.id}`}
              onLoad={(e) => clearFailed(e.currentTarget)}
              onError={(e) => markFailed(e.currentTarget)}
            />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={large}
                  className="pw-img pw-dlarge"
                  data-ready="now"
                  src={largest(shoe.photo)}
                  alt=""
                  aria-hidden
                  width={shoe.photo.width}
                  height={shoe.photo.height}
                  draggable={false}
                  decoding="async"
                  key={`large-${shoe.id}`}
                    onLoad={(e) => {
                    e.currentTarget.style.display = "";
                    checkZoomable();
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            </div>
            {shoes.length > 1 && onNavigate ? (
              <>
                <button type="button" className="pw-nav pw-nav-prev" aria-label={labels.previous} onClick={() => go(-1)}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                    <path d="M12.5 4 6.5 10l6 6" />
                  </svg>
                </button>
                <button type="button" className="pw-nav pw-nav-next" aria-label={labels.next} onClick={() => go(1)}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                    <path d="m7.5 4 6 6-6 6" />
                  </svg>
                </button>
              </>
            ) : null}
          </div>

          {views.length > 1 ? (
            <div className="pw-views" role="group" aria-label={labels.views} style={{ "--pw-view-at": viewIndex, "--pw-view-count": views.length } as React.CSSProperties}>
              {views.map((view, i) => (
                <button key={view.label} type="button" className="pw-view" aria-pressed={i === viewIndex} onClick={() => chooseView(i)}>
                  <span
                    className="pw-thumb"
                    aria-hidden
                    style={
                      view.kind === "focus"
                        ? {
                            backgroundImage: `url("${shoe.photo.src}")`,
                            backgroundSize: `${view.zoom * 100}%`,
                            backgroundPosition: `${view.x * 100}% ${view.y * 100}%`,
                          }
                        : { backgroundImage: `url("${view.photo.src}")`, backgroundSize: "100%" }
                    }
                  />
                  <span className="pw-view-label">{view.label}</span>
                </button>
              ))}
              <span className="pw-view-mark" aria-hidden />
            </div>
          ) : null}
        </div>

        <div className="pw-panel" ref={panel}>
          {panelOn ? panelBody : null}
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
