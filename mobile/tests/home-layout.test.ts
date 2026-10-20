import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  activePreset,
  allowedSuggestions,
  applyPreset,
  DEFAULT_LAYOUT,
  HOME_MODULES,
  homeBlocks,
  markCustomized,
  moveModule,
  normalizeLayout,
  scoreGoals,
  setSection,
  showsScore,
  toggleModule,
  type HomeLayout,
} from '../src/features/home/layout.ts';

const only = (modules: HomeLayout['modules'], extra: Partial<HomeLayout['sections']> = {}): HomeLayout => ({
  modules,
  sections: { ...DEFAULT_LAYOUT.sections, ...extra },
  customized: true,
});

test('the default shows every module and every section, and is not yet customized', () => {
  assert.deepEqual(DEFAULT_LAYOUT.modules, [...HOME_MODULES]);
  assert.ok(Object.values(DEFAULT_LAYOUT.sections).every(Boolean));
  assert.equal(DEFAULT_LAYOUT.customized, false);
});

test('normalizeLayout falls back on anything unusable', () => {
  for (const bad of [null, undefined, 'x', 3, [], {}, { modules: 'finance' }, { sections: {} }]) {
    assert.deepEqual(normalizeLayout(bad), DEFAULT_LAYOUT);
  }
});

test('normalizeLayout keeps order, drops unknown and repeated modules, and allows an empty list', () => {
  const out = normalizeLayout({ modules: ['notes', 'nope', 'finance', 'notes', 7], sections: { score: false, tiles: 'yes' }, customized: true });
  assert.deepEqual(out.modules, ['notes', 'finance']);
  assert.equal(out.sections.score, false);
  assert.equal(out.sections.tiles, true);
  assert.equal(out.customized, true);
  assert.deepEqual(normalizeLayout({ modules: [] }).modules, []);
});

test('toggleModule adds at the end and removes, and marks the layout customized', () => {
  const removed = toggleModule(DEFAULT_LAYOUT, 'finance');
  assert.ok(!removed.modules.includes('finance'));
  assert.equal(removed.customized, true);
  assert.equal(toggleModule(removed, 'finance').modules.at(-1), 'finance');
});

test('moveModule swaps neighbours and stops at the ends', () => {
  const layout = only(['finance', 'notes', 'saved']);
  assert.deepEqual(moveModule(layout, 'notes', -1).modules, ['notes', 'finance', 'saved']);
  assert.deepEqual(moveModule(layout, 'notes', 1).modules, ['finance', 'saved', 'notes']);
  assert.equal(moveModule(layout, 'finance', -1), layout);
  assert.equal(moveModule(layout, 'saved', 1), layout);
  assert.equal(moveModule(layout, 'fashion', 1), layout);
});

test('setSection changes one switch and keeps the same object when nothing changes', () => {
  const off = setSection(DEFAULT_LAYOUT, 'activity', false);
  assert.equal(off.sections.activity, false);
  assert.equal(off.sections.score, true);
  assert.equal(setSection(off, 'activity', false), off);
});

test('presets pick their modules and are recognised again, in any order', () => {
  const health = applyPreset(DEFAULT_LAYOUT, 'health');
  assert.deepEqual(health.modules, ['food', 'fitness']);
  assert.equal(activePreset(health), 'health');
  assert.equal(activePreset(only(['fitness', 'food'])), 'health');
  assert.equal(activePreset(applyPreset(DEFAULT_LAYOUT, 'notesCare')), 'notesCare');
  assert.equal(activePreset(DEFAULT_LAYOUT), 'everything');
  assert.equal(activePreset(only(['finance'])), null);
});

test('the day score only counts goals whose module is on Home', () => {
  assert.deepEqual(scoreGoals(only(['food'])), { calories: true, move: false, budget: false });
  assert.deepEqual(scoreGoals(only(['finance', 'fitness'])), { calories: false, move: true, budget: true });
  assert.equal(showsScore(only(['notes', 'saved', 'skincare'])), false);
  assert.equal(showsScore(only(['food'])), true);
  assert.equal(showsScore(only(['food'], { score: false })), false);
});

test('markCustomized keeps the modules and is idempotent', () => {
  const marked = markCustomized(DEFAULT_LAYOUT);
  assert.equal(marked.customized, true);
  assert.deepEqual(marked.modules, DEFAULT_LAYOUT.modules);
  assert.equal(markCustomized(marked), marked);
});

