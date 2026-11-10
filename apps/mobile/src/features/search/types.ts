import type { IconName, ModuleKey } from '@/features/modules';

/** What a result belongs to. One group per kind of record, so "Budgets" and "Transactions" filter separately. */
export type SearchGroup =
  | 'notes'
  | 'saved'
  | 'transactions'
  | 'budgets'
  | 'goals'
  | 'wardrobe'
  | 'wishlist'
  | 'outfits'
  | 'meals'
  | 'fitness'
  | 'products'
  | 'timeLogs';

/** Display order of the groups in the results list. */
export const SEARCH_GROUPS: readonly SearchGroup[] = [
  'notes',
  'saved',
  'transactions',
  'budgets',
  'goals',
  'wardrobe',
  'wishlist',
  'outfits',
  'meals',
  'fitness',
  'products',
  'timeLogs',
];

/** Module whose accent colour a group uses. */
export const GROUP_MODULE: Record<SearchGroup, ModuleKey> = {
  notes: 'notes',
  saved: 'saved',
  transactions: 'finance',
  budgets: 'finance',
  goals: 'finance',
  wardrobe: 'fashion',
  wishlist: 'fashion',
  outfits: 'fashion',
  meals: 'food',
  fitness: 'fitness',
  products: 'skincare',
  timeLogs: 'time',
};

export const GROUP_ICON: Record<SearchGroup, IconName> = {
  notes: 'document-text-outline',
  saved: 'bookmark-outline',
  transactions: 'swap-horizontal-outline',
  budgets: 'pie-chart-outline',
  goals: 'flag-outline',
  wardrobe: 'shirt-outline',
  wishlist: 'heart-outline',
  outfits: 'layers-outline',
  meals: 'restaurant-outline',
  fitness: 'barbell-outline',
  products: 'sparkles-outline',
  timeLogs: 'time-outline',
};

/** The same shape `router.push` takes: a path and string params (records travel as JSON, like the sections do). */
export type SearchRoute = { pathname: string; params?: Record<string, string> };

/** One searchable record, flattened from a section's data. */
export type SearchEntry = {
  /** Unique across groups. */
  key: string;
  group: SearchGroup;
  title: string;
  /** Secondary line, also searched. */
  subtitle: string | null;
  /** Extra searchable text that is not shown unless it is what matched (tags, notes, urls...). */
  extras: string[];
  /** Short right-aligned value (amount, date, duration). */
  meta: string | null;
  route: SearchRoute;
};

export type SearchHit = {
  entry: SearchEntry;
  score: number;
  /** The line shown under the title: the subtitle, or an excerpt of the extra text that matched. */
  subtitle: string | null;
};
