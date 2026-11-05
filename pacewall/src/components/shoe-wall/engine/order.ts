import type { Shoe, ShoeSort } from "../types";

export type Arrangement = {
  sort: ShoeSort;
  category: string | null;
  size: string | null;
  /** A shuffled order of ids, when the wall is shuffled. */
  shuffled: string[] | null;
};

const byNewest = (a: Shoe, b: Shoe) => (b.addedAt ?? "").localeCompare(a.addedAt ?? "");

/** From dark to light through the hues. Close lightness values read together, so hue decides inside a band. */
function byColour(a: Shoe, b: Shoe): number {
  const la = Math.round((a.lightness ?? 0.5) * 6);
  const lb = Math.round((b.lightness ?? 0.5) * 6);
  if (la !== lb) return la - lb;
  return (a.hue ?? 0) - (b.hue ?? 0);
}

export function sorted(shoes: Shoe[], sort: ShoeSort): Shoe[] {
  const list = [...shoes];
  if (sort === "newest") list.sort(byNewest);
  if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
  if (sort === "colour") list.sort(byColour);
  return list;
}

export function hasSize(shoe: Shoe, size: string): boolean {
  return shoe.sizes.some((s) => s.eu === size && s.stock > 0);
}

export function visibleShoes(shoes: Shoe[], a: Arrangement): Shoe[] {
  let list = sorted(shoes, a.sort);
  if (a.category) list = list.filter((s) => s.category === a.category);
  if (a.size) list = list.filter((s) => hasSize(s, a.size as string));
  if (a.shuffled) {
    const place = new Map(a.shuffled.map((id, i) => [id, i]));
    list = [...list].sort((x, y) => (place.get(x.id) ?? 1e9) - (place.get(y.id) ?? 1e9));
  }
  return list;
}

/** A small seedable generator, so a test can ask for the same shuffle twice. */
export function generator(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A derangement: no shoe stays where it was, and two of one category do not stand together if it can be helped. */
export function shuffle(list: Shoe[], random: () => number): string[] {
  const ids = list.map((s) => s.id);
  if (ids.length < 2) return ids;
  const category = new Map(list.map((s) => [s.id, s.category]));
  let best = ids;
  let bestScore = Infinity;
  for (let attempt = 0; attempt < 60; attempt++) {
    const next = [...ids];
    // Sattolo's algorithm always gives a single cycle, so no element keeps its place.
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(random() * i);
      [next[i], next[j]] = [next[j], next[i]];
    }
    let score = 0;
    for (let i = 1; i < next.length; i++) {
      if (category.get(next[i]) === category.get(next[i - 1])) score++;
    }
    if (score < bestScore) {
      best = next;
      bestScore = score;
      if (score === 0) break;
    }
  }
  return best;
}
