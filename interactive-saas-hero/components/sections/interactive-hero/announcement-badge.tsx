import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

/** The pill above the headline: a rotating highlight runs round its 1px border. */
export function AnnouncementBadge({ label, href }: { label: string; href?: string }) {
  const inner = (
    <>
      <Sparkles aria-hidden className="size-3.5 text-(--ih-accent)" />
      <span>{label}</span>
      <ArrowRight
        aria-hidden
        className="size-3.5 text-(--ih-text-3) transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transition-none"
      />
    </>
  );
  const className =
    "ih-badge group inline-flex items-center gap-2 rounded-full bg-(--ih-glass) px-3.5 py-1.5 text-xs font-medium text-(--ih-text-2) backdrop-blur-md transition-colors duration-300 hover:bg-(--ih-glass-hover) sm:text-sm";
  return href ? (
    <Link
      href={href}
      className={`${className} focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--ih-accent)`}
    >
      {inner}
    </Link>
  ) : (
    <span className={className}>{inner}</span>
  );
}
