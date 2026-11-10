import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const ROOT = join(import.meta.dirname, '..');
const common = JSON.parse(readFileSync(join(ROOT, 'src', 'i18n', 'locales', 'en', 'common.json'), 'utf8')) as Record<string, unknown>;

/** True when a dotted key resolves to a string (or to a plural set `key_other`). */
function has(path: string): boolean {
  let node: unknown = common;
  for (const part of path.split('.')) {
    if (!node || typeof node !== 'object') return false;
    const obj = node as Record<string, unknown>;
    if (part in obj) node = obj[part];
    else return `${part}_other` in obj;
  }
  return typeof node === 'string';
}

function walk(dir: string, out: string[] = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

test('every literal common key read by the shared library exists', () => {
  const files = [
    ...walk(join(ROOT, 'src', 'components', 'ui')),
    join(ROOT, 'src', 'components', 'app-tabs.tsx'),
    join(ROOT, 'src', 'app', '(app)', '_layout.tsx'),
  ];
  const missing: string[] = [];
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    for (const m of source.matchAll(/\bt\('([A-Za-z0-9_.]+)'/g)) {
      if (!has(m[1])) missing.push(`${file}: ${m[1]}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('every module has label, short, description and blurb', () => {
  const modules = common.modules as Record<string, Record<string, string>>;
  assert.equal(Object.keys(modules).length, 9);
  for (const [key, entry] of Object.entries(modules)) {
    for (const field of ['label', 'short', 'description', 'blurb']) assert.ok(entry[field], `${key}.${field}`);
  }
});

test('every error kind has a title, message and action; empty variants have a title', () => {
  for (const kind of ['generic', 'network', 'timeout', 'sessionExpired', 'notFound']) {
    for (const field of ['title', 'message', 'action']) assert.ok(has(`errorState.${kind}.${field}`), `${kind}.${field}`);
  }
  for (const variant of ['empty', 'noResults', 'offline']) assert.ok(has(`emptyState.${variant}.title`), variant);
});

test('generic action words exist', () => {
  const words = ['save', 'cancel', 'delete', 'retry', 'close', 'done', 'edit', 'add', 'back', 'search', 'clear', 'confirm', 'continue', 'skip', 'next', 'share', 'copy', 'undo'];
  for (const key of words) assert.ok(has(`actions.${key}`), key);
});
