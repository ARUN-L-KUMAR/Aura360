import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { MASCOTS } from '../src/features/ai/mascot/characters.ts';
import { MOODS } from '../src/features/ai/mascot/face.ts';
import { MOOD_TEXT, activityForTool } from '../src/features/ai/mascot/mood.ts';

test('the mood helper tells search tools from write tools', () => {
  assert.deepEqual(activityForTool('get_transactions'), { kind: 'search' });
  assert.deepEqual(activityForTool('get_fitness_logs'), { kind: 'search' });
  assert.deepEqual(activityForTool('log_workout'), { kind: 'work' });
  assert.deepEqual(activityForTool('create_note'), { kind: 'work' });
  assert.deepEqual(activityForTool('get_something_new'), { kind: 'search' });
  assert.deepEqual(activityForTool('do_something_new'), { kind: 'work' });
});

test('there are 11 moods, each with a text line', () => {
  assert.equal(MOODS.length, 11);
  for (const mood of MOODS) {
    assert.ok(MOOD_TEXT[mood].length > 0, `${mood}: text`);
  }
});

test('there are 5 mascots to choose from', () => {
  assert.equal(MASCOTS.length, 5);
  assert.equal(new Set(MASCOTS.map((m) => m.id)).size, 5, 'mascot ids must be unique');
});

test('both apps have a cropped image file for every mascot and mood', () => {
  for (const mascot of MASCOTS) {
    for (const mood of MOODS) {
      const webFile = new URL(`../../web/public/ai/mascot/characters/${mascot.id}/${mood}.png`, import.meta.url);
      const mobileFile = new URL(`../assets/images/mascot/characters/${mascot.id}/${mood}.png`, import.meta.url);
      assert.ok(readFileSync(webFile).length > 0, `apps/web/public/ai/mascot/characters/${mascot.id}/${mood}.png is missing or empty`);
      assert.ok(readFileSync(mobileFile).length > 0, `apps/mobile/assets/images/mascot/characters/${mascot.id}/${mood}.png is missing or empty`);
    }
  }
});

test('the web and mobile copies of face.ts and mood.ts (framework-agnostic, no static requires) are identical', () => {
  for (const file of ['face.ts', 'mood.ts']) {
    const mobile = readFileSync(new URL(`../src/features/ai/mascot/${file}`, import.meta.url), 'utf8');
    const web = readFileSync(new URL(`../../web/lib/ai/mascot/${file}`, import.meta.url), 'utf8');
    assert.equal(mobile, web, `${file} differs between apps/mobile/src/features/ai/mascot and apps/web/lib/ai/mascot: copy one over the other`);
  }
});

test('the web and mobile copies of characters.ts agree on the mascot ids, names and order', () => {
  const web = readFileSync(new URL('../../web/lib/ai/mascot/characters.ts', import.meta.url), 'utf8');
  for (const mascot of MASCOTS) {
    assert.ok(web.includes(`{ id: "${mascot.id}", name: "${mascot.name}" }`), `apps/web/lib/ai/mascot/characters.ts is missing or differs for "${mascot.id}"`);
  }
});
