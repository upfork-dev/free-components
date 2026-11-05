"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { ShoeDensity, ShoeSort, ShoeWallLabels } from "./types";

/** Tiny walls of little shelves: 2 rows of 3, 4 or 6 short lines. */
function DensityIcon({ density }: { density: ShoeDensity }) {
  const count = density === "l" ? 3 : density === "m" ? 4 : 6;
  const gap = 1.5;
  const width = (20 - gap * (count - 1)) / count;
  const marks: ReactNode[] = [];
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < count; i++) {
      marks.push(<rect key={`${row}-${i}`} x={2 + i * (width + gap)} y={row === 0 ? 7 : 15} width={width} height={2} />);
    }
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      {marks}
    </svg>
  );
}

const DENSITIES: ShoeDensity[] = ["l", "m", "s"];

function DensityControl({ value, onChange, labels }: { value: ShoeDensity; onChange: (d: ShoeDensity, origin?: Element | null) => void; labels: ShoeWallLabels }) {
  const name = useId();
  return (
    <fieldset className="pw-density" style={{ "--pw-density-at": DENSITIES.indexOf(value) } as React.CSSProperties}>
      <legend className="pw-visually-hidden">{labels.densityLabel}</legend>
      {DENSITIES.map((d) => (
        <label key={d} title={labels.densityNames[d]}>
          <input
            type="radio"
            name={name}
            value={d}
            checked={value === d}
            onChange={(e) => onChange(d, e.currentTarget)}
            aria-label={labels.densityNames[d]}
          />
          <DensityIcon density={d} />
        </label>
      ))}
      <span className="pw-density-mark" aria-hidden />
    </fieldset>
  );
}

