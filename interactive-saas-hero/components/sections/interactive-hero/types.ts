export type HeroAccent = "sky" | "violet" | "emerald";
/** "auto" follows a .dark class or data-theme="dark" on any ancestor. */
export type HeroTheme = "dark" | "light" | "auto";

export type Avatar = { src: string; name: string; role?: string };

export type InteractiveHeroProps = {
  badge?: { label: string; href?: string };
  title: string;
  /** Word(s) of the title to highlight with the gradient. Default: the last word. */
  highlight?: string;
  /** May contain {productName}, replaced with demo.productName. */
  description?: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; videoSrc: string };
  socialProof?: {
    avatars: Avatar[];
    rating?: number;
    count?: number;
    /** May contain {count}, replaced with the formatted count. */
    label?: string;
  };
  demo?: {
    productName?: string;
    projectName?: string;
    enableTour?: boolean;
    enableCollaborators?: boolean;
  };
  accent?: HeroAccent;
  theme?: HeroTheme;
  headingAs?: "h1" | "h2";
  className?: string;
};
