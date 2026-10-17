import { displaySubtitle, fieldsOf, rankItems } from './match';
import { SEARCH_GROUPS, type SearchEntry, type SearchGroup, type SearchHit } from './types';

export type GroupedHits = Record<SearchGroup, SearchHit[]>;

const emptyGroups = (): GroupedHits => Object.fromEntries(SEARCH_GROUPS.map((group) => [group, [] as SearchHit[]])) as unknown as GroupedHits;

/** Ranks every entry against the tokens and groups the matches. Each group is sorted best first. */
export function searchEntries(entries: readonly SearchEntry[], tokens: string[]): GroupedHits {
  const grouped = emptyGroups();
  if (tokens.length === 0) return grouped;
  for (const group of SEARCH_GROUPS) {
    const own = entries.filter((entry) => entry.group === group);
    grouped[group] = rankItems(own, tokens, fieldsOf).map(({ item, score }) => ({ entry: item, score, subtitle: displaySubtitle(item, tokens) }));
  }
  return grouped;
}

export const countHits = (grouped: GroupedHits) => SEARCH_GROUPS.reduce((sum, group) => sum + grouped[group].length, 0);
