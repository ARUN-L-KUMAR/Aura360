export type SavedType = 'article' | 'video' | 'product' | 'recipe' | 'other';

export type SavedItem = {
  id: string;
  type: SavedType;
  title: string;
  url: string | null;
  description: string | null;
  imageUrl: string | null;
  tags: string[] | null;
  isFavorite: boolean | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

/** The server accepts null here (unlike most modules), which is how a field is cleared. */
export type SavedInput = {
  type?: SavedType;
  title?: string;
  url?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  tags?: string[] | null;
  isFavorite?: boolean;
};

/** Display order of the types. Labels live in the catalog: `t('saved:type.<value>')`. */
export const SAVED_TYPES: readonly SavedType[] = ['article', 'video', 'product', 'recipe', 'other'];

export const isSavedType = (value: string | null | undefined): value is SavedType => !!value && (SAVED_TYPES as readonly string[]).includes(value);

export type Destination = 'auto' | 'saved' | 'notes' | 'fashion';

export type IngestPreview = {
  id: string;
  url: string;
  title: string;
  description: string | null;
  image: string | null;
  source: string;
  type: string;
  suggestedModule: string;
  confidence: number;
  resolvedDestination: string;
  persistedTo: string | null;
  /** What the server read besides the title: for a shopping link, the price and how it was classified (see `productFacts`). */
  metadata?: Record<string, unknown> | null;
};

export type ProductFacts = {
  /** Electronics, Appliances, Home & Kitchen ... (Saved items only). */
  category: string | null;
  price: number | null;
  currency: string;
  store: string | null;
};

const str = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);

/**
 * The shopping details the server keeps with a link. Two shapes, both read here: a saved item keeps `category`, `price`,
 * `currency` and `store` in its metadata; a link that has only been previewed keeps the price under `product` and the
 * decision under `classification`. `forPlace` is where it would be filed: a clothing item filed under Saved is "Fashion".
 */
export function productFacts(metadata: Record<string, unknown> | null | undefined, forPlace: PlaceKey | null = null): ProductFacts {
  const record = metadata ?? {};
  const product = (record.product && typeof record.product === 'object' ? record.product : {}) as Record<string, unknown>;
  const classification = (record.classification && typeof record.classification === 'object' ? record.classification : null) as Record<string, unknown> | null;

  let category = str(record.category);
  if (!category && classification && forPlace === 'saved') category = classification.module === 'saved' ? str(classification.category) : 'Fashion';

  const rawPrice = record.price ?? product.price;
  const price = typeof rawPrice === 'number' ? rawPrice : typeof rawPrice === 'string' ? Number.parseFloat(rawPrice.replace(/,/g, '')) : Number.NaN;

  return {
    category,
    price: Number.isFinite(price) && price > 0 ? price : null,
    currency: str(record.currency) ?? str(product.currency) ?? 'INR',
    store: str(record.store) ?? str(product.store),
  };
}

/** Where a link can end up. Labels live in the catalog: `t('saved:place.<key>')`. */
export type PlaceKey = 'saved' | 'notes' | 'fashion';

/** Maps the server's module name to the place a link was filed under (everything else is filed under Saved). */
export function placeOf(module: string | null | undefined): PlaceKey {
  return module === 'notes' || module === 'fashion' ? module : 'saved';
}

export function hostOf(url: string | null) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** First http(s) link found in some text (e.g. what a share sheet or clipboard gives). */
export function extractUrl(text: string) {
  return text.match(/https?:\/\/[^\s]+/)?.[0] ?? null;
}
