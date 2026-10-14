// Splitting text into the pieces that move: graphemes (what a reader calls one character) or
// words. Plain functions, run on the JS thread when the text changes.

export type Granularity = 'auto' | 'grapheme' | 'word';

/** Above this many graphemes, `auto` animates words: fewer pieces to measure and move. */
export const GRAPHEME_LIMIT = 60;

type Segmenter = { segment(text: string): Iterable<{ segment: string }> };
type SegmenterCtor = new (locale?: string, options?: { granularity: 'grapheme' }) => Segmenter;

let graphemeSegmenter: Segmenter | null | undefined;

function nativeSegmenter(): Segmenter | null {
  if (graphemeSegmenter === undefined) {
    const Ctor = (globalThis as { Intl?: { Segmenter?: SegmenterCtor } }).Intl?.Segmenter;
    try {
      graphemeSegmenter = Ctor ? new Ctor(undefined, { granularity: 'grapheme' }) : null;
    } catch {
      graphemeSegmenter = null;
    }
  }
  return graphemeSegmenter;
}

// Code points that never start a grapheme of their own: they attach to the one before.
function isExtend(cp: number): boolean {
  return (
    (cp >= 0x0300 && cp <= 0x036f) || // combining diacritics
    (cp >= 0x0483 && cp <= 0x0489) ||
    (cp >= 0x0591 && cp <= 0x05bd) || // Hebrew points
    (cp >= 0x0610 && cp <= 0x061a) ||
    (cp >= 0x064b && cp <= 0x065f) || // Arabic harakat
    cp === 0x0670 ||
    (cp >= 0x06d6 && cp <= 0x06ed) ||
    (cp >= 0x0900 && cp <= 0x0903) || // Indic signs (and the rest of their marks below)
    (cp >= 0x093a && cp <= 0x094f) ||
    (cp >= 0x0951 && cp <= 0x0957) ||
    (cp >= 0x0e31 && cp <= 0x0e3a && cp !== 0x0e32 && cp !== 0x0e33) || // Thai vowels above and below
    (cp >= 0x0e47 && cp <= 0x0e4e) ||
    (cp >= 0x1ab0 && cp <= 0x1aff) ||
    (cp >= 0x1dc0 && cp <= 0x1dff) ||
    (cp >= 0x20d0 && cp <= 0x20ff) || // combining marks for symbols, keycap
    (cp >= 0x302a && cp <= 0x302f) ||
    (cp >= 0x3099 && cp <= 0x309a) || // kana voicing
    (cp >= 0xfe00 && cp <= 0xfe0f) || // variation selectors
    (cp >= 0xfe20 && cp <= 0xfe2f) ||
    (cp >= 0x1f3fb && cp <= 0x1f3ff) || // skin tones
    (cp >= 0xe0020 && cp <= 0xe007f) || // emoji tag sequences
    (cp >= 0xe0100 && cp <= 0xe01ef) ||
    cp === 0x200c // zero-width non-joiner stays with what it follows
  );
}

const isRegionalIndicator = (cp: number) => cp >= 0x1f1e6 && cp <= 0x1f1ff;
const ZWJ = 0x200d;

/** Graphemes without Intl.Segmenter: surrogate pairs, marks, emoji sequences and flags kept whole. */
export function splitGraphemesFallback(text: string): string[] {
  const out: string[] = [];
  const points = Array.from(text); // code points
  let i = 0;
  while (i < points.length) {
    let cluster = points[i];
    const first = points[i].codePointAt(0)!;
    i++;
    // A flag is two regional indicators.
    if (isRegionalIndicator(first) && i < points.length && isRegionalIndicator(points[i].codePointAt(0)!)) {
      cluster += points[i];
      i++;
    }
    // CR LF is one.
    if (first === 0x0d && points[i] === '\n') {
      cluster += points[i];
      i++;
    }
    while (i < points.length) {
      const cp = points[i].codePointAt(0)!;
      if (isExtend(cp)) {
        cluster += points[i];
        i++;
      } else if (cp === ZWJ) {
        // A joiner glues the next code point on (family and profession emoji).
        cluster += points[i];
        i++;
        if (i < points.length) {
          cluster += points[i];
          i++;
        }
      } else {
        break;
      }
    }
    out.push(cluster);
  }
  return out;
}

export function splitGraphemes(text: string): string[] {
  const segmenter = nativeSegmenter();
  if (segmenter) return Array.from(segmenter.segment(text), (s) => s.segment);
  return splitGraphemesFallback(text);
}

/** Words and the runs of spaces between them, in reading order. */
export function splitWords(text: string): string[] {
  return text.match(/\s+|[^\s]+/g) ?? [];
}

// Scripts whose letters join or form conjuncts: animating them letter by letter breaks the shapes.
const JOINED =
  /[؀-ۿ܀-ݏݐ-ݿ߀-߿ࡠ-ࣿऀ-෿ༀ-࿿က-႟ក-៿᠀-᢯ꡀ-꡿ﭐ-﷿ﹰ-﻿]/;

export function hasJoinedScript(text: string): boolean {
  return JOINED.test(text);
}

const RTL = /[֐-ࣿיִ-﷿ﹰ-﻿]/;
const LTR = /[A-Za-zÀ-ʯͰ-ϿЀ-ԯऀ-෿฀-๿ᄀ-ᇿ぀-ヿ㐀-鿿가-힯]/;

/** The text's own direction: that of its first strong letter (left to right when it has none). */
export function textDirection(text: string): 'ltr' | 'rtl' {
  for (const ch of text) {
    if (RTL.test(ch)) return 'rtl';
    if (LTR.test(ch)) return 'ltr';
  }
  return 'ltr';
}

/** The pieces `text` animates in, and which kind they are. */
export function tokenize(text: string, granularity: Granularity): { tokens: string[]; unit: 'grapheme' | 'word' } {
  if (granularity === 'word') return { tokens: splitWords(text), unit: 'word' };
  if (granularity === 'grapheme') return { tokens: splitGraphemes(text), unit: 'grapheme' };
  if (hasJoinedScript(text)) return { tokens: splitWords(text), unit: 'word' };
  const graphemes = splitGraphemes(text);
  if (graphemes.length > GRAPHEME_LIMIT) return { tokens: splitWords(text), unit: 'word' };
  return { tokens: graphemes, unit: 'grapheme' };
}

export const isSpace = (token: string) => /^\s+$/.test(token);
