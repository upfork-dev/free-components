"use client";

import { ShoeWall } from "@/components/shoe-wall";
import { smallShop } from "@/data/shoes";
import { useDemoFonts } from "./demo-fonts";

/** A small shop: seven running shoes, one category, nothing to filter. */
export function SmallShop() {
  const fonts = useDemoFonts();
  return (
    <main style={fonts} className="min-h-screen bg-[#ecebe6] dark:bg-[#121315]">
      <ShoeWall shoes={smallShop} defaultDensity="l" headingLevel={1} filters={false} labels={{ eyebrow: "Running, and nothing else", heading: "Seven pairs." }} />
    </main>
  );
}
