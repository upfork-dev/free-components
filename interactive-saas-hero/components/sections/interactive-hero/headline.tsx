import { Fragment, type CSSProperties, type ElementType } from "react";

/**
 * The headline, word by word (a CSS entrance that starts at once, so the text is in the server HTML and the
 * page's largest paint never waits for JavaScript), with the highlight in a gradient that a light sweeps
 * across every few seconds, and a few speed lines that streak behind it once.
 */
export function Headline({ title, highlight, as: Tag = "h1" }: { title: string; highlight?: string; as?: ElementType }) {
  const words = title.trim().split(/\s+/);
  const lit = (highlight ?? words[words.length - 1]).trim().split(/\s+/);
  const start = findSequence(words, lit);
  const before = start < 0 ? words : words.slice(0, start);
  const after = start < 0 ? [] : words.slice(start + lit.length);
  let i = 0;
  const delay = () => ({ "--i": i++ }) as CSSProperties;

  return (
    <Tag className="mx-auto max-w-4xl text-4xl leading-[1.05] font-semibold tracking-tight text-balance text-(--ih-text) sm:text-5xl md:text-7xl">
      {/* Spaces sit between the word boxes: inside an inline-block a trailing space would collapse. */}
      {before.map((word, k) => (
        <Fragment key={`b${k}`}>
          <span className="ih-word" style={delay()}>
            {word}
          </span>{" "}
        </Fragment>
      ))}
      {start >= 0 && (
        <span className="ih-word relative" style={delay()}>
          <span aria-hidden className="ih-speed top-[38%] w-24 [animation-delay:500ms]" />
          <span aria-hidden className="ih-speed top-[58%] w-16 [animation-delay:620ms]" />
          <span aria-hidden className="ih-speed top-[76%] w-20 [animation-delay:560ms]" />
          <span className="ih-highlight" data-text={lit.join(" ")}>
            {lit.join(" ")}
          </span>
        </span>
      )}
      {after.map((word, k) => (
        <Fragment key={`a${k}`}>
          {" "}
          <span className="ih-word" style={delay()}>
            {word}
          </span>
        </Fragment>
      ))}
    </Tag>
  );
}

function findSequence(words: string[], seq: string[]) {
  const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (let s = 0; s + seq.length <= words.length; s++) {
    if (seq.every((w, k) => norm(words[s + k]) === norm(w))) return s;
  }
  return -1;
}
