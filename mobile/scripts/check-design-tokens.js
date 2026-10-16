#!/usr/bin/env node
/**
 * Flags hard-coded visual values in components: colours, font sizes / families / weights, off-scale spacing and radii.
 * Tokens live in src/theme/ (the only place literals are allowed).
 *
 *   npm run lint:tokens                 fail if any file has MORE violations than the baseline
 *   npm run lint:tokens -- --update     rewrite the baseline (do this after migrating files; counts must only go down)
 *   npm run lint:tokens -- --report     list every violation
 *
 * The baseline (scripts/design-tokens-baseline.json) records existing debt per file so new code is held to the
 * standard immediately while screens are migrated one by one. Migrated files drop to 0 and stay there.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'src');
const BASELINE = path.join(__dirname, 'design-tokens-baseline.json');
const SPACING_SCALE = new Set([0, 1, 2, 4, 8, 12, 16, 20, 24, 32, 48]);
const SPACING_PROPS = /^(padding|margin|gap|rowGap|columnGap)(Top|Bottom|Left|Right|Horizontal|Vertical|Start|End)?$/;

const RULES = [
  { id: 'color-hex', test: (l) => /#[0-9a-fA-F]{3,8}\b/.test(l.replace(/\/\/.*$/, '')) && !/^\s*(\/\/|\*|\/\*)/.test(l), msg: 'hard-coded hex colour' },
  { id: 'color-rgba', test: (l) => /\brgba?\(/.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l), msg: 'hard-coded rgb()/rgba() colour' },
  { id: 'font-size', test: (l) => /\bfontSize:\s*\d/.test(l), msg: 'raw fontSize - use <Text variant>' },
  { id: 'font-family', test: (l) => /\bfontFamily:\s*['"]/.test(l), msg: 'raw fontFamily - use <Text weight>' },
  { id: 'font-weight', test: (l) => /\bfontWeight:\s*['"]?\d/.test(l) || /\bfontWeight:\s*'(bold|semibold|normal)'/.test(l), msg: 'raw fontWeight - use <Text weight>' },
  {
    id: 'spacing',
    test: (l) => {
      const m = l.match(/\b([a-zA-Z]+):\s*(\d+(?:\.\d+)?)\b/g) ?? [];
      return m.some((pair) => {
        const [key, value] = pair.split(/:\s*/);
        return SPACING_PROPS.test(key) && !SPACING_SCALE.has(Number(value));
      });
    },
    msg: 'off-scale spacing - use spacing tokens',
  },
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

function scan() {
  const result = {};
  const details = [];
  for (const file of walk(ROOT)) {
    const rel = path.relative(path.join(__dirname, '..'), file).split(path.sep).join('/');
    if (rel.startsWith('src/theme/')) continue;
    fs.readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        for (const rule of RULES) {
          if (rule.test(line)) {
            result[rel] = (result[rel] ?? 0) + 1;
            details.push(`${rel}:${i + 1}  [${rule.id}] ${rule.msg}`);
          }
        }
      });
  }
  return { result, details };
}

const args = process.argv.slice(2);
const { result, details } = scan();
const total = Object.values(result).reduce((a, b) => a + b, 0);

if (args.includes('--update')) {
  const sorted = Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(BASELINE, JSON.stringify(sorted, null, 2) + '\n');
  console.log(`Baseline updated: ${total} violations in ${Object.keys(result).length} files.`);
  process.exit(0);
}

if (args.includes('--report')) {
  console.log(details.join('\n'));
  console.log(`\n${total} violations in ${Object.keys(result).length} files.`);
  process.exit(0);
}

const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : {};
const regressions = Object.entries(result).filter(([file, n]) => n > (baseline[file] ?? 0));
if (regressions.length) {
  console.error('New hard-coded design values (use tokens from @/theme):');
  for (const [file, n] of regressions) console.error(`  ${file}: ${n} (baseline ${baseline[file] ?? 0})`);
  console.error('\nRun `npm run lint:tokens -- --report` to see each line.');
  process.exit(1);
}
const baselineTotal = Object.values(baseline).reduce((a, b) => a + b, 0);
console.log(`Design tokens OK: ${total} legacy violations remain (baseline ${baselineTotal}). Migrated files must stay at 0.`);
