/**
 * Pure matching, ranking and highlighting for global search. No React Native imports, so it runs under node:test
 * (see tests/search-match.test.ts).
 *
 * Rules:
 *  - Case and diacritics are ignored ("Cafe" finds "Café"). Text is compared in NFD with combining marks removed.
 *  - The query is split on whitespace and commas into tokens. EVERY token must match somewhere in the item.
 *  - Per token the best field wins: title word-start 100, title anywhere 60, body word-start 30, body anywhere 15.
 *    ("word-start" = the match begins the field or follows a character that is not a letter or digit.)
 *  - Bonuses: the whole title equals the query +100, the title starts with the whole query +40.
 *  - Higher score first. Equal scores keep the order the caller supplied (the sections list newest first).
 */

export type SearchField = {
  text: string | null | undefined;
  /** `title` matches outrank `body` matches. */
  kind: 'title' | 'body';
};

export type Range = { start: number; end: number };

export type Segment = { text: string; match: boolean };

/** Most tokens considered from one query; the rest are ignored. */
export const MAX_TOKENS = 6;

export const SCORE = {
  titlePrefix: 100,
  titleSubstring: 60,
  bodyPrefix: 30,
  bodySubstring: 15,
  titleEquals: 100,
  titleStartsWithQuery: 40,
} as const;

const MARKS = /\p{M}/gu;

/** Lower-case, strip diacritics. Not trimmed. */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(MARKS, '').toLowerCase();
}

/** Normalised, de-duplicated query words (at most MAX_TOKENS). Empty for a blank query. */
export function tokenize(query: string): string[] {
  const words = normalize(query)
    .split(/[\s,;]+/u)
    .filter((word) => word.length > 0);
  return [...new Set(words)].slice(0, MAX_TOKENS);
}

const WORD_CHAR = /[\p{L}\p{N}]/u;

/** 'prefix' when some occurrence starts a word, 'substring' when it only occurs inside one, null when absent. */
function position(haystack: string, token: string): 'prefix' | 'substring' | null {
  let from = 0;
  let found = false;
  for (;;) {
    const at = haystack.indexOf(token, from);
    if (at === -1) break;
    found = true;
    if (at === 0 || !WORD_CHAR.test(haystack[at - 1])) return 'prefix';
    from = at + 1;
  }
  return found ? 'substring' : null;
}

/**
 * Relevance of one item for the tokens, or 0 when it does not match (a token found nowhere).
 * `fields` should list the title first, then the other searchable text.
 */
export function scoreMatch(tokens: string[], fields: SearchField[]): number {
  if (tokens.length === 0) return 0;
  const prepared = fields
    .filter((field): field is { text: string; kind: SearchField['kind'] } => typeof field.text === 'string' && field.text.length > 0)
    .map((field) => ({ text: normalize(field.text), kind: field.kind }));
  if (prepared.length === 0) return 0;

  let total = 0;
  for (const token of tokens) {
    let best = 0;
    for (const field of prepared) {
      const at = position(field.text, token);
      if (!at) continue;
      const points =
        field.kind === 'title'
          ? at === 'prefix'
            ? SCORE.titlePrefix
            : SCORE.titleSubstring
          : at === 'prefix'
            ? SCORE.bodyPrefix
            : SCORE.bodySubstring;
      if (points > best) best = points;
    }
    if (best === 0) return 0;
    total += best;
  }

  const phrase = tokens.join(' ');
  const title = prepared.find((field) => field.kind === 'title')?.text.trim();
  if (title) {
    if (title === phrase) total += SCORE.titleEquals;
    else if (title.startsWith(phrase)) total += SCORE.titleStartsWithQuery;
  }
  return total;
}

/** Keeps the matching items, best first. Ties keep the input order. */
export function rankItems<T>(items: readonly T[], tokens: string[], fieldsOf: (item: T) => SearchField[]): { item: T; score: number }[] {
  if (tokens.length === 0) return [];
  const scored: { item: T; score: number; order: number }[] = [];
  items.forEach((item, order) => {
    const score = scoreMatch(tokens, fieldsOf(item));
    if (score > 0) scored.push({ item, score, order });
  });
  scored.sort((a, b) => b.score - a.score || a.order - b.order);
  return scored.map(({ item, score }) => ({ item, score }));
}

/**
 * Normalised text plus, for each normalised character, the offset of the source character in the original string
 * (and where that source character ends), so ranges found in the normalised text can be mapped back.
 */
