import type { Metadata } from "next";
import { BeamDemo } from "@/components/demo/beam-demo";
import { ThemeSwitch } from "@/components/demo/theme-switch";

export const metadata: Metadata = {
  title: "Border Beam Button – demo",
};

export default function BeamButtonDemo() {
  return (
    <main id="top" className="pt-20 sm:pt-24">
      <ThemeSwitch />
      <BeamDemo />
    </main>
  );
}
