/**
 * Which categories a wardrobe really contains. Pure (no React, no app imports), so it runs under plain Node
 * (tests/fashion-categories.test.ts). Items arrive with whatever category their source gave them (a pasted link can
 * bring "Jeans" or "Clothing"), so the screens count what is there instead of assuming a fixed list.
 */

/** The categories the app offers when adding an item, in display order. They are always shown as filters. */
export const KNOWN_CATEGORIES = ['Tops', 'Bottoms', 'Shoes', 'Outerwear', 'Accessories'] as const;

export type CategoryCount = { category: string; count: number };

/**
 * Counts items per category, case-insensitively. Known categories come first in their fixed order (spelled as the app
 * spells them, so their translation is found); any other category follows, most pieces first. Blank categories are
 * skipped. `keepEmptyKnown` keeps the known ones that have no pieces, with a count of 0.
 */
export function categoryCountsOf(items: readonly { category?: string | null }[], keepEmptyKnown = false): CategoryCount[] {
  const found = new Map<string, CategoryCount>();
  for (const item of items) {
    const raw = (item.category ?? '').trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    const entry = found.get(key);
    if (entry) entry.count += 1;
    else found.set(key, { category: raw, count: 1 });
  }

  const known: CategoryCount[] = [];
  for (const name of KNOWN_CATEGORIES) {
    const entry = found.get(name.toLowerCase());
    found.delete(name.toLowerCase());
    if (entry) known.push({ category: name, count: entry.count });
    else if (keepEmptyKnown) known.push({ category: name, count: 0 });
  }
  const others = [...found.values()].sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
  return [...known, ...others];
}
