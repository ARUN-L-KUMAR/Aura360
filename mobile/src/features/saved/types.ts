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
};

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
