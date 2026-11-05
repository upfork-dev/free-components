"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { defaultFormatPrice, defaultLabels } from "./labels";
import { FilterSheet } from "./FilterSheet";
import { ShoeDetail } from "./ShoeDetail";
import { markAway, Slot } from "./Slot";
import { Toolbar } from "./Toolbar";
import { WallEngine, type MoveKind } from "./engine/flight";
import { generator, shuffle, visibleShoes, type Arrangement } from "./engine/order";
import { tap } from "./engine/sound";
import type { Shoe, ShoeDensity, ShoeSize, ShoeSort, ShoeWallProps } from "./types";
import "./styles.css";

const STORAGE_KEY = "pacewall-density";

/** Free slots at the end of the last row, for every column count the wall can have. */
function freeSlots(count: number, columns: number): number {
  return (columns - (count % columns)) % columns;
}
const COLUMN_COUNTS = [1, 2, 3, 4, 6];

const SIZES_FOR: Record<ShoeDensity, string> = {
  l: "(min-width: 1200px) 33vw, (min-width: 480px) 50vw, 100vw",
  m: "(min-width: 1200px) 25vw, (min-width: 800px) 33vw, 50vw",
  s: "(min-width: 1200px) 17vw, (min-width: 800px) 25vw, 33vw",
};

/** A sandboxed frame has no origin, so its address cannot be rewritten. The view works without it. */
function writeAddress(how: "pushState" | "replaceState", url: URL): boolean {
  try {
    window.history[how](null, "", url);
    return true;
  } catch {
    return false;
  }
}

