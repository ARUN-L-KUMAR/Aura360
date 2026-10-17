import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const LOCALES = join(import.meta.dirname, '..', 'src', 'i18n', 'locales');

function flatten(value: unknown, prefix = ''): [string, unknown][] {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.entries(value).flatMap(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k));
  }
  return [[prefix, value]];
}

const languages = readdirSync(LOCALES, { withFileTypes: true }).filter((d) => d.isDirectory());

test('every catalog file is valid JSON with non-empty string values', () => {
  for (const lang of languages) {
    for (const file of readdirSync(join(LOCALES, lang.name)).filter((f) => f.endsWith('.json'))) {
      const parsed = JSON.parse(readFileSync(join(LOCALES, lang.name, file), 'utf8'));
      for (const [key, value] of flatten(parsed)) {
        assert.equal(typeof value, 'string', `${lang.name}/${file}: ${key} must be a string`);
        assert.ok((value as string).trim().length > 0, `${lang.name}/${file}: ${key} is empty`);
      }
    }
  }
});

test('plural keys come in complete sets (_one and _other)', () => {
  for (const lang of languages) {
    for (const file of readdirSync(join(LOCALES, lang.name)).filter((f) => f.endsWith('.json'))) {
      const keys = new Set(flatten(JSON.parse(readFileSync(join(LOCALES, lang.name, file), 'utf8'))).map(([k]) => k));
      for (const key of keys) {
        if (key.endsWith('_one')) assert.ok(keys.has(key.replace(/_one$/, '_other')), `${lang.name}/${file}: ${key} has no _other form`);
      }
    }
  }
});

test('every other language has exactly the keys of English', () => {
  const english = languages.find((l) => l.name === 'en');
  assert.ok(english, 'English catalog is the source of truth');
  const keysOf = (lang: string) =>
    readdirSync(join(LOCALES, lang))
      .filter((f) => f.endsWith('.json'))
      .flatMap((f) => flatten(JSON.parse(readFileSync(join(LOCALES, lang, f), 'utf8'))).map(([k]) => `${f}:${k.replace(/_(zero|one|two|few|many|other)$/, '')}`));
  const en = new Set(keysOf('en'));
  for (const lang of languages.filter((l) => l.name !== 'en')) {
    const other = new Set(keysOf(lang.name));
    assert.deepEqual([...en].filter((k) => !other.has(k)), [], `${lang.name} is missing keys`);
    assert.deepEqual([...other].filter((k) => !en.has(k)), [], `${lang.name} has keys English does not`);
  }
});