test('only suggestions from modules on Home are allowed', () => {
  assert.deepEqual(allowedSuggestions(only(['notes', 'saved'])), []);
  assert.deepEqual(allowedSuggestions(only(['food', 'finance'])), ['logMeal', 'logSpending']);
  assert.deepEqual(allowedSuggestions(DEFAULT_LAYOUT), ['logMeal', 'workout', 'startTimer', 'logSpending']);
});

const kinds = (layout: HomeLayout, context = { hasToday: true, timerRunning: false }) => homeBlocks(layout, context).map((b) => b.kind);

test('the default Home draws the sections, then every module in order, with Focus and Workouts sharing a row', () => {
  assert.deepEqual(kinds(DEFAULT_LAYOUT), ['score', 'prompt', 'upNext', 'tiles', 'activity', 'finance', 'halves', 'food', 'notes', 'saved', 'skincare', 'fashion']);
  const halves = homeBlocks(DEFAULT_LAYOUT, { hasToday: true, timerRunning: false }).find((b) => b.kind === 'halves');
  assert.deepEqual(halves, { kind: 'halves', modules: ['fitness', 'time'] });
});

test('once the person has chosen, the first-run prompt is gone', () => {
  assert.ok(!kinds({ ...DEFAULT_LAYOUT, customized: true }).includes('prompt'));
});

test('a Notes, Saved and Skincare focus has no score and no suggestions, only their cards', () => {
  assert.deepEqual(kinds(only(['notes', 'saved', 'skincare'])), ['tiles', 'activity', 'notes', 'saved', 'skincare']);
});

test('modules are drawn in the order the person set', () => {
  assert.deepEqual(kinds(only(['fashion', 'finance'], { tiles: false, activity: false })), ['score', 'upNext', 'fashion', 'finance']);
});

test('the shared row sits where the earlier of Focus and Workouts is, whichever comes first', () => {
  const layout = only(['time', 'finance', 'fitness'], { score: false, upNext: false, tiles: false, activity: false });
  assert.deepEqual(kinds(layout), ['halves', 'finance']);
  assert.deepEqual(homeBlocks(layout, { hasToday: true, timerRunning: false })[0], { kind: 'halves', modules: ['time', 'fitness'] });
  assert.deepEqual(homeBlocks(only(['fitness'], { score: false, upNext: false, tiles: false, activity: false }), { hasToday: true, timerRunning: false }), [{ kind: 'halves', modules: ['fitness'] }]);
});

test('Up next carries only the suggestions of modules on Home, and is left out when there are none', () => {
  const food = homeBlocks(only(['food']), { hasToday: true, timerRunning: false }).find((b) => b.kind === 'upNext');
  assert.deepEqual(food, { kind: 'upNext', allowed: ['logMeal'] });
  assert.ok(!kinds(only(['saved'])).includes('upNext'));
});

test('a server without the today block gets the older hero and only the cards that do not need it', () => {
  const old = { hasToday: false, timerRunning: false };
  assert.deepEqual(kinds(DEFAULT_LAYOUT, old), ['hero', 'prompt', 'tiles', 'activity', 'finance', 'saved', 'skincare', 'fashion']);
  assert.deepEqual(kinds(only(['food', 'notes', 'fitness', 'time']), old), ['hero', 'tiles', 'activity']);
});

test('without the today block a running timer shows only when Focus is on Home', () => {
  const running = { hasToday: false, timerRunning: true };
  assert.ok(kinds(only(['time']), running).includes('timer'));
  assert.ok(!kinds(only(['finance']), running).includes('timer'));
  assert.ok(!kinds(only(['time']), { hasToday: false, timerRunning: false }).includes('timer'));
  assert.ok(!kinds(only(['time']), { hasToday: true, timerRunning: true }).includes('timer'));
});

test('when nothing would be drawn there is one empty block', () => {
  assert.deepEqual(kinds(only([], { score: false, upNext: false, tiles: false, activity: false })), ['empty']);
  // Only cards that need today, and an old server: also nothing to draw.
  assert.deepEqual(kinds(only(['notes'], { score: false, upNext: false, tiles: false, activity: false }), { hasToday: false, timerRunning: false }), ['empty']);
  assert.ok(!kinds(only([], { score: false, upNext: false, tiles: false })).includes('empty'));
});