export function ShoeWall(props: ShoeWallProps) {
  const { shoes, theme = "auto", shelf = "auto", moreHref, totalCount, dir, seed, className, stickyTop = 0 } = props;

  const labels = useMemo(() => ({ ...defaultLabels, ...props.labels }), [props.labels]);
  const formatPrice = props.formatPrice ?? defaultFormatPrice;

  const [innerDensity, setInnerDensity] = useState<ShoeDensity>(props.defaultDensity ?? "m");
  const density = props.density ?? innerDensity;

  const [arrangement, setArrangement] = useState<Arrangement>({
    sort: props.defaultSort ?? "featured",
    category: null,
    size: null,
    shuffled: null,
  });
  const sort = props.sort ?? arrangement.sort;
  const current = useMemo(() => ({ ...arrangement, sort }), [arrangement, sort]);
  const visible = useMemo(() => visibleShoes(shoes, current), [shoes, current]);

  // A shoe's place in the first layout, fixed for good: a move must not re-render every slot.
  const firstPlace = useMemo(() => new Map(shoes.map((s, i) => [s.id, i])), [shoes]);
  const filters = props.filters !== false;
  const Heading = `h${props.headingLevel ?? 2}` as "h1" | "h2" | "h3";
  const categories = useMemo(() => (filters ? [...new Set(shoes.map((s) => s.category))] : []), [filters, shoes]);
  const sizes = useMemo(
    () => (filters ? [...new Set(shoes.flatMap((s) => s.sizes.map((z) => z.eu)))].sort((a, b) => Number(a) - Number(b)) : []),
    [filters, shoes],
  );
  const tallest = useMemo(
    () => shoes.reduce((max, s) => Math.max(max, (s.photo.height * s.photo.baseline) / s.photo.width), 0) + 0.02,
    [shoes],
  );

  const randomRef = useRef<(() => number) | null>(null);
  const [spin, setSpin] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const live = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const announce = useCallback((text: string) => {
    if (live.current) live.current.textContent = text;
  }, []);

  // The image source follows the largest slot seen so far, and only changes after a landing.
  const [imageSizes, setImageSizes] = useState(SIZES_FOR[props.density ?? props.defaultDensity ?? "m"]);
  const largestSlot = useRef(0);
  const visibleRef = useRef(visible);
  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  const engine = useRef<WallEngine | null>(null);
  const getEngine = useCallback(() => {
    engine.current ??= new WallEngine(
      () => box.current,
      () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    return engine.current;
  }, []);

  const afterLanding = useCallback(() => {
    const stage = box.current?.querySelector<HTMLElement>(".pw-stage");
    if (!stage) return;
    const width = Math.ceil(stage.getBoundingClientRect().width);
    if (width <= largestSlot.current) return;
    const first = largestSlot.current === 0;
    largestSlot.current = width;
    if (first) return;
    const next = `${width}px`;
    // Decode first, so the swap never shows an empty frame. A failed probe must not hold it back.
    Promise.all(
      visibleRef.current.slice(0, 12).map((shoe) => {
        const probe = new Image();
        probe.sizes = next;
        probe.srcset = shoe.photo.avifSrcSet ?? shoe.photo.srcSet ?? "";
        probe.src = shoe.photo.src;
        return probe.decode().catch(() => undefined);
      }),
    ).then(() => setImageSizes(next));
  }, []);

  useEffect(() => {
    const stage = box.current?.querySelector<HTMLElement>(".pw-stage");
    if (stage) largestSlot.current = Math.ceil(stage.getBoundingClientRect().width);
  }, []);

  const soundRef = useRef(soundOn);
  useEffect(() => {
    soundRef.current = soundOn;
  }, [soundOn]);

  const run = (kind: MoveKind, origin: Element | null | undefined, commit: () => void) => {
    getEngine().move({
      kind,
      origin,
      commit: () => flushSync(commit),
      onSettled: afterLanding,
      onLand: () => {
        if (soundRef.current) tap();
      },
    });
  };

  // Remembered only after hydration, so the server's markup stays stable.
  useEffect(() => {
    if (props.density || props.defaultDensity) return;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as ShoeDensity | null;
      if (saved === "l" || saved === "m" || saved === "s") setInnerDensity(saved);
    } catch {
      /* Storage can be blocked; the default density is fine. */
    }
  }, [props.density, props.defaultDensity]);

  // One soft pool of light follows a fine pointer: one layer, eased by a transition on its transform.
  useEffect(() => {
    const host = box.current;
    if (!host || props.pointerLight === false) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const light = host.querySelector<HTMLElement>(".pw-light");
    if (!light) return;
    let x = 0;
    let y = 0;
    let frame = 0;
    let started = false;
    const place = () => {
      frame = 0;
      light.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    };
    const onMove = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
      if (!started) {
        // The first placing must not slide in from a corner.
        started = true;
        light.style.transition = "opacity 500ms ease";
        place();
        light.style.opacity = "1";
        requestAnimationFrame(() => {
          light.style.transition = "";
        });
        return;
      }
      if (!frame) frame = requestAnimationFrame(place);
    };
    const onLeave = () => {
      started = false;
      light.style.opacity = "0";
    };
    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerleave", onLeave);
    return () => {
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(frame);
    };
  }, [props.pointerLight]);

  const changeDensity = (d: ShoeDensity, origin?: Element | null) => {
    if (d === density) return;
    run("density", origin, () => {
      setInnerDensity(d);
      props.onDensityChange?.(d);
    });
    announce(labels.announceDensity(labels.densityNames[d]));
    try {
      window.localStorage.setItem(STORAGE_KEY, d);
    } catch {
      /* Not remembered this time. */
    }
  };

  const changeSort = (s: ShoeSort, origin?: Element | null) => {
    run("sort", origin, () => {
      setArrangement((a) => ({ ...a, sort: s, shuffled: null }));
      props.onSortChange?.(s);
    });
    announce(labels.announceSorted(visible.length, labels.sortNames[s]));
  };

  const changeCategory = (c: string | null, origin?: Element | null) => {
    run("filter", origin, () => setArrangement((a) => ({ ...a, category: c, shuffled: null })));
    announce(labels.announceFiltered(visibleShoes(shoes, { ...current, category: c, shuffled: null }).length));
  };

  const changeSize = (z: string | null, origin?: Element | null) => {
    run("filter", origin, () => setArrangement((a) => ({ ...a, size: z, shuffled: null })));
    announce(labels.announceFiltered(visibleShoes(shoes, { ...current, size: z, shuffled: null }).length));
  };

  const doShuffle = (origin?: Element | null) => {
    randomRef.current ??= generator(seed ?? Date.now());
    run("shuffle", origin, () => {
      setArrangement((a) => ({ ...a, shuffled: shuffle(visibleRef.current, randomRef.current as () => number) }));
      setSpin((n) => n + 1);
    });
    announce(labels.announceShuffled(visible.length));
  };

  const restoreOrder = (origin?: Element | null) => {
    run("restore", origin, () => setArrangement((a) => ({ ...a, shuffled: null })));
    announce(labels.announceSorted(visible.length, labels.sortNames[sort]));
  };

  const clearFilters = (origin?: Element | null) => {
    run("filter", origin, () => setArrangement((a) => ({ ...a, category: null, size: null, shuffled: null })));
    announce(labels.announceFiltered(visibleShoes(shoes, { ...current, category: null, size: null, shuffled: null }).length));
  };

  /* ---------- The detail view ---------- */
  const [wallEl, setWallEl] = useState<HTMLElement | null>(null);
  const param = typeof props.syncUrl === "object" ? props.syncUrl.param : "shoe";
  const syncUrl = !!props.syncUrl;
  const [view, setView] = useState<{ slug: string; morph: boolean } | null>(null);
  const [closing, setClosing] = useState(false);
  const [chosenSize, setChosenSize] = useState<string | null>(null);
  const [fromEl, setFromEl] = useState<HTMLElement | null>(null);
  const pushed = useRef(false);
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  const slotOf = useCallback(
    (slug: string) => box.current?.querySelector<HTMLElement>(`.pw-slot[data-slug="${CSS.escape(slug)}"]`) ?? null,
    [],
  );

  const openShoe = useCallback(
    (slug: string, morph: boolean, source: HTMLElement | null) => {
      flushSync(() => {
        setFromEl(source);
        setClosing(false);
        setView({ slug, morph });
      });
      props.onOpenChange?.(slug);
      const shoe = shoes.find((s) => s.slug === slug);
      if (shoe) announce(labels.announceOpened(shoe.name));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shoes, labels],
  );

  const onOpen = useCallback(
    (shoe: Shoe, event: React.MouseEvent<HTMLAnchorElement>) => {
      // Middle click, a new tab and the like keep doing what links do.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      openShoe(shoe.slug, true, event.currentTarget.closest<HTMLElement>(".pw-slot"));
      if (syncUrl) {
        const url = new URL(window.location.href);
        url.searchParams.set(param, shoe.slug);
        pushed.current = writeAddress("pushState", url);
      }
    },
    [openShoe, param, syncUrl],
  );

  const requestClose = useCallback(() => {
    if (!viewRef.current) return;
    setClosing(true);
    props.onOpenChange?.(null);
    if (syncUrl) {
      if (pushed.current) {
        pushed.current = false;
        window.history.back();
      } else {
        const url = new URL(window.location.href);
        url.searchParams.delete(param);
        writeAddress("replaceState", url);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [param, syncUrl]);

  const finishClose = useCallback(() => {
    const source = fromEl;
    flushSync(() => {
      setView(null);
      setClosing(false);
    });
    source?.querySelector<HTMLElement>("a")?.focus({ preventScroll: true });
  }, [fromEl]);

  const navigate = useCallback(
    (shoe: Shoe) => {
      markAway(fromEl, false);
      const next = slotOf(shoe.slug);
      markAway(next, true);
      // Behind the view, the wall follows, so the close lands on a shoe that is in sight.
      next?.scrollIntoView({ block: "center", behavior: "instant" });
      setFromEl(next);
      setView((v) => (v ? { ...v, slug: shoe.slug } : v));
      props.onOpenChange?.(shoe.slug);
      announce(labels.announceOpened(shoe.name));
      if (syncUrl) {
        const url = new URL(window.location.href);
        url.searchParams.set(param, shoe.slug);
        writeAddress("replaceState", url);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fromEl, labels, param, slotOf, syncUrl],
  );

  // A deep link opens on load, and browser back and forward are followed. Own state, not useSearchParams (L-ZPDX).
  useEffect(() => {
    const initial = props.openSlug ?? props.defaultOpenSlug ?? (syncUrl ? new URLSearchParams(window.location.search).get(param) : null);
    if (initial && shoes.some((s) => s.slug === initial)) {
      setFromEl(slotOf(initial));
      setView({ slug: initial, morph: false });
    }
    if (!syncUrl) return;
    const onPop = () => {
      const slug = new URLSearchParams(window.location.search).get(param);
      if (slug && shoes.some((s) => s.slug === slug)) {
        if (viewRef.current?.slug !== slug) openShoe(slug, false, slotOf(slug));
      } else if (viewRef.current) {
        pushed.current = false;
        setClosing(true);
        props.onOpenChange?.(null);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A parent that controls the open shoe.
  useEffect(() => {
    if (props.openSlug === undefined) return;
    if (props.openSlug && viewRef.current?.slug !== props.openSlug) {
      if (shoes.some((s) => s.slug === props.openSlug)) openShoe(props.openSlug, false, slotOf(props.openSlug));
    } else if (!props.openSlug && viewRef.current) {
      setClosing(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.openSlug]);

  // The wall is out of reach while the dialog is open.
  const isOpen = !!view;
  useLayoutEffect(() => {
    if (!wallEl || !isOpen) return;
    const wall = wallEl;
    // After the landing: inert restyles the whole wall, and the flight must not wait for that.
    // Until then the dialog's own focus trap holds the keyboard and its backdrop the pointer.
    const timer = window.setTimeout(() => wall.setAttribute("inert", ""), 760);
    return () => {
      window.clearTimeout(timer);
      wall.removeAttribute("inert");
    };
  }, [isOpen, wallEl]);

  // After 80 ms of hover or focus, quietly decode the larger picture, so the detail view opens sharp.
  const intentTimer = useRef(0);
  const onIntent = useCallback((shoe: Shoe, on: boolean) => {
    window.clearTimeout(intentTimer.current);
    if (!on) return;
    intentTimer.current = window.setTimeout(() => {
      const probe = new Image();
      probe.src = shoe.photo.src;
      probe.decode().catch(() => undefined);
    }, 80);
  }, []);

  const [bagBump, setBagBump] = useState(0);
  const onAdded = useCallback(
    (shoe: Shoe, size: ShoeSize, image: HTMLElement | null) => {
      announce(labels.announceAdded(shoe.name, size.eu));
      setBagBump((n) => n + 1);
      const anchor = props.bagAnchor?.();
      if (!anchor) return;
      const spring = () =>
        anchor.animate(
          [{ transform: "scale(1)" }, { transform: "scale(1.22)", offset: 0.34 }, { transform: "scale(0.96)", offset: 0.68 }, { transform: "scale(1)" }],
          { duration: 420, easing: "ease-out" },
        );
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !image) {
        spring();
        return;
      }
      // A small copy of the shoe arcs to the bag.
      const a = image.getBoundingClientRect();
      const b = anchor.getBoundingClientRect();
      const copy = document.createElement("img");
      copy.src = shoe.photo.src;
      copy.alt = "";
      const width = Math.min(120, a.width);
      copy.style.cssText = `position:fixed;left:0;top:0;width:${width}px;height:auto;z-index:70;pointer-events:none;will-change:transform;`;
      document.body.appendChild(copy);
      const x0 = a.left + a.width / 2 - width / 2;
      const y0 = a.top + a.height / 2 - (width * shoe.photo.height) / shoe.photo.width / 2;
      const x1 = b.left + b.width / 2 - width / 2;
      const y1 = b.top + b.height / 2 - (width * shoe.photo.height) / shoe.photo.width / 2;
      const frames: Keyframe[] = [];
      for (let i = 0; i <= 24; i++) {
        const t = i / 24;
        const e = t * t * (3 - 2 * t);
        const y = y0 + (y1 - y0) * e - Math.sin(Math.PI * t) * 60;
        const x = x0 + (x1 - x0) * e;
        const s = 1 - 0.8 * e;
        frames.push({ transform: `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${s.toFixed(3)})`, opacity: t > 0.86 ? (1 - t) / 0.14 : 1 });
      }
      const flight = copy.animate(frames, { duration: 560, easing: "linear", fill: "both" });
      flight.onfinish = () => {
        copy.remove();
        spring();
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [labels],
  );

  const openShoeData = view ? shoes.find((s) => s.slug === view.slug) : null;

  const ghosts = useMemo(() => {
    const most = Math.max(...COLUMN_COUNTS.map((c) => freeSlots(visible.length, c)));
    return Array.from({ length: most }, (_, i) => ({
      key: i,
      columns: COLUMN_COUNTS.filter((c) => i < freeSlots(visible.length, c)).join(" "),
    }));
  }, [visible.length]);
  const noFree = COLUMN_COUNTS.filter((c) => freeSlots(visible.length, c) === 0).join(" ");

  const rootStyle = {
    "--pw-sticky-top": `${stickyTop}px`,
    "--pw-tallest": tallest,
  } as React.CSSProperties;

  return (
    <section
      ref={setWallEl}
      className={`pw-root${className ? ` ${className}` : ""}`}
      data-theme={theme}
      data-shelf={shelf === "auto" ? undefined : shelf}
      dir={dir}
      style={rootStyle}
      aria-label={labels.heading || undefined}
    >
      {labels.heading || labels.eyebrow ? (
        <header className="pw-head">
          {labels.eyebrow ? <p className="pw-eyebrow">{labels.eyebrow}</p> : null}
          {labels.heading ? <Heading className="pw-heading">{labels.heading}</Heading> : null}
        </header>
      ) : null}

      {shoes.length > 0 ? (
        <Toolbar
          count={visible.length}
          labels={labels}
          sort={sort}
          onSort={changeSort}
          categories={categories}
          category={arrangement.category}
          onCategory={changeCategory}
          sizes={sizes}
          size={arrangement.size}
          onSize={changeSize}
          density={density}
          onDensity={changeDensity}
          onShuffle={doShuffle}
          shuffled={arrangement.shuffled !== null}
          onOriginal={restoreOrder}
          spin={spin}
          sound={props.sound ? { on: soundOn, toggle: () => setSoundOn((v) => !v) } : undefined}
          onFilter={() => setSheetOpen(true)}
          bag={props.bagCount !== undefined && !props.bagAnchor ? { count: props.bagCount, bump: bagBump, open: props.onViewBag } : undefined}
        />
      ) : null}

      <div className="pw-wallbox" ref={box}>
        <div className="pw-lightbox" aria-hidden>
          <div className="pw-light" />
        </div>

        {shoes.length === 0 ? (
          <div className="pw-empty">
            <h3>{labels.noShoesTitle}</h3>
            <p>{labels.noShoesBody}</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="pw-empty">
            <h3>{labels.emptyTitle}</h3>
            <p>{labels.emptyBody}</p>
            <button type="button" className="pw-button pw-solid" onClick={(e) => clearFilters(e.currentTarget)}>
              {labels.emptyClear}
            </button>
          </div>
        ) : (
          <ul className="pw-wall" data-density={density}>
            {visible.map((shoe) => (
              <Slot
                key={shoe.id}
                shoe={shoe}
                index={firstPlace.get(shoe.id) ?? 99}
                sizes={imageSizes}
                labels={labels}
                formatPrice={formatPrice}
                renderImage={props.renderImage}
                renderLink={props.renderLink}
                onOpen={onOpen}
                onIntent={onIntent}
              />
            ))}
            {ghosts.map((g) => (
              <li key={g.key} className="pw-ghost" data-c={g.columns} aria-hidden={!(moreHref && g.key === 0) || undefined}>
                {moreHref && g.key === 0 ? (
                  <a className="pw-placard" href={moreHref}>
                    <div className="pw-stage">
                      <div className="pw-placard-face">
                        <svg className="pw-placard-arrow" viewBox="0 0 26 14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                          <path d="M0 7h24M18 1l6 6-6 6" />
                        </svg>
                        <span>{labels.seeAll(totalCount)}</span>
                      </div>
                    </div>
                    <div className="pw-shelf" aria-hidden />
                  </a>
                ) : (
                  <>
                    <div className="pw-stage" />
                    <div className="pw-shelf" />
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        {moreHref && noFree && visible.length > 0 ? (
          <p className="pw-more-line" data-c={noFree}>
            <a href={moreHref}>{labels.seeAll(totalCount)}</a>
          </p>
        ) : null}
      </div>

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        labels={labels}
        theme={theme}
        dir={dir}
        sort={sort}
        onSort={changeSort}
        categories={categories}
        category={arrangement.category}
        onCategory={changeCategory}
        sizes={sizes}
        size={arrangement.size}
        onSize={changeSize}
      />

      {view && openShoeData ? (
        <ShoeDetail
          key="pw-detail"
          shoe={openShoeData}
          shoes={visible}
          from={fromEl}
          wallRoot={wallEl}
          morph={view.morph}
          closing={closing}
          onClose={requestClose}
          onClosed={finishClose}
          onNavigate={navigate}
          onAddToBag={props.onAddToBag}
          onAdded={onAdded}
          onViewBag={props.onViewBag}
          onSizeGuide={props.onSizeGuide}
          chosenSize={chosenSize}
          onChooseSize={setChosenSize}
          labels={labels}
          formatPrice={formatPrice}
          theme={theme}
          dir={dir}
          detailTop={props.detailTop ?? 0}
        />
      ) : null}

      <div className="pw-visually-hidden" aria-live="polite" ref={live} />
    </section>
  );
}
