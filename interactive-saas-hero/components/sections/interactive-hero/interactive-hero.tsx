import type { CSSProperties } from "react";
import type { InteractiveHeroProps } from "./types";
import { AnnouncementBadge } from "./announcement-badge";
import { Headline } from "./headline";
import { PrimaryCta } from "./primary-cta";
import { VideoCta } from "./demo-video-dialog";
import { SocialProof } from "./social-proof";
import { CursorSpotlight } from "./cursor-spotlight";
import { ProductDemo } from "./product-demo/demo-loader";
import { SectionPause } from "./section-pause";
import "./interactive-hero.css";

/**
 * A cinematic hero for a website builder: badge, headline, text, two calls to action and social proof over
 * an aurora, then a large app window running a small working demo of the product.
 * A Server Component: the copy is in the server HTML; only the interactive pieces are client components.
 */
export function InteractiveHero({
  badge,
  title,
  highlight,
  description,
  primaryCta,
  secondaryCta,
  socialProof,
  demo = {},
  accent = "sky",
  theme = "dark",
  headingAs = "h1",
  className = "",
}: InteractiveHeroProps) {
  const productName = demo.productName ?? "Nebula";
  const projectName = demo.projectName ?? "Aurora";
  const text = description?.replaceAll("{productName}", productName);

  return (
    <section data-ih-theme={theme} data-ih-accent={accent} className={`ih ${className}`}>
      <div aria-hidden className="ih-aurora">
        <span />
        <span />
        <span />
      </div>
      <div aria-hidden className="ih-dots" />
      <CursorSpotlight />
      <SectionPause />
      <div aria-hidden className="ih-grain" />

      <div className="relative mx-auto max-w-6xl px-4 pt-28 text-center sm:px-6 sm:pt-36">
        {badge && <AnnouncementBadge {...badge} />}
        <div className="mt-7">
          <Headline title={title} highlight={highlight} as={headingAs} />
        </div>
        {text && (
          <p
            className="ih-word mx-auto mt-5 max-w-2xl text-base text-pretty text-(--ih-text-2) md:text-lg"
            style={{ "--i": title.split(/\s+/).length } as CSSProperties}
          >
            {text}
          </p>
        )}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <PrimaryCta {...primaryCta} />
          {secondaryCta && <VideoCta {...secondaryCta} />}
        </div>
        {socialProof && <SocialProof {...socialProof} />}
      </div>

      <div className="relative mx-auto mt-16 max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28">
        <div aria-hidden className="ih-horizon top-0" />
        <ProductDemo
          productName={productName}
          projectName={projectName}
          enableTour={demo.enableTour}
          enableCollaborators={demo.enableCollaborators}
        />
      </div>
    </section>
  );
}
