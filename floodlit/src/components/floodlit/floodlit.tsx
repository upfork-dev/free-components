"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AddToBagPill, type PillState } from "./add-to-bag-pill";
import { BagDrawer } from "./bag-drawer";
import { focalLength, focusFrame, isStacked, TALL_WIDTH } from "./camera";
import { startRoom, type RoomClient } from "./client";
import { columnsFor, layoutWall, SHOE_Z, type WallLayout } from "./layout";
import { contrastInk } from "./lighting";
import { sizeLabel, SizeTiles, type SizeUnit } from "./size-tiles";
import type { BagLine, FloodlitLabels, FloodlitProps, Shoe, ShoeSize } from "./types";
import "./floodlit.css";

const WARM = "#FFB27A";

const DEFAULT_LABELS: FloodlitLabels = {
  room: "The shoe wall",
  backToWall: "Back to the wall",
  hint: "Point at a shelf to light it. Click to walk up.",
  hintTouch: "Tap a pair to walk up.",
  chooseSize: "Choose your size",
  addToBag: "Add to bag",
  adding: "Adding",
  inBag: "In your bag",
  addAnother: "Add another",
  couldNotAdd: "Couldn't add. Try again",
  viewBag: "View bag",
  size: "Size",
  soldOut: "sold out",
  onlyLeft: (n) => `Only ${n} left`,
  yourSize: "Your size",
  chooseSizeFirst: "Choose a size first.",
  materialsAndFit: "Materials and fit",
  previous: "Previous pair",
  next: "Next pair",
  nowViewing: (name) => `Now viewing ${name}`,
  addedLive: (name) => `${name} is in your bag`,
  zoomIn: "Look closer",
  zoomOut: "Step back from the shoe",
  yourBag: "Your bag",
  bagEmpty: "Your bag is empty.",
  backToRoom: "Back to the room",
  subtotal: "Subtotal",
  checkout: "Checkout",
  remove: "Remove",
  closeBag: "Close the bag",
  increase: "One more",
  decrease: "One less",
  demoLine: null,
};

const defaultFormat = (() => {
  const cache = new Map<string, Intl.NumberFormat>();
  return (amount: number, currency: string) => {
    let f = cache.get(currency);
    if (!f) {
      f = new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: amount % 1 ? 2 : 0 });
      cache.set(currency, f);
    }
    return f.format(amount);
  };
})();

/** Where a shoe goes at each breakpoint, as CSS variables, so the server's markup places it with no script at all. */
function slotVars(index: number, count: number, rtl: boolean): Record<string, number> {
  const out: Record<string, number> = {};
  const at: [string, number][] = [["lg", 1100], ["md", 700], ["sm", 320]];
  for (const [name, width] of at) {
    const cols = columnsFor(width, count);
    const rows = Math.ceil(count / cols);
    const row = Math.floor(index / cols);
    const inRow = row === rows - 1 ? count - cols * (rows - 1) : cols;
    const col = index - row * cols;
    out[`--c-${name}`] = rtl ? inRow - 1 - col : col;
    out[`--r-${name}`] = row;
    out[`--o-${name}`] = (cols - inRow) / 2;
  }
  return out;
}

/** A shelf's rectangle on screen, through the framing of the shoe in focus. */
function rectThrough(layout: WallLayout, focusIndex: number, index: number, W: number, H: number, rtl: boolean, top: number) {
  const frame = focusFrame(layout.slots[focusIndex], W, H, rtl, top);
  const k = focalLength(W) / (frame.pose.z - SHOE_Z);
  const slot = layout.slots[index];
  const sx = (x: number) => W / 2 + (x - frame.pose.x) * k + (frame.pose.shiftX * W) / 2;
  const sy = (y: number) => H / 2 + (y - frame.pose.y) * k - (frame.pose.shiftY * H) / 2;
  return { x0: sx(slot.card.x), y0: sy(slot.card.y), x1: sx(slot.card.x + slot.card.w), y1: sy(slot.slab.y + 18), panelLeft: frame.panelLeft * W };
}

