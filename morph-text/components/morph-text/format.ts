// A number as the pieces MorphNumber animates: each digit keyed by its place (units, tens…, then
// tenths…), so "999" → "1,000" keeps the last three digits and brings in "1,".

export type NumberFormat = Intl.NumberFormatOptions & { locale?: string };

export type Slot = {
  key: string;
  /** What it shows: one character for digits, possibly more for symbols and affixes. */
  text: string;
  digit: number | null;
};

type Part = { type: string; value: string };

const BIDI = /[‎‏؜‪-‮⁦-⁩]/g;

const ZEROS = [0x30, 0x660, 0x6f0, 0x966, 0x9e6, 0xa66, 0xe50, 0xff10];

/** A decimal digit's value in any of the common digit sets, or null. */
export function digitValue(ch: string): number | null {
  const cp = ch.codePointAt(0) ?? 0;
  for (const zero of ZEROS) {
    if (cp >= zero && cp <= zero + 9) return cp - zero;
  }
  return null;
}

/** The ten digits of the set `ch` belongs to ("0123456789", "۰۱۲۳۴۵۶۷۸۹"…). */
export function digitSet(ch: string): string[] {
  const cp = ch.codePointAt(0) ?? 0x30;
  const zero = ZEROS.find((z) => cp >= z && cp <= z + 9) ?? 0x30;
  return Array.from({ length: 10 }, (_, i) => String.fromCodePoint(zero + i));
}

const formatters = new Map<string, Intl.NumberFormat | null>();

function formatter(format: NumberFormat): Intl.NumberFormat | null {
  const key = JSON.stringify(format);
  if (formatters.has(key)) return formatters.get(key) ?? null;
  let made: Intl.NumberFormat | null = null;
  try {
    const { locale, ...options } = format;
    if (typeof Intl !== 'undefined' && Intl.NumberFormat) {
      made = new Intl.NumberFormat(locale, options);
      if (typeof made.formatToParts !== 'function') made = null;
    }
  } catch {
    made = null;
  }
  formatters.set(key, made);
  return made;
}

const SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', JPY: '¥', CHF: 'CHF ', CAD: 'CA$', AUD: 'A$', INR: '₹' };

/** Grouped, fixed decimals, a currency symbol or a percent sign: enough where Intl is missing. */
export function fallbackParts(value: number, format: NumberFormat): Part[] {
  const style = format.style ?? 'decimal';
  const currencyDigits = style === 'currency' ? 2 : 0;
  const minFraction = format.minimumFractionDigits ?? currencyDigits;
  const maxFraction = Math.max(minFraction, format.maximumFractionDigits ?? (style === 'percent' ? 0 : Math.max(3, currencyDigits)));
  let n = style === 'percent' ? value * 100 : value;
  let compact = '';
  if (format.notation === 'compact') {
    const abs = Math.abs(n);
    const [div, letter] = abs >= 1e9 ? [1e9, 'B'] : abs >= 1e6 ? [1e6, 'M'] : abs >= 1e3 ? [1e3, 'K'] : [1, ''];
    n /= div;
    compact = letter;
  }
  const negative = n < 0;
  let fixed = Math.abs(n).toFixed(maxFraction);
  if (maxFraction > minFraction) {
    // Drop trailing zeros down to the minimum.
    const [int, frac = ''] = fixed.split('.');
    let f = frac;
    while (f.length > minFraction && f.endsWith('0')) f = f.slice(0, -1);
    fixed = f ? `${int}.${f}` : int;
  }
  const [int, frac] = fixed.split('.');
  const parts: Part[] = [];
  if (negative) parts.push({ type: 'minusSign', value: '-' });
  if (style === 'currency') parts.push({ type: 'currency', value: SYMBOLS[format.currency ?? 'USD'] ?? `${format.currency} ` });
  const grouping = format.useGrouping !== false;
  for (let i = 0; i < int.length; i++) {
    const left = int.length - i;
    if (grouping && i > 0 && left % 3 === 0) parts.push({ type: 'group', value: ',' });
    parts.push({ type: 'integer', value: int[i] });
  }
  if (frac) {
    parts.push({ type: 'decimal', value: '.' });
    parts.push({ type: 'fraction', value: frac });
  }
  if (compact) parts.push({ type: 'compact', value: compact });
  if (style === 'percent') parts.push({ type: 'percentSign', value: '%' });
  return parts;
}

export function numberParts(value: number, format: NumberFormat): Part[] {
  const made = formatter(format);
  if (made) {
    try {
      return made.formatToParts(value) as Part[];
    } catch {
      // fall through
    }
  }
  return fallbackParts(value, format);
}

/** The slots of `value`, keyed so that the same place keeps the same key from one value to the next. */
export function numberSlots(value: number, format: NumberFormat, prefix?: string, suffix?: string): { slots: Slot[]; text: string } {
  const parts = numberParts(value, format);
  const slots: Slot[] = [];
  if (prefix) slots.push({ key: `pre:${prefix}`, text: prefix, digit: null });

  // Integer digits count their place from the right.
  let integerDigits = 0;
  for (const part of parts) if (part.type === 'integer') integerDigits += Array.from(part.value).length;

  let place = integerDigits;
  let fraction = 0;
  let sawInteger = false;
  const seen = new Map<string, number>();
  for (const raw of parts) {
    // Direction marks (some locales wrap symbols in them) take no room and never animate.
    const part = { type: raw.type, value: raw.value.replace(BIDI, '') };
    if (part.value === '') continue;
    const chars = Array.from(part.value);
    if (part.type === 'integer') {
      sawInteger = true;
      for (const ch of chars) {
        place--;
        slots.push({ key: `i${place}`, text: ch, digit: digitValue(ch) });
      }
    } else if (part.type === 'group') {
      slots.push({ key: `g${place}`, text: part.value, digit: null });
    } else if (part.type === 'decimal') {
      slots.push({ key: 'dec', text: part.value, digit: null });
    } else if (part.type === 'fraction') {
      for (const ch of chars) slots.push({ key: `f${fraction++}`, text: ch, digit: digitValue(ch) });
    } else {
      // Symbols, signs and words: one piece each, keyed by what they are and which side they're on.
      const side = sawInteger ? 'a' : 'b';
      const name = `${part.type}${side}`;
      const n = seen.get(name) ?? 0;
      seen.set(name, n + 1);
      if (part.value.trim() === '') {
        slots.push({ key: `${name}${n}:space`, text: part.value, digit: null });
      } else {
        slots.push({ key: `${name}${n}:${part.value}`, text: part.value, digit: null });
      }
    }
  }
  if (suffix) slots.push({ key: `suf:${suffix}`, text: suffix, digit: null });
  return { slots, text: slots.map((s) => s.text).join('') };
}
