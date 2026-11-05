"use client";

import "@fontsource-variable/archivo/wdth.css";
import { useEffect, useState } from "react";
import { Floodlit } from "../floodlit";
import type { BagLine } from "../floodlit/types";
import { varsaShoes } from "@/data/varsa-data";
import "./varsa.css";

/** A small drawn rocker: night to day is the room's lights coming up. */
function LightSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="varsa-switch" role="switch" aria-checked={on} aria-label="Room lights" onClick={onToggle}>
      <svg viewBox="0 0 28 40" width="21" height="30" aria-hidden="true">
        <rect x="1" y="1" width="26" height="38" rx="5" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.6" />
        <rect x="7" y={on ? 6 : 19} width="14" height="15" rx="2.5" fill="currentColor" style={{ transition: "y .22s cubic-bezier(.2,.8,.2,1)" }} />
      </svg>
    </button>
  );
}

/** The site's own theme, until the switch is used: a dark page gets the night room, a light one the day. */
function useHostDay(): boolean {
  const [day, setDay] = useState(false);
  useEffect(() => {
    const read = () => setDay(!document.documentElement.classList.contains("dark") && (document.documentElement.classList.contains("light") || !window.matchMedia("(prefers-color-scheme: dark)").matches));
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return day;
}

export default function VarsaStore() {
  const hostDay = useHostDay();
  const [chosen, setChosen] = useState<boolean | null>(null);
  const day = chosen ?? hostDay;
  const [bag, setBag] = useState<BagLine[]>([]);
  const [bagOpen, setBagOpen] = useState(false);
  const count = bag.reduce((n, l) => n + l.qty, 0);

  return (
    <div className="varsa" data-day={day || undefined}>
      <header className="varsa-header">
        <a className="varsa-logo" href="#" aria-label="Varsa, home">
          Varsa
        </a>
        <div className="varsa-actions">
          <LightSwitch on={day} onToggle={() => setChosen(!day)} />
          <button type="button" className="varsa-bag" onClick={() => setBagOpen(true)}>
            Bag
            <span className="varsa-count" aria-label={`${count} in your bag`}>
              {count}
            </span>
          </button>
        </div>
      </header>
      <Floodlit
        shoes={varsaShoes}
        theme={chosen === null ? "auto" : day ? "light" : "dark"}
        syncUrl
        detailTop={72}
        eyebrow="The night session"
        heading={
          <>
            Pick your pair
            <br />
            under the lights.
          </>
        }
        bag={bag}
        onBagChange={setBag}
        bagOpen={bagOpen}
        onBagOpenChange={setBagOpen}
        labels={{ demoLine: "Demo store. Nothing here is for sale." }}
      />
    </div>
  );
}
