import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  MAX_RECENT,
  MAX_TOKENS,
  addRecent,
  displaySubtitle,
  fieldsOf,
  highlightRanges,
  normalize,
  parseRecent,
  rankItems,
  removeRecent,
  scoreMatch,
  snippet,
  splitByRanges,
  tokenize,
  type SearchField,
} from '../src/features/search/match.ts';

const title = (text: string): SearchField => ({ text, kind: 'title' });
const body = (text: string): SearchField => ({ text, kind: 'body' });

test('normalize ignores case and diacritics', () => {
  assert.equal(normalize('Café Crème'), 'cafe creme');
  assert.equal(normalize('ŞİMDİ'.toLowerCase()).includes('simdi'), true);
  assert.equal(normalize('Ångström'), 'angstrom');
});

test('tokenize splits on whitespace and commas, dedupes and caps', () => {
  assert.deepEqual(tokenize('  Coffee,  TEA coffee '), ['coffee', 'tea']);
  assert.deepEqual(tokenize('   '), []);
  assert.equal(tokenize('a b c d e f g h').length, MAX_TOKENS);
});

test('a diacritic-free query finds accented text and vice versa', () => {
  assert.ok(scoreMatch(tokenize('cafe'), [title('Café with Zoë')]) > 0);
  assert.ok(scoreMatch(tokenize('zoë'), [title('Cafe with Zoe')]) > 0);
});

test('every token must match; a missing one rejects the item', () => {
  assert.ok(scoreMatch(tokenize('run morning'), [title('Morning run'), body('5 km')]) > 0);
  assert.equal(scoreMatch(tokenize('run evening'), [title('Morning run')]), 0);
  assert.equal(scoreMatch([], [title('anything')]), 0);
  assert.equal(scoreMatch(tokenize('x'), [{ text: null, kind: 'title' }, { text: undefined, kind: 'body' }]), 0);
});

test('ranking: title beats body, word-start beats substring', () => {
  const tokens = tokenize('rent');
  const titlePrefix = scoreMatch(tokens, [title('Rent payment')]);
  const titleInside = scoreMatch(tokens, [title('Current account')]);
  const bodyPrefix = scoreMatch(tokens, [title('Flat'), body('Rent for October')]);
  const bodyInside = scoreMatch(tokens, [title('Flat'), body('Current month')]);
  assert.ok(titlePrefix > titleInside, 'title prefix > title substring');
  assert.ok(titleInside > bodyPrefix, 'title substring > body prefix');
  assert.ok(bodyPrefix > bodyInside, 'body prefix > body substring');
  assert.ok(bodyInside > 0);
});

test('an exact title match gets a bonus over a longer title', () => {
  const tokens = tokenize('groceries');
  assert.ok(scoreMatch(tokens, [title('Groceries')]) > scoreMatch(tokens, [title('Groceries and more')]));
  assert.ok(scoreMatch(tokens, [title('Groceries and more')]) > scoreMatch(tokens, [title('Weekly groceries')]));
});

test('a word-start occurrence later in the text still counts as a prefix match', () => {
  const tokens = tokenize('run');
  assert.ok(scoreMatch(tokens, [title('Morning run')]) > scoreMatch(tokens, [title('Prune the tree')]));
});

test('rankItems sorts by score and keeps input order for ties', () => {
  const items = [
    { id: 'a', name: 'Spring clean', note: 'rent' },
    { id: 'b', name: 'Rent', note: '' },
    { id: 'c', name: 'Nothing', note: '' },
    { id: 'd', name: 'Rent again', note: '' },
    { id: 'e', name: 'Other', note: 'rent' },
  ];
  const ranked = rankItems(items, tokenize('rent'), (item) => [title(item.name), body(item.note)]);
  assert.deepEqual(
    ranked.map((r) => r.item.id),
    ['b', 'd', 'a', 'e'],
  );
  assert.deepEqual(rankItems(items, [], () => []), []);
});

test('highlightRanges marks every token occurrence, merged and sorted', () => {
  const text = 'Run the Morning run';
  const ranges = highlightRanges(text, tokenize('run morning'));
  assert.deepEqual(
    ranges.map((r) => text.slice(r.start, r.end)),
    ['Run', 'Morning', 'run'],
  );
  // Overlapping tokens merge into one range.
  const merged = highlightRanges('banana', ['ban', 'nan', 'ana']);
  assert.deepEqual(merged, [{ start: 0, end: 6 }]);
});

test('highlightRanges maps back to the original text across diacritics', () => {
  const text = 'Visit Café Crème today';
  const ranges = highlightRanges(text, tokenize('cafe creme'));
  assert.deepEqual(
    ranges.map((r) => text.slice(r.start, r.end)),
    ['Café', 'Crème'],
  );
  // Decomposed input (e + combining acute) keeps the mark inside the range.
  const decomposed = 'Café au lait';
  const [range] = highlightRanges(decomposed, tokenize('cafe'));
  assert.equal(decomposed.slice(range.start, range.end), 'Café');
});

