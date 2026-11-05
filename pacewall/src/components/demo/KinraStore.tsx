"use client";

import { useEffect, useRef, useState } from "react";
import { BagPeek, ShoeWall, type BagItem, type Shoe, type ShoeSize } from "@/components/shoe-wall";
import { shoes } from "@/data/shoes";
import { useDemoFonts } from "./demo-fonts";

type ThemeChoice = "light" | "system" | "dark";

function Wordmark() {
  // A drawn mark for an invented shop: a K built from a shelf line and two strokes.
  return (
    <svg width="86" height="24" viewBox="0 0 86 24" fill="currentColor" role="img" aria-label="Kinra">
      <path d="M0 2h4.6v9l7.6-9h5.6l-8 9.2L18.4 22h-5.7L6.9 14.2 4.6 16.8V22H0V2Z" />
      <path d="M22 7.4h4.4V22H22V7.4Zm0-5.6h4.4v3.6H22V1.8Z" />
      <path d="M30.6 7.4h4.2v2c1-1.5 2.5-2.4 4.5-2.4 3.2 0 5.1 2.1 5.1 5.5V22H40v-8.5c0-1.7-.8-2.7-2.3-2.7-1.6 0-2.7 1.1-2.7 3V22h-4.4V7.4Z" />
      <path d="M48 7.4h4.2v2.5c.8-1.8 2.2-2.8 4.2-2.8h.6v4.2h-1c-2.4 0-3.6 1.3-3.6 3.8V22H48V7.4Z" />
      <path d="M58.4 18c0-3 2.2-4.6 6.3-5l3-.3v-.5c0-1.4-1-2.1-2.5-2.1-1.5 0-2.4.7-2.6 1.8l-4-.3c.4-2.9 3-4.7 6.7-4.7 4.2 0 6.7 1.9 6.7 5.5V22h-4.1v-2.1c-.9 1.5-2.6 2.4-4.7 2.4-3 0-5-1.7-5-4.3Zm9.3-1.4v-1l-2.4.3c-1.7.2-2.6.8-2.6 1.9 0 1 .8 1.6 2.1 1.6 1.7 0 2.9-1.1 2.9-2.8Z" />
      <rect x="77" y="19" width="9" height="3" />
    </svg>
  );
}

