/**
 * The figures behind the Fashion card on Home: what the wardrobe is worth, how many pieces and wears it holds, how many
 * pieces wait for a wash and which pieces are worn most. Pure (no React, no app imports), so it runs under plain Node
 * (tests/home-fashion-widget.test.ts). Only pieces whose status is "wardrobe" count: a wishlist or sold item is not
 * something you own. A missing or odd number (null, NaN, a negative) reads as 0.
 */

/** The fields of a fashion item this file reads, so any item shape that has them fits. */
export type WardrobePiece = {
  name?: string | null;
  status: string;
  price?: number | string | null;
  wearCount?: number | null;
  condition?: string | null;
};

export type WardrobeStats<T extends WardrobePiece> = {
  /** How many pieces are in the wardrobe. */
  pieces: number;
  /** Sum of their prices. */
  value: number;
  /** Sum of their wear counts. */
  wears: number;
  /** Pieces whose condition is "needs_wash". */
  needsWash: number;
  /** The most worn pieces (worn at least once), most first; ties by name. */
  mostWorn: T[];
};

/** A usable amount: finite and above zero, else 0. Prices can arrive as text. */
function amount(value: unknown): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Wardrobe figures from every item the person has, and the `top` most worn pieces (3 unless told otherwise). */
export function wardrobeStats<T extends WardrobePiece>(items: readonly T[], top = 3): WardrobeStats<T> {
  const owned = items.filter((item) => item.status === 'wardrobe');

  const worn = owned
    .map((item, order) => ({ item, order, wears: amount(item.wearCount) }))
    .filter((entry) => entry.wears > 0)
    .sort((a, b) => b.wears - a.wears || (a.item.name ?? '').localeCompare(b.item.name ?? '') || a.order - b.order);

  return {
    pieces: owned.length,
    value: owned.reduce((sum, item) => sum + amount(item.price), 0),
    wears: owned.reduce((sum, item) => sum + amount(item.wearCount), 0),
    needsWash: owned.filter((item) => item.condition === 'needs_wash').length,
    mostWorn: worn.slice(0, Math.max(0, top)).map((entry) => entry.item),
  };
}
