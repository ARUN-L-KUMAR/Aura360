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
