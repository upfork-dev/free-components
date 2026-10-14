// Turning "this was here, that is there" into a choreography: which pieces stay and move, which
// leave, which arrive, and when each one starts, so that no piece is ever drawn over another.

import type { WithSpringConfig } from 'react-native-reanimated';

import { clearTime, reachTime, springCurve, type Span } from './timeline';

export type Phase = 'enter' | 'stay' | 'exit';

/** One piece on screen. `x` is its left edge, measured from the anchor (see `anchor`). */
export type Piece = {
  id: number;
  token: string;
  /** Matching key (MorphNumber keys digits by their place; MorphText uses the token). */
  key: string;
  x: number;
  w: number;
  /** 0 = measured from the left edge, 0.5 = from the centre, 1 = from the right edge. */
  anchor: number;
  phase: Phase;
  /** ms before it starts moving (stay) or appearing (enter). */
  delay: number;
  /** +1: arrives from below and leaves upwards; -1: the other way (numbers going down). */
  rise: number;
  /** Bumped whenever this piece gets new orders. */
  plan: number;
  /** For leaving pieces: when they started to leave (performance.now()). */
  leftAt?: number;
  /** A plain fade with no travel (reduced motion, or a change of font). */
  fadeOnly?: boolean;
  /** For kept digits: the digit it showed before (MorphNumber). */
  from?: string;
};

export type Layout = {
  ids: number[];
  keys: string[];
  tokens: string[];
  xs: number[];
  ws: number[];
  anchor: number;
};

export type PlanOptions = {
  spring: WithSpringConfig;
  /** How long leaving takes, ms. */
  exitDuration: number;
  /** ms between two arrivals. */
  stagger: number;
  /** All arrivals spread over at most this long, ms. */
  maxStagger: number;
  rise: number;
  nextId: () => number;
  /** Skip a piece in the plan (spaces take room but draw nothing). */
  invisible?: (token: string) => boolean;
  plan: number;
};

export type Planned = {
  pieces: Piece[];
  layout: Layout;
  /** When the moving pieces (and the width) start, ms. */
  moveDelay: number;
};

const LONGEST_WAIT = 420;

/**
 * The next choreography. `pairs` are (old index, new index) of pieces that stay. `ghosts` are pieces
 * still leaving from an earlier change: they keep going, and arrivals wait for them too.
 */
export function planMorph(
  prev: Layout,
  next: Omit<Layout, 'ids'>,
  pairs: ReadonlyArray<readonly [number, number]>,
  ghosts: readonly Piece[],
  options: PlanOptions,
): Planned {
  const { exitDuration, stagger, maxStagger, rise, plan } = options;
  const curve = springCurve(options.spring);
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const invisible = options.invisible ?? (() => false);

  const keptFrom = new Map<number, number>(); // new index → old index
  const keptOld = new Set<number>();
  for (const [i, j] of pairs) {
    keptFrom.set(j, i);
    keptOld.add(i);
  }

  // A piece's place in the new layout's frame. Old places are re-expressed against the new anchor
  // when the anchor moved (a change of direction): rare, and only matters for the timing below.
  const sameAnchor = prev.anchor === next.anchor;

  const leaving: Piece[] = [];
  for (let i = 0; i < prev.ids.length; i++) {
    if (keptOld.has(i) || invisible(prev.tokens[i])) continue;
    leaving.push({
      id: prev.ids[i],
      token: prev.tokens[i],
      key: prev.keys[i],
      x: prev.xs[i],
      w: prev.ws[i],
      anchor: prev.anchor,
      phase: 'exit',
      delay: 0,
      rise,
      plan,
      leftAt: now,
    });
  }

  // Spots that are still taken by something leaving, and until when (ms from now): by then it is
  // at a tenth of its opacity and shrunk to three quarters.
  const taken: Array<Span & { until: number }> = [];
  const clearAfter = exitDuration * 0.55;
  if (sameAnchor) {
    for (const piece of leaving) {
      // It shrinks to 70% around its centre while it fades: a little less room than it had.
      taken.push({ x: piece.x + piece.w * 0.1, w: piece.w * 0.8, until: clearAfter });
    }
    for (const ghost of ghosts) {
      if (ghost.anchor !== next.anchor) continue;
      const left = clearAfter - (now - (ghost.leftAt ?? now));
      if (left > 0) taken.push({ x: ghost.x + ghost.w * 0.1, w: ghost.w * 0.8, until: left });
    }
  }

  // Moving pieces wait (all together, so they keep their spacing) until what they would run into
  // has nearly gone.
  let moveDelay = 0;
  const moves: Array<{ j: number; from: Span; to: Span }> = [];
  for (let j = 0; j < next.tokens.length; j++) {
    const i = keptFrom.get(j);
    if (i === undefined) continue;
    const from = { x: prev.xs[i], w: prev.ws[i] };
    const to = { x: next.xs[j], w: next.ws[j] };
    if (Math.abs(from.x - to.x) < 0.5) continue;
    moves.push({ j, from, to });
    if (invisible(next.tokens[j])) continue;
    for (const spot of taken) {
      // A quarter of the way into a fading piece is fine: it's nearly gone by then.
      const reach = reachTime(curve, from, to, spot, 0.25);
      if (reach < spot.until) moveDelay = Math.max(moveDelay, spot.until - reach);
    }
  }
  moveDelay = Math.min(moveDelay, exitDuration * 0.75);

  const arriving: number[] = [];
  for (let j = 0; j < next.tokens.length; j++) {
    if (!keptFrom.has(j) && !invisible(next.tokens[j])) arriving.push(j);
  }
  const step = arriving.length > 1 ? Math.min(stagger, maxStagger / (arriving.length - 1)) : 0;
  const base = leaving.length > 0 ? exitDuration * 0.5 : 0;

  const ids: number[] = [];
  const pieces: Piece[] = [];
  let rank = 0;
  for (let j = 0; j < next.tokens.length; j++) {
    const i = keptFrom.get(j);
    const id = i === undefined ? options.nextId() : prev.ids[i];
    ids.push(id);
    if (invisible(next.tokens[j])) continue;
    if (i !== undefined) {
      pieces.push({
        id,
        token: next.tokens[j],
        key: next.keys[j],
        x: next.xs[j],
        w: next.ws[j],
        anchor: next.anchor,
        phase: 'stay',
        delay: moveDelay,
        rise,
        plan,
        from: prev.tokens[i],
      });
      continue;
    }
    // An arrival waits for its spot: for anything leaving it, and for every moving piece that
    // passes over it.
    const spot = { x: next.xs[j], w: next.ws[j] };
    let clear = 0;
    for (const t of taken) {
      if (t.x < spot.x + spot.w - 0.5 && spot.x < t.x + t.w - 0.5) clear = Math.max(clear, t.until);
    }
    for (const move of moves) {
      if (invisible(next.tokens[move.j])) continue;
      // An arrival starts faint and a few pixels low: it may begin once a passing piece covers
      // less than 40% of its spot.
      const passes = clearTime(curve, move.from, move.to, spot, 0.4);
      if (passes > 0) clear = Math.max(clear, moveDelay + passes);
    }
    const delay = Math.min(LONGEST_WAIT, Math.max(base + step * rank, clear + step * 0.5 * rank));
    rank++;
    pieces.push({
      id,
      token: next.tokens[j],
      key: next.keys[j],
      x: next.xs[j],
      w: next.ws[j],
      anchor: next.anchor,
      phase: 'enter',
      delay,
      rise,
      plan,
    });
  }

  const stillLeaving = ghosts.filter((g) => now - (g.leftAt ?? now) < exitDuration * 2);
  return {
    pieces: [...stillLeaving, ...leaving, ...pieces],
    layout: { ...next, ids },
    moveDelay,
  };
}

