"use client";

import "@fontsource-variable/archivo/wdth.css";
import { Floodlit } from "../floodlit";
import { varsaShoes } from "@/data/varsa-data";

/** Floodlit as one section of an ordinary page: the page scrolls past it, and a shoe opens over the section only. */
export default function InAPage() {
  return (
    <main style={{ fontFamily: '"Archivo Variable", ui-sans-serif, system-ui, sans-serif' }}>
      <section style={{ maxWidth: 760, margin: "0 auto", padding: "88px 24px 64px" }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: "0.02em", opacity: 0.75 }}>Varsa, autumn</p>
        <h1 style={{ margin: "10px 0 16px", fontSize: "clamp(32px, 5vw, 52px)", lineHeight: 1.05, fontWeight: 650 }}>Ten pairs, chosen for the dark months.</h1>
        <p style={{ margin: 0, fontSize: 17, lineHeight: 1.6, opacity: 0.85 }}>
          Road, trail, court and gym. We keep the range small so each pair gets a proper shelf. Walk up to one below, or keep scrolling for how we pick them.
        </p>
      </section>
      <Floodlit shoes={varsaShoes} theme="auto" eyebrow="On the wall this week" heading="Pick your pair under the lights." labels={{ demoLine: "Demo store. Nothing here is for sale." }} />
      <section style={{ maxWidth: 760, margin: "0 auto", padding: "64px 24px 120px" }}>
        <h2 style={{ margin: "0 0 12px", fontSize: 28, fontWeight: 650 }}>How we pick them</h2>
        <p style={{ margin: 0, fontSize: 17, lineHeight: 1.6, opacity: 0.85 }}>
          Every pair is worn for a month before it reaches the wall. If it does not earn its shelf, it does not get one.
        </p>
      </section>
    </main>
  );
}
