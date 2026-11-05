import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { BROWS, EYES, FACES, GLYPHS, GLYPH_ANIM, MOUTHS, type Glyph, type Mood } from '../src/features/ai/mascot/face.ts';
import { MOOD_TEXT, activityForTool, propFor } from '../src/features/ai/mascot/mood.ts';

const MOODS = Object.keys(FACES) as Mood[];

test('the mood helpers read tools the way the assistant uses them', () => {
  assert.deepEqual(activityForTool('get_transactions'), { kind: 'search', glyph: 'coin' });
  assert.deepEqual(activityForTool('get_financial_goals'), { kind: 'search', glyph: 'coin' });
  assert.deepEqual(activityForTool('get_fitness_logs'), { kind: 'search', glyph: 'dumbbell' });
  assert.deepEqual(activityForTool('log_workout'), { kind: 'work', glyph: 'dumbbell' });
  assert.deepEqual(activityForTool('log_meal'), { kind: 'work', glyph: 'fork' });
  assert.deepEqual(activityForTool('get_notes'), { kind: 'search', glyph: 'note' });
  assert.deepEqual(activityForTool('create_note'), { kind: 'work', glyph: 'note' });
  assert.deepEqual(activityForTool('get_wardrobe'), { kind: 'search', glyph: 'hanger' });
  assert.deepEqual(activityForTool('get_fashion_profile'), { kind: 'search', glyph: 'hanger' });
  assert.deepEqual(activityForTool('get_skincare_routine'), { kind: 'search', glyph: 'drop' });
  assert.deepEqual(activityForTool('add_skincare_product'), { kind: 'work', glyph: 'drop' });
  assert.deepEqual(activityForTool('get_time_logs'), { kind: 'search', glyph: 'clock' });
  assert.deepEqual(activityForTool('log_time_entry'), { kind: 'work', glyph: 'clock' });
  assert.deepEqual(activityForTool('get_saved_items'), { kind: 'search', glyph: 'bookmark' });
  assert.deepEqual(activityForTool('save_item'), { kind: 'work', glyph: 'bookmark' });
});

test('product links get their own icons, and unknown tools still get a sensible face', () => {
  assert.deepEqual(activityForTool('get_product_from_link'), { kind: 'search', glyph: 'link' });
  assert.deepEqual(activityForTool('add_product_from_link'), { kind: 'work', glyph: 'bag' });
  assert.deepEqual(activityForTool('get_something_new'), { kind: 'search', glyph: 'magnifier' });
  assert.deepEqual(activityForTool('do_something_new'), { kind: 'work', glyph: 'gear' });
});

test('every mood has a face, text and only drawable parts', () => {
  assert.equal(MOODS.length, 11);
  for (const mood of MOODS) {
    const face = FACES[mood];
    assert.ok(EYES[face.eyes], `${mood}: eyes`);
    if (face.mouth !== 'talk') assert.ok(MOUTHS[face.mouth], `${mood}: mouth`);
    if (face.brow) assert.ok(BROWS[face.brow], `${mood}: brow`);
    assert.ok(MOOD_TEXT[mood].length > 0, `${mood}: text`);
  }
});

test('every icon can be drawn and has a motion', () => {
  const glyphs = Object.keys(GLYPHS) as Glyph[];
  for (const glyph of glyphs) {
    assert.ok(GLYPHS[glyph].paths.length > 0, `${glyph}: paths`);
    assert.ok(GLYPH_ANIM[glyph], `${glyph}: motion`);
  }
});

test('the icon above the head says what kind of work it is', () => {
  assert.deepEqual(propFor('sleeping', null), { glyph: 'zzz', lens: false });
  assert.deepEqual(propFor('thinking', null), { glyph: 'dots', lens: false });
  assert.deepEqual(propFor('asking', null), { glyph: 'question', lens: false });
  assert.deepEqual(propFor('oops', null), { glyph: 'sweat', lens: false });
  // Searching shows the module's icon with a small magnifier over it; writing shows the icon alone.
  assert.deepEqual(propFor('searching', { kind: 'search', glyph: 'coin' }), { glyph: 'coin', lens: true });
  assert.deepEqual(propFor('working', { kind: 'work', glyph: 'coin' }), { glyph: 'coin', lens: false });
  // A search with no module is just the magnifier, with nothing to put it over.
  assert.deepEqual(propFor('searching', { kind: 'search', glyph: 'magnifier' }), { glyph: 'magnifier', lens: false });
  assert.equal(propFor('idle', null), null);
  assert.equal(propFor('talking', null), null);
});

test('the web and mobile copies of the shared mascot files are identical', () => {
  for (const file of ['face.ts', 'mood.ts']) {
    const mobile = readFileSync(new URL(`../src/features/ai/mascot/${file}`, import.meta.url), 'utf8');
    const web = readFileSync(new URL(`../../web/lib/ai/mascot/${file}`, import.meta.url), 'utf8');
    assert.equal(mobile, web, `${file} differs between apps/mobile/src/features/ai/mascot and apps/web/lib/ai/mascot: copy one over the other`);
  }
});
