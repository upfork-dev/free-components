import type { Metadata } from "next";
import { InteractiveHero } from "@/components/sections/interactive-hero/interactive-hero";
import { interactiveHero } from "@/components/sections/interactive-hero/data";
import { ThemeSwitch } from "@/components/demo/theme-switch";

export const metadata: Metadata = {
  title: "Interactive SaaS Hero – demo",
};

export default function InteractiveHeroDemo() {
  return (
    <main>
      <ThemeSwitch />
      <InteractiveHero {...interactiveHero} />
    </main>
  );
}
