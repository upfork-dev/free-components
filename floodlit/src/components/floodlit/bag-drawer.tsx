"use client";

import { useEffect, useRef } from "react";
import type { BagLine, FloodlitLabels } from "./types";

export type BagDrawerProps = {
  open: boolean;
  lines: BagLine[];
  labels: FloodlitLabels;
  formatPrice: (amount: number, currency: string) => string;
  onClose: () => void;
  onChange: (lines: BagLine[]) => void;
  onCheckout?: () => void;
  dir?: "ltr" | "rtl";
};

/**
 * The bag belongs to the room: dark glass at night, pale by day, never a white slab on a dark room. It slides with
 * an eased transform. The world behind dims and softens in the shader, not with a blur over the page.
 */
export function BagDrawer({ open, lines, labels, formatPrice, onClose, onChange, onCheckout, dir }: BagDrawerProps) {
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      returnTo.current = document.activeElement as HTMLElement | null;
      closeButton.current?.focus({ preventScroll: true });
      return () => {
        returnTo.current?.focus?.({ preventScroll: true });
      };
    }
    return undefined;
  }, [open]);

  function trap(e: React.KeyboardEvent) {
    if (e.key !== "Tab" || !panel.current) return;
    const items = panel.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex="0"]');
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

  const currency = lines[0]?.currency ?? "USD";
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  const setQty = (key: string, qty: number) => {
    onChange(qty <= 0 ? lines.filter((l) => l.key !== key) : lines.map((l) => (l.key === key ? { ...l, qty } : l)));
  };

  return (
    <div className="fl-bag" data-open={open || undefined} dir={dir} aria-hidden={!open} inert={!open}>
      <div className="fl-bag-backdrop" onClick={onClose} />
      <div ref={panel} className="fl-bag-panel" role="dialog" aria-modal="true" aria-label={labels.yourBag} onKeyDown={trap}>
        <header className="fl-bag-head">
          <h2 className="fl-bag-title">{labels.yourBag}</h2>
          <button ref={closeButton} type="button" className="fl-icon-button" aria-label={labels.closeBag} onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        {lines.length === 0 ? (
          <div className="fl-bag-empty">
            <p>{labels.bagEmpty}</p>
            <button type="button" className="fl-text-button" onClick={onClose}>
              {labels.backToRoom}
            </button>
          </div>
        ) : (
          <ul className="fl-bag-lines">
            {lines.map((line) => (
              <li key={line.key} className="fl-bag-line">
                <span className="fl-bag-thumb" style={{ "--fl-line-led": line.ledColor } as React.CSSProperties}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={line.image} alt="" loading="lazy" decoding="async" />
                </span>
                <div className="fl-bag-info">
                  <p className="fl-bag-name">{line.name}</p>
                  <p className="fl-bag-size">{line.sizeLabel}</p>
                  <div className="fl-stepper">
                    <button type="button" aria-label={`${labels.decrease}: ${line.name}`} onClick={() => setQty(line.key, line.qty - 1)}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
                        <path d="M5 12h14" />
                      </svg>
                    </button>
                    <span aria-live="polite">{line.qty}</span>
                    <button type="button" aria-label={`${labels.increase}: ${line.name}`} onClick={() => setQty(line.key, line.qty + 1)}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="fl-bag-end">
                  <p className="fl-bag-price">{formatPrice(line.price * line.qty, line.currency)}</p>
                  <button type="button" className="fl-text-button" onClick={() => setQty(line.key, 0)}>
                    {labels.remove}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <footer className="fl-bag-foot">
          {lines.length > 0 ? (
            <>
              <div className="fl-bag-subtotal">
                <span>{labels.subtotal}</span>
                <strong>{formatPrice(subtotal, currency)}</strong>
              </div>
              <button type="button" className="fl-checkout" onClick={onCheckout}>
                {labels.checkout}
              </button>
            </>
          ) : null}
          {labels.demoLine ? <p className="fl-bag-demo">{labels.demoLine}</p> : null}
        </footer>
      </div>
    </div>
  );
}
