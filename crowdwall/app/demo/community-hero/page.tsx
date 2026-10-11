import type { Metadata } from "next";
import { CommunityHero } from "@/components/sections/community-hero/community-hero";
import { communityHero } from "@/components/sections/community-hero/data";
import { ThemeSwitch } from "@/components/demo/theme-switch";

export const metadata: Metadata = {
  title: "Community hero – Crowdwall",
};

export default function CommunityHeroDemo() {
  return (
    <main>
      <ThemeSwitch />
      <CommunityHero {...communityHero} />
    </main>
  );
}
