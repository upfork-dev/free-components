import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  PhotoMarquee,
  type MarqueeDirection,
  type MarqueeImage,
  type MarqueeTheme,
} from "./photo-marquee";

export type CommunityHeroProps = {
  badge?: string;
  title: string;
  description?: string;
  cta?: { label: string; href: string };
  images: MarqueeImage[];
  /** Number of photo rows. Default 3. */
  rows?: number;
  /** Seconds the longest row takes to slide by one copy of its photos; the others keep its speed. Default 60. */
  durationSeconds?: number;
  /** Direction of the first row. Default "left". */
  direction?: MarqueeDirection;
  /** Every other row runs the opposite way. Default true. */
  alternate?: boolean;
  /** One direction per row, repeated if shorter than `rows`. Overrides `direction` and `alternate`. */
  rowDirections?: MarqueeDirection[];
  /** Hovering the photos pauses them. Default false. */
  pauseOnHover?: boolean;
  /** "auto" follows your site's `dark:` variant; "light" and "dark" fix the look. Default "auto". */
  theme?: MarqueeTheme;
  headingAs?: "h1" | "h2";
  className?: string;
};

/* Every color of the section, per theme. "auto" is the light look plus dark: overrides. */
const themes: Record<
  MarqueeTheme,
  { section: string; badge: string; title: string; description: string; cta: string }
> = {
  auto: {
    section: "bg-white dark:bg-black",
    badge: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    title: "text-zinc-950 dark:text-white",
    description: "text-zinc-600 dark:text-zinc-300",
    cta:
      "bg-violet-600 shadow-[0_0_40px_-8px_rgba(124,58,237,0.55)] hover:bg-violet-700 focus-visible:outline-violet-600 " +
      "dark:bg-violet-500 dark:shadow-[0_0_40px_-8px_rgba(139,92,246,0.7)] dark:hover:bg-violet-400 dark:focus-visible:outline-violet-300",
  },
  light: {
    section: "bg-white",
    badge: "border-violet-500/30 bg-violet-500/10 text-violet-700",
    title: "text-zinc-950",
    description: "text-zinc-600",
    cta: "bg-violet-600 shadow-[0_0_40px_-8px_rgba(124,58,237,0.55)] hover:bg-violet-700 focus-visible:outline-violet-600",
  },
  dark: {
    section: "bg-black",
    badge: "border-violet-500/30 bg-violet-500/10 text-violet-300",
    title: "text-white",
    description: "text-zinc-300",
    cta: "bg-violet-500 shadow-[0_0_40px_-8px_rgba(139,92,246,0.7)] hover:bg-violet-400 focus-visible:outline-violet-300",
  },
};

function cx(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/**
 * A centered hero (badge, headline, text, call to action) over an endless wall of community photos
 * whose rows slide in alternating directions. A Server Component: the motion is pure CSS.
 */
export function CommunityHero({
  badge,
  title,
  description,
  cta,
  images,
  rows = 3,
  durationSeconds = 60,
  direction = "left",
  alternate = true,
  rowDirections,
  pauseOnHover = false,
  theme = "auto",
  headingAs: Heading = "h1",
  className,
}: CommunityHeroProps) {
  const t = themes[theme];

  return (
    <section className={cx("relative w-full overflow-hidden py-20 md:py-28", t.section, className)}>
      <div className="mx-auto max-w-4xl px-4 text-center">
        {badge && (
          <span
            className={cx(
              "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium sm:text-sm",
              t.badge,
            )}
          >
            {badge}
          </span>
        )}

        <Heading
          className={cx(
            "text-3xl leading-tight font-light tracking-tight text-balance sm:text-4xl lg:text-5xl",
            badge && "mt-6",
            t.title,
          )}
        >
          {title}
        </Heading>

        {description && (
          <p
            className={cx(
              "mx-auto mt-4 max-w-3xl text-base leading-relaxed text-pretty md:text-lg",
              t.description,
            )}
          >
            {description}
          </p>
        )}

        {cta && (
          <Link
            href={cta.href}
            className={cx(
              "group mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 font-medium text-white",
              "transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
              t.cta,
            )}
          >
            {cta.label}
            <ArrowRight
              aria-hidden
              className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
            />
          </Link>
        )}
      </div>

      <PhotoMarquee
        images={images}
        rows={rows}
        durationSeconds={durationSeconds}
        direction={direction}
        alternate={alternate}
        rowDirections={rowDirections}
        pauseOnHover={pauseOnHover}
        theme={theme}
        className="mt-12 md:mt-16"
      />
    </section>
  );
}
