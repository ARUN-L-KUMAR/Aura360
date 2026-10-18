export type SkincareBodyPart = 'face' | 'hair' | 'body' | 'oral' | 'general';
export type SkincareRoutineTime = 'morning' | 'evening' | 'both' | 'weekly' | 'optional';
export type SkincareStatus = 'owned' | 'need_to_buy' | 'finished';

export type SkincareProduct = {
  id: string;
  productName: string;
  brand?: string | null;
  category: string;
  bodyPart?: SkincareBodyPart;
  routineTime?: SkincareRoutineTime | null;
  routineOrder?: number | null;
  status?: SkincareStatus;
  rating?: number | null;
  notes?: string | null;
};

/** Products used in a daily routine, in the order the user set (unordered ones last). "Both" counts for each. */
export function routineFor(products: SkincareProduct[], time: 'morning' | 'evening'): SkincareProduct[] {
  return products
    .filter((p) => p.routineTime === time || p.routineTime === 'both')
    .sort((a, b) => (a.routineOrder ?? 99) - (b.routineOrder ?? 99));
}

export type SkincareStats = {
  total: number;
  needToBuy: number;
  finished: number;
  ratedCount: number;
  /** Mean of the ratings that exist (unrated products are left out), or null when nothing is rated. */
  averageRating: number | null;
};

/** Headline numbers for the shelf, derived only from the products. */
export function skincareStats(products: SkincareProduct[]): SkincareStats {
  const ratings = products.map((p) => p.rating).filter((r): r is number => typeof r === 'number' && r > 0);
  return {
    total: products.length,
    needToBuy: products.filter((p) => p.status === 'need_to_buy').length,
    finished: products.filter((p) => p.status === 'finished').length,
    ratedCount: ratings.length,
    averageRating: ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : null,
  };
}
