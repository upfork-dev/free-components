"use client";

import { ShoeWall } from "@/components/shoe-wall";
import { shoes } from "@/data/shoes";
import { useDemoFonts } from "./demo-fonts";

/** The wall as a guest: one section of an ordinary page, with content above and below it. */
export function GuestPage() {
  const fonts = useDemoFonts();
  return (
    <div style={fonts} className="bg-white text-[#15161a] dark:bg-[#0c0d0f] dark:text-[#f1f1ec]">
      <article className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="text-4xl font-bold tracking-tight">Choosing a first pair</h1>
        <p className="mt-5 text-lg leading-8">
          Start from where you will wear them. Road shoes want a soft, even sole. Trail shoes want lugs that bite and a bumper over the toes. Court shoes want a flat, wide base, because
          the foot moves sideways as much as forward.
        </p>
        <p className="mt-4 text-lg leading-8">Here is what is on the wall this week. Pick your size once, and only the pairs you can actually buy stay up.</p>
      </article>

      <ShoeWall shoes={shoes.slice(0, 12)} defaultDensity="s" moreHref="#all" totalCount={17} labels={{ eyebrow: "On the wall this week", heading: "Twelve to start from." }} />

      <article className="mx-auto max-w-2xl px-4 py-16">
        <h2 className="text-2xl font-bold tracking-tight">How a shoe should fit</h2>
        <p className="mt-4 text-lg leading-8">
          Leave about a thumb&apos;s width in front of the longest toe. The heel should stay down when you walk, and the widest part of the foot should sit at the widest part of the shoe.
          Try them on late in the day, when your feet are at their largest.
        </p>
      </article>
    </div>
  );
}