export function KinraStore() {
  const fonts = useDemoFonts();
  const [themeChoice, setThemeChoice] = useState<ThemeChoice | null>(null);
  const bag = useRef<HTMLButtonElement>(null);
  const guide = useRef<HTMLDialogElement>(null);
  const [items, setItems] = useState<BagItem[]>([]);
  const [bagOpen, setBagOpen] = useState(false);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  const addToBag = (shoe: Shoe, size: ShoeSize) =>
    new Promise<void>((resolve) => {
      // A short wait, as a real cart would take.
      window.setTimeout(() => {
        setItems((list) => {
          const key = `${shoe.id}-${size.eu}`;
          const found = list.find((i) => i.key === key);
          if (found) return list.map((i) => (i.key === key ? { ...i, quantity: i.quantity + 1 } : i));
          return [
            ...list,
            { key, name: shoe.name, size: `EU ${size.eu}`, quantity: 1, price: shoe.price, currency: shoe.currency, image: shoe.photo.src, alt: "" },
          ];
        });
        resolve();
      }, 450);
    });

  useEffect(() => {
    const root = document.documentElement;
    // A page that frames this demo sets the theme itself, until someone uses the switch here.
    if (themeChoice === null && window.parent !== window) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = themeChoice === "dark" || (themeChoice !== "light" && media.matches);
      root.classList.toggle("dark", dark);
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [themeChoice]);

  return (
    <div style={fonts} className="min-h-screen bg-[#ecebe6] text-[#15161a] dark:bg-[#121315] dark:text-[#f1f1ec]">
      <header className="sticky top-0 z-40 flex h-16 items-center gap-6 border-b border-[#d5d5cf] bg-[#ecebe6] px-4 dark:border-[#2a2c2f] dark:bg-[#121315] md:px-8">
        <a href="#" aria-label="Kinra home" className="shrink-0">
          <Wordmark />
        </a>
        <nav className="hidden items-center gap-5 text-sm md:flex" aria-label="Main">
          {["New", "Running", "Training", "Court", "Trail"].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} className="underline-offset-4 hover:underline">
              {item}
            </a>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-3">
          <input
            type="search"
            placeholder="Search"
            aria-label="Search"
            className="hidden h-9 w-44 rounded-sm border border-[#b9bab4] bg-transparent px-3 text-sm placeholder:text-[#5e605b] dark:border-[#44474b] dark:placeholder:text-[#a4a69f] lg:block"
          />
          <a href="#account" aria-label="Account" className="flex size-10 items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <circle cx="10" cy="6.5" r="3.5" />
              <path d="M3 18c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
            </svg>
          </a>
          <button
            ref={bag}
            type="button"
            aria-label={`Bag, ${count} ${count === 1 ? "pair" : "pairs"}`}
            className="relative flex size-10 cursor-pointer items-center justify-center"
            onClick={() => setBagOpen(true)}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <path d="M4 7h12l1 11H3L4 7Z" />
              <path d="M7 9V5.5a3 3 0 0 1 6 0V9" />
            </svg>
            {count > 0 ? (
              <span className="absolute -end-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#15161a] px-1 text-xs font-semibold tabular-nums text-[#ecebe6] dark:bg-[#f1f1ec] dark:text-[#121315]">
                {count}
              </span>
            ) : null}
          </button>
        </div>
      </header>

      <main>
        <ShoeWall
          shoes={shoes}
          headingLevel={1}
          stickyTop={64}
          detailTop={64}
          moreHref="#all"
          labels={{ eyebrow: "The autumn drop", heading: "Take one off the wall." }}
          bagAnchor={() => bag.current}
          syncUrl
          sound
          onAddToBag={addToBag}
          onViewBag={() => setBagOpen(true)}
          onSizeGuide={() => guide.current?.showModal()}
        />
        <dialog
          ref={guide}
          aria-label="Size guide"
          onKeyDown={(e) => e.stopPropagation()}
          className="m-auto w-[min(360px,calc(100vw-32px))] rounded-sm bg-[#ecebe6] p-6 text-[#15161a] backdrop:bg-black/50 dark:bg-[#121315] dark:text-[#f1f1ec]"
        >
          <h2 className="text-lg font-bold">Size guide</h2>
          <p className="mt-2 text-sm">Measure your foot from heel to longest toe. These are rough lengths, and a demo shop&apos;s.</p>
          <table className="mt-4 w-full text-left text-sm tabular-nums">
            <thead>
              <tr>
                <th className="py-1 font-semibold">EU</th>
                <th className="py-1 font-semibold">Foot length</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["38", "24 cm"],
                ["40", "25 cm"],
                ["42", "26.5 cm"],
                ["44", "28 cm"],
                ["46", "29.5 cm"],
              ].map(([eu, cm]) => (
                <tr key={eu}>
                  <td className="py-1">{eu}</td>
                  <td className="py-1">{cm}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="mt-4 h-11 w-full cursor-pointer rounded-sm border border-current font-semibold" onClick={() => guide.current?.close()}>
            Close
          </button>
        </dialog>
        <BagPeek
          open={bagOpen}
          items={items}
          onClose={() => setBagOpen(false)}
          onRemove={(key) => setItems((list) => list.filter((i) => i.key !== key))}
          onQuantity={(key, quantity) => setItems((list) => list.map((i) => (i.key === key ? { ...i, quantity } : i)))}
          onCheckout={() => setBagOpen(false)}
        />
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-[#d5d5cf] px-4 py-8 text-sm dark:border-[#2a2c2f] md:px-8">
        <span>Kinra is a demo shop. Nothing here is for sale.</span>
        <div role="group" aria-label="Theme" className="flex items-center gap-1">
          {(["light", "system", "dark"] as ThemeChoice[]).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={(themeChoice ?? "system") === t}
              onClick={() => setThemeChoice(t)}
              className="h-10 rounded-sm px-3 capitalize aria-pressed:bg-[#15161a] aria-pressed:text-[#ecebe6] dark:aria-pressed:bg-[#f1f1ec] dark:aria-pressed:text-[#121315]"
            >
              {t}
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
}