function hostIsDark(): boolean {
  const html = document.documentElement.classList;
  if (html.contains("dark")) return true;
  if (html.contains("light")) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function Floodlit(props: FloodlitProps) {
  const { shoes, wall, theme = "dark", ledMode = "shoe", ledColor, syncUrl, heading, eyebrow, detailTop = 0, onOpenChange, onAddToBag, onCheckout, dir = "ltr", className } = props;
  const labels = useMemo(() => ({ ...DEFAULT_LABELS, ...props.labels }), [props.labels]);
  const formatPrice = props.formatPrice ?? defaultFormat;
  const urlParam = typeof syncUrl === "object" ? syncUrl.param : "shoe";
  const rtl = dir === "rtl";

  const bodyRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef<HTMLDivElement>(null);
  const planeRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const focusRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<RoomClient | null>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const tilesRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const firstInPanel = useRef<HTMLButtonElement>(null);
  const addToken = useRef(0);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addingNow = useRef(false);
  const returnFocusTo = useRef(-1);
  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const reducedRef = useRef(false);

  const [size, setSize] = useState({ w: 0, h: 0 });
  const [gl, setGl] = useState<"waiting" | "ready" | "none">("waiting");
  const [focusIndex, setFocusIndex] = useState(-1);
  const [panelShown, setPanelShown] = useState(false);
  const [travel, setTravel] = useState(1);
  const [along, setAlong] = useState(false);
  const [unit, setUnit] = useState<SizeUnit>("eu");
  const [remembered, setRemembered] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [pill, setPill] = useState<PillState>("needs-size");
  const [reserved, setReserved] = useState<{ kind: "none" | "hint" | "added" | "error" | "stock"; text?: string }>({ kind: "none" });
  const [tilePulse, setTilePulse] = useState(0);
  const [live, setLive] = useState("");
  const [zoomed, setZoomed] = useState(false);
  const [view, setView] = useState(0);
  const [bagInternal, setBagInternal] = useState<BagLine[]>([]);
  const [bagOpenInternal, setBagOpenInternal] = useState(false);
  const [titleSize, setTitleSize] = useState(56);
  const [titleWrap, setTitleWrap] = useState(false);
  const [isDark, setIsDark] = useState<boolean | null>(theme === "auto" ? null : theme === "dark");

  const bag = props.bag ?? bagInternal;
  const bagOpen = props.bagOpen ?? bagOpenInternal;
  const onBagChange = props.onBagChange;
  const onBagOpenChange = props.onBagOpenChange;
  const setBag = useCallback(
    (lines: BagLine[]) => {
      setBagInternal(lines);
      onBagChange?.(lines);
    },
    [onBagChange],
  );
  const setBagOpen = useCallback(
    (open: boolean) => {
      setBagOpenInternal(open);
      onBagOpenChange?.(open);
    },
    [onBagOpenChange],
  );

  const shapes = useMemo(() => shoes.map((s) => ({ aspect: s.photo.width / s.photo.height, baseline: s.photo.baseline, contact: s.photo.contact })), [shoes]);
  const colours = useMemo(() => shoes.map((s) => (ledMode === "brand" && ledColor ? ledColor : s.ledColor ?? WARM)), [shoes, ledMode, ledColor]);
  const layout = useMemo(() => (size.w ? layoutWall(size.w, shapes, rtl) : null), [size.w, shapes, rtl]);

  const tall = size.w > 0 && size.w < TALL_WIDTH;
  const stacked = size.w > 0 && isStacked(size.w, size.h);
  const focused: Shoe | null = focusIndex >= 0 ? shoes[focusIndex] : null;
  const focusedColour = focusIndex >= 0 ? colours[focusIndex] : WARM;
  const focusedInk = focused?.ledInk && ledMode === "shoe" ? focused.ledInk : contrastInk(focusedColour);
  const box = useMemo(() => (layout && focusIndex >= 0 && size.h ? rectThrough(layout, focusIndex, focusIndex, size.w, size.h, rtl, detailTop) : null), [layout, focusIndex, size.w, size.h, rtl, detailTop]);
  const stepBack = useMemo(() => {
    if (!layout || !size.h || tall) return 1;
    return Math.max(1, layout.contentHeight / Math.max(1, size.h - detailTop));
  }, [layout, size.h, tall, detailTop]);

  // Size from the component's own box, never the window. The stage is the window's height on a phone.
  useLayoutEffect(() => {
    const el = stickRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // A picture that failed before the page woke up never fired React's onError (L-KBV5).
  useEffect(() => {
    bodyRef.current?.querySelectorAll<HTMLImageElement>(".fl-poster").forEach((img) => {
      if (img.complete && img.naturalWidth === 0) img.dataset.error = "";
    });
  }, []);

  // Theme: fixed, or following the host's `dark` or `light` class, then the system.
  useLayoutEffect(() => {
    if (theme !== "auto") {
      setIsDark(theme === "dark");
      return;
    }
    const read = () => setIsDark(hostIsDark());
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const system = window.matchMedia("(prefers-color-scheme: dark)");
    system.addEventListener("change", read);
    return () => {
      observer.disconnect();
      system.removeEventListener("change", read);
    };
  }, [theme]);

  useEffect(() => {
    if (isDark !== null) roomRef.current?.setTheme(isDark ? 0 : 1);
  }, [isDark]);

  // The room. One per canvas. Cleanup keeps the context, so StrictMode's second run finds it alive. If the context
  // is lost the poster wall comes back and the whole buying path still works; the room restarts when it can.
  const started = useRef(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || started.current) return;
    started.current = true;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    reducedRef.current = reduced;
    // A phone reads the picture its poster already fetched, so nothing downloads twice.
    const small = canvas.getBoundingClientRect().width < TALL_WIDTH;
    const posters = bodyRef.current?.querySelectorAll<HTMLImageElement>(".fl-poster");
    roomRef.current = startRoom(canvas, {
      reduced,
      rtl,
      detailTop,
      small,
      worker: props.worker ?? true,
      torch: window.matchMedia("(pointer: fine)").matches,
      day: (theme === "auto" ? hostIsDark() : theme === "dark") ? 0 : 1,
      assets: {
        flip: rtl,
        shoes: shoes.map((s, i) => ({
          id: s.id,
          aspect: s.photo.width / s.photo.height,
          baseline: s.photo.baseline,
          ledColor: colours[i],
          src: posters?.[i]?.currentSrc || s.photo.src,
          large: small ? s.photo.src : s.photo.large,
          shadow: s.photo.shadow ?? { file: "", pad: 0.22, rects: [] },
        })),
        wall: { albedo: wall?.albedo ?? "/wall/painted-plaster-albedo.webp", normal: wall?.normal ?? "/wall/painted-plaster-normal.webp", detail: wall?.detail ?? "/wall/painted-plaster-detail.webp" },
        noise: wall?.noise ?? "/wall/blue-noise.png",
      },
    }, {
      onReady: () => setGl("ready"),
      onFail: () => {
        roomRef.current = null;
        setPanelShown(true);
        setGl("none");
      },
      onLost: () => {
        setPanelShown(true);
        setGl("none");
      },
      onRestored: () => setGl("ready"),
      onPanelClear: () => setPanelShown(true),
    });
    // Shoes and colours are read once: a new set of shoes means a new canvas, by key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!layout) return;
    roomRef.current?.setLayout(layout, size.w, size.h, Math.min(2, window.devicePixelRatio || 1));
  }, [layout, gl, size.w, size.h]);

  // On a phone the wall is taller than the window. The page scrolls as usual, and the camera follows it: the
  // distance between the sticky stage and the shoes' plane is exactly how far down the wall we are.
  useEffect(() => {
    if (!tall) return;
    const onScroll = () => {
      const stage = stickRef.current?.getBoundingClientRect().top ?? 0;
      const plane = planeRef.current?.getBoundingClientRect().top ?? 0;
      roomRef.current?.setScroll(stage - plane);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [tall, gl, size.h]);

  // While a shoe is open on a phone, the page behind stays still.
  useEffect(() => {
    if (!tall || focusIndex < 0) return;
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = before;
    };
  }, [tall, focusIndex]);

  const resetBuying = useCallback(
    (shoe: Shoe) => {
      if (addedTimer.current) clearTimeout(addedTimer.current);
      addToken.current++;
      addingNow.current = false;
      const carry = remembered && shoe.sizes.find((s) => s.eu === remembered && s.stock > 0) ? remembered : null;
      setChosen(carry);
      setPill(carry ? "ready" : "needs-size");
      const low = carry ? shoe.sizes.find((s) => s.eu === carry) : null;
      setReserved(low && low.stock <= 3 ? { kind: "stock", text: labels.onlyLeft(low.stock) } : { kind: "none" });
      setZoomed(false);
      setView(0);
    },
    [remembered, labels],
  );

  const writeUrl = useCallback(
    (slug: string | null) => {
      if (!syncUrl) return;
      const url = new URL(window.location.href);
      if (slug) url.searchParams.set(urlParam, slug);
      else url.searchParams.delete(urlParam);
      window.history.pushState({ floodlit: slug }, "", url);
    },
    [syncUrl, urlParam],
  );

  /** With reduced motion, moving between states is a crossfade of the whole room. */
  const crossfade = useCallback(() => {
    if (reducedRef.current) canvasRef.current?.animate([{ opacity: 0.2 }, { opacity: 1 }], { duration: 240, easing: "ease-out" });
  }, []);

  const openShoe = useCallback(
    (i: number, instant = false, fromHistory = false) => {
      const room = roomRef.current;
      const shoe = shoes[i];
      if (!shoe) return;
      room?.preload(i);
      const previous = focusIndex;
      setAlong(previous >= 0);
      if (previous >= 0) {
        const n = shoes.length;
        const forward = (i - previous + n) % n <= n / 2;
        setTravel(forward ? 1 : -1);
      }
      crossfade();
      // A section lower on the page comes fully into view first.
      if (!instant && previous < 0 && window.innerWidth >= TALL_WIDTH) {
        bodyRef.current?.scrollIntoView({ block: "nearest", behavior: reducedRef.current ? "auto" : "smooth" });
      }
      setFocusIndex(i);
      // With no room, or no walking, there is nothing to wait for.
      setPanelShown(instant || !room || gl === "none");
      resetBuying(shoe);
      setLive(labels.nowViewing(shoe.name));
      room?.open(i, instant);
      if (!fromHistory) writeUrl(shoe.slug);
      onOpenChange?.(shoe.slug);
    },
    [shoes, focusIndex, resetBuying, labels, writeUrl, onOpenChange, crossfade, gl],
  );

  const closeShoe = useCallback(
    (fromHistory = false) => {
      const i = focusIndex;
      if (i < 0) return;
      crossfade();
      setPanelShown(false);
      setFocusIndex(-1);
      roomRef.current?.close();
      if (!fromHistory) writeUrl(null);
      onOpenChange?.(null);
      // Focus returns to the shoe that was open, once the wall is no longer inert.
      returnFocusTo.current = i;
    },
    [focusIndex, writeUrl, onOpenChange, crossfade],
  );

  // A deep link, or a reload: open straight in focus, with no walk. Read after mount, so server markup stays stable.
  const deepLinked = useRef(false);
  useEffect(() => {
    if (deepLinked.current || gl === "waiting" || !layout) return;
    deepLinked.current = true;
    const slug = (syncUrl ? new URLSearchParams(window.location.search).get(urlParam) : null) ?? props.openSlug ?? props.defaultOpenSlug ?? null;
    if (!slug) return;
    const i = shoes.findIndex((s) => s.slug === slug);
    if (i >= 0) openShoe(i, true, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, layout]);

  // A controlled openSlug.
  useEffect(() => {
    if (props.openSlug === undefined || !deepLinked.current) return;
    const want = props.openSlug === null ? -1 : shoes.findIndex((s) => s.slug === props.openSlug);
    if (want !== focusIndex) {
      if (want < 0) closeShoe(true);
      else openShoe(want, false, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.openSlug]);

  // Browser back and forward. Our own state follows popstate: useSearchParams does not see replaceState (L-ZPDX).
  useEffect(() => {
    if (!syncUrl) return;
    const onPop = () => {
      const slug = new URLSearchParams(window.location.search).get(urlParam);
      if (!slug) closeShoe(true);
      else {
        const i = shoes.findIndex((s) => s.slug === slug);
        if (i >= 0 && i !== focusIndex) openShoe(i, false, true);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [syncUrl, urlParam, shoes, focusIndex, closeShoe, openShoe]);

  useEffect(() => {
    if (focusIndex < 0 && returnFocusTo.current >= 0) {
      linkRefs.current[returnFocusTo.current]?.focus({ preventScroll: true });
      returnFocusTo.current = -1;
    }
  }, [focusIndex]);

  useEffect(() => {
    roomRef.current?.setBag(bagOpen);
  }, [bagOpen, gl]);

  const walk = useCallback(
    (forward: boolean) => {
      const n = shoes.length;
      openShoe((focusIndex + (forward ? 1 : -1) + n) % n);
    },
    [shoes.length, focusIndex, openShoe],
  );

  // Esc order: zoom, then bag, then focus. Arrows walk along, mirrored right to left. Tab stays in the dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (zoomed) {
          setZoomed(false);
          roomRef.current?.closerLook(1);
        } else if (bagOpen) {
          setBagOpen(false);
        } else if (focusIndex >= 0) {
          closeShoe();
        } else {
          return;
        }
        e.preventDefault();
        return;
      }
      if (focusIndex < 0 || bagOpen) return;
      if (e.key === "Tab") {
        const items = Array.from(focusRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]):not([tabindex="-1"]), a[href], summary') ?? []);
        if (!items.length) return;
        const active = document.activeElement as HTMLElement | null;
        const at = active ? items.indexOf(active) : -1;
        if (at < 0 || (e.shiftKey && at === 0) || (!e.shiftKey && at === items.length - 1)) {
          e.preventDefault();
          items[e.shiftKey ? items.length - 1 : 0].focus();
        }
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[role="radiogroup"]')) return;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        walk((e.key === "ArrowRight") !== rtl);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomed, bagOpen, focusIndex, rtl, closeShoe, walk, setBagOpen]);

  // The pointer on the room itself: the torch, the look-around, a neighbour, bare wall, and the zoom.
  const maxZoom = focused?.photo.maxZoom ?? 1.8;
  const local = (e: { clientX: number; clientY: number }) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    return rect ? [e.clientX - rect.left, e.clientY - rect.top] : [0, 0];
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    const room = roomRef.current;
    if (!room) return;
    const [x, y] = local(e);
    room.pointer(x, y);
    if (focusIndex >= 0 && box && canvasRef.current) {
      const inside = x > box.x0 && x < box.x1 && y > box.y0 && y < box.y1;
      canvasRef.current.style.cursor = inside && maxZoom > 1.02 ? (zoomed ? "zoom-out" : "zoom-in") : "default";
      if (zoomed) room.closerLook(maxZoom, (x - box.x0) / (box.x1 - box.x0), (y - box.y0) / (box.y1 - box.y0), 8);
    }
  };
  const onCanvasClick = (e: React.MouseEvent) => {
    const room = roomRef.current;
    if (!room || focusIndex < 0 || !layout) return;
    const [x, y] = local(e);
    if (box && x > box.x0 && x < box.x1 && y > box.y0 && y < box.y1) {
      if (maxZoom <= 1.02) return;
      if (zoomed) {
        setZoomed(false);
        room.closerLook(1);
      } else {
        setZoomed(true);
        room.closerLook(maxZoom, (x - box.x0) / (box.x1 - box.x0), (y - box.y0) / (box.y1 - box.y0), 8);
      }
      return;
    }
    const clearOfPanel = stacked || !box || (rtl ? x > box.panelLeft : x < box.panelLeft);
    if (clearOfPanel) {
      for (let i = 0; i < shoes.length; i++) {
        if (i === focusIndex) continue;
        const r = rectThrough(layout, focusIndex, i, size.w, size.h, rtl, detailTop);
        if (x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1) {
          openShoe(i);
          return;
        }
      }
    }
    closeShoe();
  };

  // On touch: swipe sideways to walk along, swipe down to step back. The panel and the bag keep their own scrolling.
  const onTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest?.(".fl-panel, .fl-bag")) {
      touchStart.current = null;
      return;
    }
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY, t: performance.now() };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const from = touchStart.current;
    touchStart.current = null;
    if (!from || focusIndex < 0) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - from.x;
    const dy = t.clientY - from.y;
    if (performance.now() - from.t > 700) return;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) walk(dx < 0 !== rtl);
    else if (dy > 70 && dy > Math.abs(dx) * 1.4) closeShoe();
  };

  // Buying.
  const chooseSize = (eu: string) => {
    if (!focused) return;
    const s = focused.sizes.find((z) => z.eu === eu);
    if (!s || s.stock <= 0) return;
    if (addedTimer.current) clearTimeout(addedTimer.current);
    addToken.current++;
    addingNow.current = false;
    setChosen(eu);
    setRemembered(eu);
    setPill("ready");
    setReserved(s.stock <= 3 ? { kind: "stock", text: labels.onlyLeft(s.stock) } : { kind: "none" });
  };

  const add = async () => {
    if (!focused) return;
    if (pill === "needs-size") {
      setTilePulse((n) => n + 1);
      setReserved({ kind: "hint", text: labels.chooseSizeFirst });
      roomRef.current?.pulse(focusIndex);
      tilesRef.current?.querySelector<HTMLButtonElement>('[tabindex="0"]')?.focus();
      return;
    }
    // Two clicks in one frame reach here before the state has changed: only the first counts.
    if (addingNow.current) return;
    addingNow.current = true;
    const size = focused.sizes.find((s) => s.eu === chosen) as ShoeSize;
    const token = ++addToken.current;
    setPill("adding");
    setReserved({ kind: "none" });
    const began = performance.now();
    let problem: string | null = null;
    try {
      await onAddToBag?.(focused, size);
    } catch (error) {
      problem = error instanceof Error && error.message ? error.message : labels.couldNotAdd;
    }
    const left = 500 - (performance.now() - began);
    if (left > 0) await new Promise((r) => setTimeout(r, left));
    addingNow.current = false;
    if (token !== addToken.current) return;
    if (problem) {
      setPill("error");
      setReserved({ kind: "error", text: problem });
      return;
    }
    const key = `${focused.id}:${size.eu}`;
    const existing = bag.find((l) => l.key === key);
    const label = `${labels.size} ${unit.toUpperCase()} ${sizeLabel(size, unit)}`;
    setBag(
      existing
        ? bag.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l))
        : [...bag, { key, shoeId: focused.id, name: focused.name, image: focused.photo.src, sizeLabel: label, eu: size.eu, variantId: size.variantId, price: focused.price, currency: focused.currency, ledColor: focusedColour, qty: 1 }],
    );
    setPill("added");
    setReserved({ kind: "added" });
    setLive(labels.addedLive(focused.name));
    roomRef.current?.pulse(focusIndex);
    addedTimer.current = setTimeout(() => setPill("another"), 2400);
  };

  // The title fits by rule: it never overlaps the shoe and is never cut off.
  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el || !box || !focused) return;
    const margin = Math.max(16, size.w * 0.04);
    const roomW = rtl ? size.w - box.panelLeft : box.panelLeft;
    const forWidth = stacked ? size.w - margin * 2 - 48 : Math.max(180, roomW - margin - 24);
    // From below the back button to just above the top of the shoe's picture. A text line's box is about 1.1 em.
    const titleTop = detailTop + Math.min(28, Math.max(12, window.innerHeight * 0.03)) + 50;
    const forHeight = stacked ? 36 : Math.max(36, (box.y0 + (box.y1 - box.y0) * 0.06 - titleTop - 6) / 1.1);
    el.style.fontSize = "100px";
    el.style.whiteSpace = "nowrap";
    const width = el.scrollWidth;
    el.style.fontSize = "";
    el.style.whiteSpace = "";
    const oneLine = Math.min(84, (100 * forWidth) / Math.max(1, width), forHeight);
    // A name too long for one line at a readable size wraps instead of being cut.
    setTitleWrap(oneLine < 18);
    setTitleSize(Math.max(18, oneLine));
  }, [focused, box, size.w, detailTop, stacked, rtl]);

  useEffect(() => {
    if (panelShown) firstInPanel.current?.focus({ preventScroll: true });
    // Only when the panel appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelShown]);

  const pillLabels: Record<PillState, string> = {
    "needs-size": labels.chooseSize,
    ready: labels.addToBag,
    adding: labels.adding,
    added: labels.inBag,
    error: labels.couldNotAdd,
    another: labels.addAnother,
  };

  const panelWidth = box && !stacked ? (rtl ? box.panelLeft : size.w - box.panelLeft) : 0;
  const count = shoes.length;
  const bodyStyle = {
    "--fl-detail-top": `${detailTop}px`,
    "--fl-led": focusedColour,
    "--fl-led-ink": focusedInk,
    "--fl-panel-w": panelWidth ? `${panelWidth}px` : undefined,
    "--n-lg": columnsFor(1100, count),
    "--n-md": columnsFor(700, count),
    "--n-sm": columnsFor(320, count),
    "--rows-lg": Math.ceil(count / columnsFor(1100, count)),
    "--rows-md": Math.ceil(count / columnsFor(700, count)),
    "--rows-sm": Math.ceil(count / columnsFor(320, count)),
    "--fl-step": stepBack,
  } as React.CSSProperties;

  const flat = gl === "none";
  const themeName = isDark === null ? "auto" : isDark ? "night" : "day";

  return (
    <section className={`fl-root ${className ?? ""}`} aria-label={labels.room} data-fl-theme={themeName} dir={dir}>
      <div ref={bodyRef} className="fl-body" data-stack={stacked || undefined} data-focus={focusIndex >= 0 || undefined} data-bag={bagOpen || undefined} data-gl={gl} style={bodyStyle} onPointerMove={onPointerMove} onPointerLeave={() => roomRef.current?.pointerLeft()} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div ref={stickRef} className="fl-stick">
          <canvas ref={canvasRef} className="fl-canvas" onClick={onCanvasClick} aria-hidden="true" />

          {focused ? (
            <div ref={focusRef} className="fl-focus" role="dialog" aria-modal="true" aria-label={focused.name} inert={bagOpen || undefined} data-show={panelShown || undefined} data-along={along || undefined} style={{ "--fl-travel": rtl ? -travel : travel } as React.CSSProperties}>
              {flat ? (
                <div className="fl-flat" key={focused.id} aria-hidden="true">
                  <div className="fl-flat-frame" style={{ "--aspect": focused.photo.width / focused.photo.height, "--baseline": focused.photo.baseline } as React.CSSProperties}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={focused.photo.large} alt="" decoding="async" />
                    <span className="fl-flat-shelf" />
                  </div>
                </div>
              ) : null}

              <div className="fl-stage-top">
                <button ref={firstInPanel} type="button" className="fl-back" onClick={() => closeShoe()}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
                    <path d={rtl ? "M9 5l7 7-7 7" : "M15 5l-7 7 7 7"} />
                  </svg>
                  <span className="fl-back-text">{labels.backToWall}</span>
                </button>
                <h2 ref={titleRef} key={`t${focused.id}`} className="fl-title fl-rise" data-wrap={titleWrap || undefined} style={{ "--i": 1, fontSize: titleSize } as React.CSSProperties}>
                  <span className="fl-title-mark" aria-hidden="true" />
                  {focused.name}
                </h2>
              </div>

              <div className="fl-stage-foot fl-rise" style={{ "--i": 2 } as React.CSSProperties}>
                <button type="button" className="fl-icon-button" aria-label={labels.previous} onClick={() => walk(false)}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
                    <path d="M15 5l-7 7 7 7" />
                  </svg>
                </button>
                {focused.views && focused.views.length > 1 && !flat ? (
                  <div className="fl-views" role="group" aria-label={labels.zoomIn}>
                    {focused.views.map((v, k) => (
                      <button
                        key={v.label}
                        type="button"
                        className="fl-view"
                        aria-pressed={view === k}
                        onClick={() => {
                          setView(k);
                          setZoomed(false);
                          roomRef.current?.closerLook(v.zoom, v.x, v.y, 6);
                        }}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="fl-views-gap" />
                )}
                <button type="button" className="fl-icon-button" aria-label={labels.next} onClick={() => walk(true)}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <aside className="fl-panel" key={`p${focused.id}`}>
                <p className="fl-series fl-rise" style={{ "--i": 2 } as React.CSSProperties}>
                  {[focused.series, focused.colourName].filter(Boolean).join(" · ")}
                </p>
                <p className="fl-price fl-rise" style={{ "--i": 3 } as React.CSSProperties}>
                  {focused.compareAtPrice ? <s>{formatPrice(focused.compareAtPrice, focused.currency)}</s> : null}
                  <span>{formatPrice(focused.price, focused.currency)}</span>
                </p>
                {focused.description ? (
                  <p className="fl-desc fl-rise" style={{ "--i": 4 } as React.CSSProperties}>
                    {focused.description}
                  </p>
                ) : null}

                <div className="fl-size-head fl-rise" style={{ "--i": 5 } as React.CSSProperties}>
                  <span>
                    {labels.size}
                    {chosen && chosen === remembered ? <em className="fl-your-size"> · {labels.yourSize}</em> : null}
                  </span>
                  {focused.sizes.some((s) => s.us) ? (
                    <span className="fl-units" role="group" aria-label={labels.size}>
                      {(["eu", "us", "uk"] as SizeUnit[])
                        .filter((u) => u === "eu" || focused.sizes.some((s) => s[u]))
                        .map((u) => (
                          <button key={u} type="button" aria-pressed={unit === u} onClick={() => setUnit(u)}>
                            {u.toUpperCase()}
                          </button>
                        ))}
                    </span>
                  ) : null}
                </div>
                <div ref={tilesRef} className="fl-rise" style={{ "--i": 6 } as React.CSSProperties}>
                  <SizeTiles sizes={focused.sizes} value={chosen} unit={unit} onChange={chooseSize} label={labels.size} soldOutLabel={labels.soldOut} pulse={tilePulse} />
                </div>

                <div className="fl-buy fl-rise" style={{ "--i": 7 } as React.CSSProperties}>
                  <AddToBagPill state={pill} labels={pillLabels} color={focusedColour} ink={focusedInk} onClick={add} />
                  <p className="fl-reserved" data-kind={reserved.kind}>
                    {reserved.kind === "added" ? (
                      <button type="button" className="fl-text-button" onClick={() => setBagOpen(true)}>
                        {labels.viewBag}
                      </button>
                    ) : (
                      (reserved.text ?? " ")
                    )}
                  </p>
                </div>

                {focused.returnsNote ? (
                  <details className="fl-details fl-rise" style={{ "--i": 8 } as React.CSSProperties}>
                    <summary>{labels.materialsAndFit}</summary>
                    <p>{focused.returnsNote}</p>
                  </details>
                ) : null}
              </aside>
            </div>
          ) : null}

          <BagDrawer open={bagOpen} lines={bag} labels={labels} formatPrice={formatPrice} onClose={() => setBagOpen(false)} onChange={setBag} onCheckout={onCheckout} dir={dir} />
        </div>

        <div ref={planeRef} className="fl-plane" inert={focusIndex >= 0 || bagOpen || undefined}>
          <header className="fl-heading">
            {eyebrow ? <p className="fl-eyebrow">{eyebrow}</p> : null}
            {heading ? <h1 className="fl-h1">{heading}</h1> : null}
          </header>
          <ul className="fl-wall">
            {shoes.map((shoe, i) => (
              <li key={shoe.id} className="fl-slot" style={{ ...slotVars(i, count, rtl), "--aspect": shoe.photo.width / shoe.photo.height, "--baseline": shoe.photo.baseline, "--led": colours[i] } as React.CSSProperties}>
                <a
                  ref={(el) => {
                    linkRefs.current[i] = el;
                  }}
                  href={shoe.href}
                  className="fl-link"
                  onPointerEnter={(e) => {
                    if (e.pointerType === "touch") return;
                    roomRef.current?.hover(i);
                    roomRef.current?.preload(i);
                  }}
                  onPointerLeave={() => roomRef.current?.hover(-1)}
                  onFocus={() => {
                    roomRef.current?.hover(i);
                    roomRef.current?.preload(i);
                  }}
                  onBlur={() => roomRef.current?.hover(-1)}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                    e.preventDefault();
                    openShoe(i);
                  }}
                >
                  <span className="fl-card">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="fl-poster"
                      src={shoe.photo.src}
                      srcSet={shoe.photo.srcSet}
                      sizes="(min-width: 700px) 481px, 50vw"
                      alt={shoe.photo.alt}
                      width={shoe.photo.width}
                      height={shoe.photo.height}
                      decoding="async"
                      fetchPriority={i < 5 ? "high" : undefined}
                      draggable={false}
                      onError={(e) => {
                        e.currentTarget.dataset.error = "";
                      }}
                    />
                  </span>
                  <span className="fl-shelf" aria-hidden="true" />
                  <span className="fl-caption">
                    <span className="fl-caption-name">{shoe.name}</span>
                    <span className="fl-caption-price">{formatPrice(shoe.price, shoe.currency)}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p className="fl-hint">
            <span className="fl-hint-fine">{labels.hint}</span>
            <span className="fl-hint-touch">{labels.hintTouch}</span>
          </p>
        </div>

        <p className="fl-live" role="status" aria-live="polite">
          {live}
        </p>
      </div>
    </section>
  );
}

export default Floodlit;