function normalizeWithMap(text: string): { text: string; starts: number[]; ends: number[] } {
  let out = '';
  const starts: number[] = [];
  const ends: number[] = [];
  let offset = 0;
  for (const char of text) {
    const next = offset + char.length;
    const folded = normalize(char);
    if (folded.length === 0 && starts.length > 0) {
      // A lone combining mark belongs to the character before it: stretch that character's range over it.
      const owner = starts[starts.length - 1];
      for (let j = ends.length - 1; j >= 0 && starts[j] === owner; j--) ends[j] = next;
    }
    for (let i = 0; i < folded.length; i++) {
      starts.push(offset);
      ends.push(next);
    }
    out += folded;
    offset = next;
  }
  return { text: out, starts, ends };
}

/** Sorted, non-overlapping ranges (offsets into `text`) covered by any token. */
export function highlightRanges(text: string | null | undefined, tokens: string[]): Range[] {
  if (!text || tokens.length === 0) return [];
  const folded = normalizeWithMap(text);
  const found: Range[] = [];
  for (const token of tokens) {
    if (!token) continue;
    let from = 0;
    for (;;) {
      const at = folded.text.indexOf(token, from);
      if (at === -1) break;
      found.push({ start: folded.starts[at], end: folded.ends[at + token.length - 1] });
      from = at + 1;
    }
  }
  found.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: Range[] = [];
  for (const range of found) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) last.end = Math.max(last.end, range.end);
    else merged.push({ ...range });
  }
  return merged;
}

/** Cuts `text` into alternating plain and matched pieces. The pieces always join back into `text`. */
export function splitByRanges(text: string, ranges: Range[]): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start > cursor) segments.push({ text: text.slice(cursor, range.start), match: false });
    segments.push({ text: text.slice(range.start, range.end), match: true });
    cursor = range.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), match: false });
  return segments;
}

const ELLIPSIS = '…';

/**
 * A single-line excerpt of at most about `max` characters, centred on the first match so the matched words stay
 * visible in a two-line subtitle. Short text is returned whole (whitespace collapsed).
 */
export function snippet(text: string, tokens: string[], max = 90): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const first = highlightRanges(flat, tokens)[0];
  if (!first || first.start < max - Math.floor(max / 3)) return flat.slice(0, max).trimEnd() + ELLIPSIS;
  const lead = Math.floor(max / 4);
  let start = Math.max(0, first.start - lead);
  const end = Math.min(flat.length, start + max);
  start = Math.max(0, end - max);
  // Prefer to start on a word boundary.
  const space = flat.indexOf(' ', start);
  if (start > 0 && space !== -1 && space < first.start) start = space + 1;
  return (start > 0 ? ELLIPSIS : '') + flat.slice(start, end).trim() + (end < flat.length ? ELLIPSIS : '');
}

/** The parts of a record that search reads. */
export type Searchable = { title: string; subtitle: string | null; extras: readonly string[] };

/** Fields in ranking order: the title first, then the subtitle and extra text as body. */
export function fieldsOf(entry: Searchable): SearchField[] {
  return [
    { text: entry.title, kind: 'title' },
    { text: entry.subtitle, kind: 'body' },
    ...entry.extras.map((text): SearchField => ({ text, kind: 'body' })),
  ];
}

const hasMatch = (text: string | null | undefined, tokens: string[]) => !!text && highlightRanges(text, tokens).length > 0;

/**
 * The line shown under a result's title: the subtitle when it matches (or nothing else does), otherwise an excerpt of
 * the extra text that matched, so the user can see why the item was found.
 */
export function displaySubtitle(entry: Searchable, tokens: string[]): string | null {
  if (hasMatch(entry.subtitle, tokens)) return snippet(entry.subtitle as string, tokens);
  const extra = entry.extras.find((text) => hasMatch(text, tokens));
  if (extra) return snippet(extra, tokens);
  return entry.subtitle ? snippet(entry.subtitle, tokens) : null;
}

// Recent searches (pure list helpers; storage lives in use-recent-searches.ts)

export const MAX_RECENT = 8;

const sameQuery = (a: string, b: string) => normalize(a).trim() === normalize(b).trim();

/** Newest first, de-duplicated (case and diacritics ignored), capped at `max`. Blank queries are ignored. */
export function addRecent(list: readonly string[], query: string, max = MAX_RECENT): string[] {
  const clean = query.replace(/\s+/g, ' ').trim();
  if (!clean) return [...list];
  return [clean, ...list.filter((entry) => !sameQuery(entry, clean))].slice(0, max);
}

export function removeRecent(list: readonly string[], query: string): string[] {
  return list.filter((entry) => !sameQuery(entry, query));
}

/** Reads a stored value defensively: anything that is not a list of non-empty strings is dropped. */
export function parseRecent(raw: string | null, max = MAX_RECENT): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0).slice(0, max);
  } catch {
    return [];
  }
}
