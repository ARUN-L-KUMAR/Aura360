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

export const SAVED_TYPES: { value: SavedType; label: string }[] = [
  { value: 'article', label: 'Article' },
  { value: 'video', label: 'Video' },
  { value: 'product', label: 'Product' },
  { value: 'recipe', label: 'Recipe' },
  { value: 'other', label: 'Other' },
];

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

export const MODULE_LABEL: Record<string, string> = {
  saved: 'Saved',
  notes: 'Notes',
  fashion: 'Fashion wishlist',
  food: 'Saved',
  fitness: 'Saved',
  skincare: 'Saved',
  time: 'Saved',
};

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