test('highlightRanges is safe with emoji and empty input', () => {
  const text = '\u{1F600} smile \u{1F600}';
  const ranges = highlightRanges(text, tokenize('smile'));
  assert.equal(text.slice(ranges[0].start, ranges[0].end), 'smile');
  assert.deepEqual(highlightRanges('', ['a']), []);
  assert.deepEqual(highlightRanges(null, ['a']), []);
  assert.deepEqual(highlightRanges('abc', []), []);
});

test('splitByRanges produces segments that join back into the text', () => {
  const text = 'Buy milk and more milk';
  const segments = splitByRanges(text, highlightRanges(text, tokenize('milk')));
  assert.equal(segments.map((s) => s.text).join(''), text);
  assert.deepEqual(
    segments.filter((s) => s.match).map((s) => s.text),
    ['milk', 'milk'],
  );
  assert.deepEqual(splitByRanges('plain', []), [{ text: 'plain', match: false }]);
});

test('snippet keeps short text whole and centres long text on the first match', () => {
  assert.equal(snippet('  short   text ', tokenize('text')), 'short text');
  const long = `${'lorem ipsum dolor sit amet '.repeat(8)}needle ${'consectetur adipiscing elit '.repeat(8)}`;
  const out = snippet(long, tokenize('needle'), 80);
  assert.ok(out.includes('needle'));
  assert.ok(out.length <= 82);
  assert.ok(out.startsWith('…'));
  assert.ok(out.endsWith('…'));
  const head = snippet(long, tokenize('lorem'), 80);
  assert.ok(head.startsWith('lorem'));
  assert.ok(!head.startsWith('…'));
});

test('recent searches: newest first, de-duplicated, capped, blanks ignored', () => {
  let list: string[] = [];
  for (const q of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']) list = addRecent(list, q);
  assert.equal(list.length, MAX_RECENT);
  assert.deepEqual(list.slice(0, 3), ['i', 'h', 'g']);
  assert.equal(list.includes('a'), false);

  list = addRecent(['Coffee', 'tea'], '  café ');
  list = addRecent(list, 'COFFEE');
  assert.deepEqual(list, ['COFFEE', 'café', 'tea']);
  list = addRecent(list, 'cafe');
  assert.deepEqual(list, ['cafe', 'COFFEE', 'tea']);
  assert.deepEqual(addRecent(['x'], '   '), ['x']);
});

test('removeRecent drops one entry regardless of case', () => {
  assert.deepEqual(removeRecent(['Coffee', 'tea'], 'coffee'), ['tea']);
  assert.deepEqual(removeRecent(['tea'], 'nothing'), ['tea']);
});

test('parseRecent tolerates corrupt storage', () => {
  assert.deepEqual(parseRecent(null), []);
  assert.deepEqual(parseRecent('not json'), []);
  assert.deepEqual(parseRecent('{"a":1}'), []);
  assert.deepEqual(parseRecent('["a", 3, "", "  ", "b"]'), ['a', 'b']);
  assert.equal(parseRecent(JSON.stringify(Array.from({ length: 20 }, (_, i) => `q${i}`))).length, MAX_RECENT);
});

test('displaySubtitle shows why an item matched', () => {
  const entry = { title: 'Weekly shop', subtitle: 'Food · 5 Oct', extras: ['paid by card, receipt in the blue folder'] };
  // Matches the subtitle: show it.
  assert.equal(displaySubtitle(entry, tokenize('food')), 'Food · 5 Oct');
  // Matches only hidden text: show an excerpt of it instead.
  assert.equal(displaySubtitle(entry, tokenize('receipt')), 'paid by card, receipt in the blue folder');
  // Matches the title only: keep the subtitle.
  assert.equal(displaySubtitle(entry, tokenize('weekly')), 'Food · 5 Oct');
  assert.equal(displaySubtitle({ title: 'x', subtitle: null, extras: [] }, tokenize('x')), null);
});

test('fieldsOf puts the title first so ranking sees it as the title', () => {
  const entry = { title: 'Rent', subtitle: 'Bills', extras: ['monthly'] };
  assert.deepEqual(
    fieldsOf(entry).map((f) => f.kind),
    ['title', 'body', 'body'],
  );
  assert.ok(scoreMatch(tokenize('monthly'), fieldsOf(entry)) > 0);
  assert.ok(scoreMatch(tokenize('rent'), fieldsOf(entry)) > scoreMatch(tokenize('monthly'), fieldsOf(entry)));
});