/** A themed listbox: the native one cannot wear the wall's colours when it opens. */
function Menu<T extends string>({
  label,
  value,
  options,
  onChange,
  variant,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; className?: string }[];
  onChange: (v: T, origin?: Element | null) => void;
  variant?: "sizes";
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    list.current?.focus();
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  const choose = (v: T) => {
    setOpen(false);
    button.current?.focus();
    if (v !== value) onChange(v, button.current);
  };

  const onListKey = (e: KeyboardEvent) => {
    const step = variant === "sizes" ? 3 : 1;
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      button.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(options.length - 1, a + step));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - step));
    } else if (e.key === "ArrowRight" && variant === "sizes") {
      e.preventDefault();
      setActive((a) => Math.min(options.length - 1, a + 1));
    } else if (e.key === "ArrowLeft" && variant === "sizes") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(options[active].value);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div className="pw-menu-wrap" ref={wrap}>
      <button
        ref={button}
        type="button"
        className="pw-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => {
          setActive(Math.max(0, options.findIndex((o) => o.value === value)));
          setOpen((o) => !o);
        }}
      >
        <span className="pw-menu-label">{label}</span>
        <span>{current?.label}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
          <path d="M1.5 3.5 5 7l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      {open ? (
        <ul
          ref={list}
          id={id}
          role="listbox"
          aria-label={label}
          tabIndex={-1}
          aria-activedescendant={`${id}-${active}`}
          className={variant === "sizes" ? "pw-menu pw-menu-sizes" : "pw-menu"}
          onKeyDown={onListKey}
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              id={`${id}-${i}`}
              role="option"
              aria-selected={o.value === value}
              data-active={i === active}
              className={`pw-menu-item ${o.className ?? ""}`}
              onPointerEnter={() => setActive(i)}
              onClick={() => choose(o.value)}
            >
              {o.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export type ToolbarProps = {
  count: number;
  labels: ShoeWallLabels;
  sort: ShoeSort;
  onSort: (s: ShoeSort, origin?: Element | null) => void;
  categories: string[];
  category: string | null;
  onCategory: (c: string | null, origin?: Element | null) => void;
  sizes: string[];
  size: string | null;
  onSize: (s: string | null, origin?: Element | null) => void;
  density: ShoeDensity;
  onDensity: (d: ShoeDensity, origin?: Element | null) => void;
  onShuffle: (origin?: Element | null) => void;
  shuffled: boolean;
  onOriginal: (origin?: Element | null) => void;
  spin: number;
  sound?: { on: boolean; toggle: () => void };
  onFilter: () => void;
  bag?: { count: number; bump: number; open?: () => void };
};

const SORTS: ShoeSort[] = ["featured", "newest", "price-asc", "price-desc", "colour"];

export function Toolbar(p: ToolbarProps) {
  const { labels } = p;
  return (
    <div className="pw-bar">
      <span className="pw-count" data-testid="pw-count">
        {labels.pairs(p.count)}
      </span>
      <Menu
        label={labels.sortLabel}
        value={p.sort}
        options={SORTS.map((s) => ({ value: s, label: labels.sortNames[s] }))}
        onChange={p.onSort}
      />
      {p.categories.length > 1 ? (
        <div className="pw-chips" role="group" aria-label={labels.filter}>
          <button type="button" className="pw-chip" aria-pressed={p.category === null} onClick={(e) => p.onCategory(null, e.currentTarget)}>
            {labels.allCategories}
          </button>
          {p.categories.map((c) => (
            <button key={c} type="button" className="pw-chip" aria-pressed={p.category === c} onClick={(e) => p.onCategory(c, e.currentTarget)}>
              {c}
            </button>
          ))}
        </div>
      ) : null}
      {p.sizes.length > 1 ? (
        <Menu
          label={labels.yourSize}
          value={p.size ?? ""}
          variant="sizes"
          options={[
            { value: "", label: labels.anySize, className: "pw-menu-any" },
            ...p.sizes.map((s) => ({ value: s, label: s })),
          ]}
          onChange={(v, origin) => p.onSize(v || null, origin)}
        />
      ) : null}
      <button type="button" className="pw-button pw-filter-button" hidden={p.categories.length < 2 && p.sizes.length < 2} onClick={p.onFilter}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M1 4h14M4 8h8M6.5 12h3" />
        </svg>
        {labels.filter}
      </button>
      <div className="pw-bar-end">
        <button type="button" className="pw-button pw-original" data-hidden={!p.shuffled} tabIndex={p.shuffled ? 0 : -1} aria-hidden={!p.shuffled} onClick={(e) => p.onOriginal(e.currentTarget)}>
          {labels.originalOrder}
        </button>
        <DensityControl value={p.density} onChange={p.onDensity} labels={labels} />
        <button type="button" className="pw-button" onClick={(e) => p.onShuffle(e.currentTarget)} aria-label={labels.shuffle}>
          <svg
            className="pw-shuffle-icon"
            style={{ transform: `rotate(${p.spin * 180}deg)` }}
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden
          >
            <path d="M2 5h3.2c1 0 1.9.5 2.5 1.3l2.6 5.4c.6.8 1.5 1.3 2.5 1.3H16M2 13h3.2c1 0 1.9-.5 2.5-1.3M10.3 6.3c.6-.8 1.5-1.3 2.5-1.3H16M13.8 2.8 16 5l-2.2 2.2M13.8 10.8 16 13l-2.2 2.2" />
          </svg>
        </button>
        {p.bag ? (
          <button type="button" className="pw-button" onClick={p.bag.open} aria-label={`${labels.bagTitle}: ${p.bag.count}`}>
            <span key={p.bag.bump} className="pw-bag-count">
              {p.bag.count}
            </span>
          </button>
        ) : null}
        {p.sound ? (
          <button type="button" className="pw-button" aria-pressed={p.sound.on} aria-label={labels.sound} onClick={p.sound.toggle}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <path d="M3 7v4h3l4 3V4L6 7H3Z" />
              {p.sound.on ? <path d="M12.5 6.5a4 4 0 0 1 0 5M14.5 4.5a7 7 0 0 1 0 9" /> : <path d="m13 7 3.5 4M16.5 7 13 11" />}
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}