/** Everything leaves and arrives at once, fading in place (reduced motion, a change of font). */
export function planCrossfade(
  prev: Layout,
  next: Omit<Layout, 'ids'>,
  ghosts: readonly Piece[],
  options: Pick<PlanOptions, 'nextId' | 'invisible' | 'plan'>,
): Planned {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const invisible = options.invisible ?? (() => false);
  const pieces: Piece[] = [...ghosts];
  for (let i = 0; i < prev.ids.length; i++) {
    if (invisible(prev.tokens[i])) continue;
    pieces.push({
      id: prev.ids[i],
      token: prev.tokens[i],
      key: prev.keys[i],
      x: prev.xs[i],
      w: prev.ws[i],
      anchor: prev.anchor,
      phase: 'exit',
      delay: 0,
      rise: 0,
      plan: options.plan,
      leftAt: now,
      fadeOnly: true,
    });
  }
  const ids: number[] = [];
  for (let j = 0; j < next.tokens.length; j++) {
    const id = options.nextId();
    ids.push(id);
    if (invisible(next.tokens[j])) continue;
    pieces.push({
      id,
      token: next.tokens[j],
      key: next.keys[j],
      x: next.xs[j],
      w: next.ws[j],
      anchor: next.anchor,
      phase: 'enter',
      delay: 0,
      rise: 0,
      plan: options.plan,
      fadeOnly: true,
    });
  }
  return { pieces, layout: { ...next, ids }, moveDelay: 0 };
}

/** The first layout: everything simply there. */
export function planStill(next: Omit<Layout, 'ids'>, options: Pick<PlanOptions, 'nextId' | 'invisible' | 'plan'>): Planned {
  const invisible = options.invisible ?? (() => false);
  const ids: number[] = [];
  const pieces: Piece[] = [];
  for (let j = 0; j < next.tokens.length; j++) {
    const id = options.nextId();
    ids.push(id);
    if (invisible(next.tokens[j])) continue;
    pieces.push({
      id,
      token: next.tokens[j],
      key: next.keys[j],
      x: next.xs[j],
      w: next.ws[j],
      anchor: next.anchor,
      phase: 'stay',
      delay: 0,
      rise: 1,
      plan: options.plan,
    });
  }
  return { pieces, layout: { ...next, ids }, moveDelay: 0 };
}

/** Left edges of `widths` laid out in reading order, measured from the anchor. */
export function placeTokens(
  widths: readonly number[],
  direction: 'ltr' | 'rtl',
  anchor: number,
): { xs: number[]; total: number } {
  const total = widths.reduce((sum, w) => sum + w, 0);
  const xs: number[] = [];
  let run = 0;
  for (const w of widths) {
    const left = direction === 'ltr' ? run : total - run - w;
    xs.push(left - anchor * total);
    run += w;
  }
  return { xs, total };
}
