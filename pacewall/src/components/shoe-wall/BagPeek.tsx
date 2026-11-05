"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { defaultFormatPrice, defaultLabels } from "./labels";
import type { ShoeWallLabels } from "./types";

export type BagItem = {
  key: string;
  name: string;
  size: string;
  quantity: number;
  price: number;
  currency: string;
  image: string;
  alt?: string;
  href?: string;
};

export type BagPeekProps = {
  open: boolean;
  items: BagItem[];
  onClose: () => void;
  onRemove: (key: string) => void;
  onQuantity?: (key: string, quantity: number) => void;
  onCheckout?: () => void;
  labels?: Partial<ShoeWallLabels>;
  formatPrice?: (amount: number, currency: string) => string;
  theme?: "auto" | "light" | "dark";
  dir?: "ltr" | "rtl";
  top?: number;
};

/** A compact look into the bag: image, name, size, quantity, remove, subtotal, checkout. */
export function BagPeek({ open, items, onClose, onRemove, onQuantity, onCheckout, labels: given, formatPrice = defaultFormatPrice, theme = "auto", dir, top = 0 }: BagPeekProps) {
  const labels = { ...defaultLabels, ...given };
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panel.current) {
        const all = panel.current.querySelectorAll<HTMLElement>("button, a[href]");
        if (!all.length) return;
        const first = all[0];
        const last = all[all.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
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
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const currency = items[0]?.currency ?? "USD";

  return createPortal(
    <div className="pw-root pw-sheet-root pw-bag-root" data-theme={theme} dir={dir} style={{ top }}>
      <div className="pw-sheet-scrim" onClick={onClose} />
      <div ref={panel} className="pw-bag" role="dialog" aria-modal="true" aria-label={labels.bagTitle} tabIndex={-1}>
        <div className="pw-bag-head">
          <h2>{labels.bagTitle}</h2>
          <button type="button" className="pw-icon-button" aria-label={labels.bagClose} onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <path d="m4 4 10 10M14 4 4 14" />
            </svg>
          </button>
        </div>
        {items.length === 0 ? (
          <p className="pw-bag-empty">{labels.bagEmpty}</p>
        ) : (
          <ul className="pw-bag-list">
            {items.map((item) => (
              <li key={item.key} className="pw-bag-item">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image} alt={item.alt ?? ""} width={84} height={56} />
                <div className="pw-bag-info">
                  <strong>{item.name}</strong>
                  <span>{item.size}</span>
                  <div className="pw-bag-row">
                    <div className="pw-qty" role="group" aria-label={labels.bagQuantity}>
                      <button type="button" aria-label={`${labels.bagQuantity} -1`} disabled={item.quantity <= 1} onClick={() => onQuantity?.(item.key, item.quantity - 1)}>
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button type="button" aria-label={`${labels.bagQuantity} +1`} onClick={() => onQuantity?.(item.key, item.quantity + 1)}>
                        +
                      </button>
                    </div>
                    <span className="pw-bag-price">{formatPrice(item.price * item.quantity, item.currency)}</span>
                  </div>
                  <button type="button" className="pw-text-button" onClick={() => onRemove(item.key)} aria-label={labels.bagRemove(item.name)}>
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="pw-bag-foot">
          <div className="pw-bag-total">
            <span>{labels.bagSubtotal}</span>
            <strong>{formatPrice(subtotal, currency)}</strong>
          </div>
          <button type="button" className="pw-add" data-state="ready" disabled={items.length === 0} onClick={onCheckout}>
            <span className="pw-add-text">{labels.bagCheckout}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
