import Image, { type StaticImageData } from "next/image";

/**
 * A photo: a path or URL, or a static import (which also gives it a blurred preview while it loads).
 * For a path or URL you can pass your own `blurDataURL`.
 */
export type MarqueeImage = { src: string | StaticImageData; alt: string; blurDataURL?: string };
export type MarqueeDirection = "left" | "right";
/** "auto" follows your site's `dark:` variant (a `.dark` class or the system setting). */
export type MarqueeTheme = "auto" | "light" | "dark";

export type PhotoMarqueeProps = {
  images: MarqueeImage[];
  /** Number of rows. Default 3. */
  rows?: number;
  /** Seconds the longest row takes to slide by one copy of its photos; the others keep its speed. Default 60. */
  durationSeconds?: number;
  /** Direction of the first row. Default "left". */
  direction?: MarqueeDirection;
  /** Every other row runs the opposite way. Default true. */
  alternate?: boolean;
  /** One direction per row, repeated if shorter than `rows`. Overrides `direction` and `alternate`. */
  rowDirections?: MarqueeDirection[];
  /** Hovering the wall pauses every row. Default false. */
  pauseOnHover?: boolean;
  /** Card colors. Default "auto". */
  theme?: MarqueeTheme;
  className?: string;
};

/** One copy of a row must outrun a 2560px screen: 16 × (160px card + 16px gap) = 2816px. */
const MIN_CARDS_PER_ROW = 16;

const SIZES = "(min-width: 768px) 160px, (min-width: 640px) 144px, 112px";

/* Eased (smoothstep) stops, so neither fade shows a line where it starts. */
const EDGE_FADE =
  "linear-gradient(to right, transparent, rgb(0 0 0 / 0.16) 2.5%, rgb(0 0 0 / 0.5) 5%, rgb(0 0 0 / 0.84) 7.5%, #000 10%, #000 90%, rgb(0 0 0 / 0.84) 92.5%, rgb(0 0 0 / 0.5) 95%, rgb(0 0 0 / 0.16) 97.5%, transparent)";
const BOTTOM_FADE =
  "linear-gradient(to bottom, #000 60%, rgb(0 0 0 / 0.84) 70%, rgb(0 0 0 / 0.5) 80%, rgb(0 0 0 / 0.16) 90%, transparent)";

const cardTheme: Record<MarqueeTheme, string> = {
  auto: "border-zinc-950/10 bg-zinc-950/5 dark:border-white/10 dark:bg-white/5",
  light: "border-zinc-950/10 bg-zinc-950/5",
  dark: "border-white/10 bg-white/5",
};

function cx(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const keyOf = (image: MarqueeImage) => (typeof image.src === "string" ? image.src : image.src.src);

/**
 * Deals the photos out to the rows like cards (photo 1 to row 1, photo 2 to row 2, and so on), so a face
 * is never on two rows at once even as the rows slide past each other. A row then repeats its photos
 * until one copy is wider than the widest screen.
 */
function buildRows(images: MarqueeImage[], rowCount: number): MarqueeImage[][] {
  if (images.length === 0) return [];
  return Array.from({ length: rowCount }, (_, row) => {
    const own = images.filter((_, i) => i % rowCount === row);
    const photos = own.length > 0 ? own : images;
    return Array.from({ length: Math.ceil(MIN_CARDS_PER_ROW / photos.length) }, () => photos).flat();
  });
}

function directionOf(
  row: number,
  direction: MarqueeDirection,
  alternate: boolean,
  rowDirections?: MarqueeDirection[],
): MarqueeDirection {
  if (rowDirections?.length) return rowDirections[row % rowDirections.length];
  if (!alternate || row % 2 === 0) return direction;
  return direction === "left" ? "right" : "left";
}

/**
 * An endless wall of photos in rows, each row sliding on its own (by default every other row the
 * opposite way). Pure CSS: a transform-only animation, no client JavaScript.
 */
export function PhotoMarquee({
  images,
  rows = 3,
  durationSeconds = 60,
  direction = "left",
  alternate = true,
  rowDirections,
  pauseOnHover = false,
  theme = "auto",
  className,
}: PhotoMarqueeProps) {
  const rowList = buildRows(images, Math.max(1, Math.floor(rows)));
  const longest = Math.max(...rowList.map((row) => row.length));

  // Screen readers hear each photo once: repeats and the duplicate copies get an empty alt.
  const described = new Set<string>();
  const altsByRow = rowList.map((row) =>
    row.map((image) => {
      if (described.has(keyOf(image))) return "";
      described.add(keyOf(image));
      return image.alt;
    }),
  );

  return (
    <div
      dir="ltr"
      className={cx("relative w-full overflow-hidden", pauseOnHover && "group", className)}
      style={{ maskImage: EDGE_FADE, WebkitMaskImage: EDGE_FADE }}
    >
      <div
        className="flex flex-col gap-2 md:gap-4"
        style={{ maskImage: BOTTOM_FADE, WebkitMaskImage: BOTTOM_FADE }}
      >
        {rowList.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className={cx(
              "flex w-max animate-marquee will-change-transform motion-reduce:animate-none",
              pauseOnHover && "group-hover:[animation-play-state:paused]",
            )}
            style={{
              animationDuration: `${(durationSeconds * row.length) / longest}s`,
              animationDirection:
                directionOf(rowIndex, direction, alternate, rowDirections) === "right" ? "reverse" : "normal",
            }}
          >
            <RowCopy images={row} alts={altsByRow[rowIndex]} cardClassName={cardTheme[theme]} />
            <RowCopy images={row} cardClassName={cardTheme[theme]} hidden />
          </div>
        ))}
      </div>
    </div>
  );
}

/** One copy of a row. Its right padding equals the gap, so the copy after it starts exactly one gap away. */
function RowCopy({
  images,
  alts,
  cardClassName,
  hidden = false,
}: {
  images: MarqueeImage[];
  alts?: string[];
  cardClassName: string;
  hidden?: boolean;
}) {
  return (
    <div className="flex shrink-0 gap-2 pr-2 md:gap-4 md:pr-4" aria-hidden={hidden || undefined}>
      {images.map((image, i) => {
        const blur = image.blurDataURL ?? (typeof image.src === "string" ? undefined : image.src.blurDataURL);
        return (
          <div
            key={i}
            className={cx(
              "relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-2xl border sm:w-36 md:w-40",
              cardClassName,
            )}
          >
            <Image
              src={image.src}
              alt={hidden ? "" : (alts?.[i] ?? "")}
              width={160}
              height={120}
              sizes={SIZES}
              loading="lazy"
              placeholder={blur ? "blur" : "empty"}
              blurDataURL={blur}
              className="size-full object-cover"
            />
          </div>
        );
      })}
    </div>
  );
}
