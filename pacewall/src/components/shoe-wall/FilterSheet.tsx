"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { ShoeSort, ShoeWallLabels } from "./types";

type Props = {
  open: boolean;
  onClose: () => void;
  labels: ShoeWallLabels;
  theme: string;
  dir?: string;
  sort: ShoeSort;
  onSort: (s: ShoeSort) => void;
  categories: string[];
  category: string | null;
  onCategory: (c: string | null) => void;
  sizes: string[];
  size: string | null;
  onSize: (s: string | null) => void;
};

const SORTS: ShoeSort[] = ["featured", "newest", "price-asc", "price-desc", "colour"];

/** On phones, sort, categories and size live in a bottom sheet. */
export function FilterSheet(p: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    if (!p.open) return;
    opener.current = document.activeElement;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") p.onClose();
      if (e.key === "Tab" && panel.current) {
        const items = panel.current.querySelectorAll<HTMLElement>("button");
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      (opener.current as HTMLElement | null)?.focus?.();
    };
    // The handler only needs the latest onClose, which the parent keeps stable enough for one open sheet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.open]);

  if (!p.open) return null;

  return createPortal(
    <div className="pw-root pw-sheet-root" data-theme={p.theme} dir={p.dir}>
      <div className="pw-sheet-scrim" onClick={p.onClose} />
      <div ref={panel} className="pw-sheet" role="dialog" aria-modal="true" aria-label={p.labels.filter} tabIndex={-1}>
        <div className="pw-sheet-group">
          <h3>{p.labels.sortLabel}</h3>
          <div className="pw-sheet-options">
            {SORTS.map((s) => (
              <button key={s} type="button" className="pw-sheet-option" aria-pressed={p.sort === s} onClick={() => p.onSort(s)}>
                {p.labels.sortNames[s]}
              </button>
            ))}
          </div>
        </div>
        {p.categories.length > 1 ? (
          <div className="pw-sheet-group">
            <h3>{p.labels.filter}</h3>
            <div className="pw-sheet-options">
              <button type="button" className="pw-sheet-option" aria-pressed={p.category === null} onClick={() => p.onCategory(null)}>
                {p.labels.allCategories}
              </button>
              {p.categories.map((c) => (
                <button key={c} type="button" className="pw-sheet-option" aria-pressed={p.category === c} onClick={() => p.onCategory(c)}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {p.sizes.length > 1 ? (
          <div className="pw-sheet-group">
            <h3>{p.labels.yourSize}</h3>
            <div className="pw-sheet-options pw-sheet-sizes">
              <button type="button" className="pw-sheet-option" aria-pressed={p.size === null} onClick={() => p.onSize(null)}>
                {p.labels.anySize}
              </button>
              {p.sizes.map((s) => (
                <button key={s} type="button" className="pw-sheet-option" aria-pressed={p.size === s} onClick={() => p.onSize(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <button type="button" className="pw-button pw-solid pw-sheet-done" onClick={p.onClose}>
          {p.labels.filterDone}
        </button>
      </div>
    </div>,
    document.body,
  );
}
