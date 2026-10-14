// Which pieces of the old text are the same pieces in the new one. A longest common subsequence,
// but among the equally long ones it takes the one with the fewest separate runs, then the one
// whose pieces travel least: "letter" → "better" keeps "etter" together, and a repeated letter
// matches the copy nearest to it.

/**
 * Pairs of indices (old, new) that stay, in order. `before` and `after` are where each piece sits
 * (any unit, as long as both use the same one): they break ties between repeated pieces.
 */
export function matchTokens(
  a: readonly string[],
  b: readonly string[],
  before: readonly number[],
  after: readonly number[],
): Array<[number, number]> {
  const n = a.length;
  const m = b.length;
  if (n === 0 || m === 0) return [];

  // Score: matches first, then fewer runs, then less travel. Two states per cell: whether the
  // last step was a match on the diagonal (so the next match continues the run).
  const MATCH = 1_000_000;
  const RUN = 1_000;
  const width = m + 1;
  const free = new Float64Array((n + 1) * width).fill(-Infinity); // last step was not a match
  const run = new Float64Array((n + 1) * width).fill(-Infinity); // last step matched (i-1, j-1)
  // How each cell was reached: 0 skip old, 1 skip new, 2 match from free, 3 match from run.
  const fromFree = new Uint8Array((n + 1) * width);
  const fromRun = new Uint8Array((n + 1) * width);
  free[0] = 0;

  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= m; j++) {
      const k = i * width + j;
      if (i > 0 || j > 0) {
        // Arriving without a match: skip a[i-1] or b[j-1] from either state.
        let best = -Infinity;
        let how = 0;
        if (i > 0) {
          const up = Math.max(free[k - width], run[k - width]);
          if (up > best) {
            best = up;
            how = 0;
          }
        }
        if (j > 0) {
          const left = Math.max(free[k - 1], run[k - 1]);
          if (left > best) {
            best = left;
            how = 1;
          }
        }
        free[k] = best;
        fromFree[k] = how;
      }
      if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
        const d = k - width - 1;
        const travel = Math.min(999, Math.abs(before[i - 1] - after[j - 1]));
        const startRun = free[d] + MATCH - RUN - travel;
        const keepRun = run[d] + MATCH - travel;
        if (keepRun >= startRun) {
          run[k] = keepRun;
          fromRun[k] = 3;
        } else {
          run[k] = startRun;
          fromRun[k] = 2;
        }
      }
    }
  }

  const pairs: Array<[number, number]> = [];
  let i = n;
  let j = m;
  let inRun = run[n * width + m] > free[n * width + m];
  while (i > 0 || j > 0) {
    const k = i * width + j;
    if (inRun) {
      pairs.push([i - 1, j - 1]);
      inRun = fromRun[k] === 3;
      i--;
      j--;
    } else {
      const how = fromFree[k];
      if (how === 0) {
        inRun = run[k - width] > free[k - width];
        i--;
      } else {
        inRun = run[k - 1] > free[k - 1];
        j--;
      }
    }
  }
  return pairs.reverse();
}
