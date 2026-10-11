import { Star } from "lucide-react";
import type { InteractiveHeroProps } from "./types";
import { CountUp } from "./count-up";

/** Overlapping avatars (each lifts and names itself on hover or focus), a rating and a team count. */
export function SocialProof({
  avatars,
  rating = 4.9,
  count,
  label = "Trusted by {count}+ teams",
}: NonNullable<InteractiveHeroProps["socialProof"]>) {
  const [beforeCount, afterCount = ""] = label.split("{count}");
  return (
    <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-5">
      <ul className="flex items-center" aria-label="Some of our customers">
        {avatars.slice(0, 5).map((avatar) => (
          <li
            key={avatar.src}
            tabIndex={0}
            aria-label={avatar.role ? `${avatar.name}, ${avatar.role}` : avatar.name}
            className="group relative -ms-2.5 rounded-full first:ms-0 focus-visible:outline-none"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- 36px avatars, next/image adds nothing here */}
            <img
              src={avatar.src}
              alt=""
              width={36}
              height={36}
              loading="lazy"
              decoding="async"
              className="size-9 rounded-full object-cover ring-2 ring-(--ih-ring) transition-transform duration-200 group-hover:-translate-y-1 group-focus-visible:-translate-y-1 group-focus-visible:ring-(--ih-accent) motion-reduce:transition-none"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 translate-y-1 rounded-lg border border-(--ih-glass-line) bg-(--ih-win) px-2.5 py-1.5 text-start text-xs whitespace-nowrap text-(--ih-text) opacity-0 shadow-lg backdrop-blur-md transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
            >
              <span className="block font-medium">{avatar.name}</span>
              {avatar.role && <span className="block text-(--ih-text-3)">{avatar.role}</span>}
            </span>
          </li>
        ))}
        <li className="-ms-2.5 grid size-9 place-items-center rounded-full bg-(--ih-glass) text-[11px] font-semibold text-(--ih-text-2) ring-2 ring-(--ih-ring) backdrop-blur-md">
          +2k
        </li>
      </ul>
      <div className="flex flex-col items-center gap-1 sm:items-start">
        <div className="flex items-center gap-1.5">
          <span className="flex" role="img" aria-label={`Rated ${rating} out of 5`}>
            {[0, 1, 2, 3, 4].map((s) => (
              <Star key={s} aria-hidden className="size-3.5 fill-amber-400 text-amber-400" />
            ))}
          </span>
          <span className="text-sm font-semibold text-(--ih-text)">{rating}/5</span>
        </div>
        {count !== undefined && (
          <p className="text-sm text-(--ih-text-3)">
            {beforeCount}
            <CountUp value={count} />
            {afterCount}
          </p>
        )}
      </div>
    </div>
  );
}
