#!/usr/bin/env node
/**
 * Flags user-visible English written straight into components instead of coming from the translation catalog.
 * It parses every .tsx file (TypeScript AST, so multi-line JSX is handled) and reports:
 *   - text inside JSX:                 <Text>Save changes</Text>
 *   - string props that users read:    title="Save", placeholder="Search", accessibilityLabel="Close"
 *   - string arguments to notify calls: notify.success('Saved'), notify.confirm({ title: 'Delete?' })
 *
 *   npm run lint:i18n                 fail if any file has MORE violations than scripts/i18n-baseline.json
 *   npm run lint:i18n -- --update     rewrite the baseline (counts may only go down)
 *   npm run lint:i18n -- --report     list every violation
 *
 * Fix a violation by adding the string to src/i18n/locales/en/<namespace>.json and reading it with
 * `const { t } = useTranslation('<namespace>')`.
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const BASELINE = path.join(__dirname, 'i18n-baseline.json');

// Props whose string value is shown to (or announced to) the user.
const TEXT_PROPS = new Set([
  'title', 'label', 'placeholder', 'subtitle', 'description', 'message', 'helper', 'error', 'hint',
  'accessibilityLabel', 'accessibilityHint', 'badgeLabel', 'actionLabel', 'actionTitle', 'secondaryActionTitle',
  'confirmLabel', 'cancelLabel', 'okLabel', 'retryLabel', 'removeLabel', 'cancelLabel', 'backLabel', 'eyebrow',
]);
// notify.<fn>('literal') and notify.<fn>({ title/message: 'literal' })
const NOTIFY_FNS = new Set(['success', 'error', 'info', 'warning', 'toast', 'confirm', 'alert', 'critical', 'banner']);
const NOTIFY_KEYS = new Set(['title', 'message', 'confirmLabel', 'cancelLabel', 'okLabel']);
// Skipped files: the catalog itself, tokens, the gallery (developer-only), tests.
const SKIP = [/^src\/i18n\//, /^src\/theme\//, /^src\/app\/\(app\)\/dev\//];

const hasWords = (text) => /[A-Za-z]{2,}/.test(text);
// "1", "OK"-like, units, symbols and format strings are not translatable copy
const looksLikeCopy = (text) => hasWords(text.trim()) && !/^[#@/._:\-A-Z0-9 ]+$/.test(text.trim());

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx$/.test(entry.name)) out.push(full);
  }
  return out;
}

function scan() {
  const result = {};
  const details = [];
  for (const file of walk(SRC)) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    if (SKIP.some((re) => re.test(rel))) continue;
    const source = fs.readFileSync(file, 'utf8');
    const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const add = (node, kind, text) => {
      const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
      result[rel] = (result[rel] ?? 0) + 1;
      details.push(`${rel}:${line + 1}  [${kind}] ${JSON.stringify(text.trim().slice(0, 60))}`);
    };

    const visit = (node) => {
      if (ts.isJsxText(node) && looksLikeCopy(node.text)) add(node, 'jsx-text', node.text);

      if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
        const name = node.name.getText(sf);
        if (TEXT_PROPS.has(name) && looksLikeCopy(node.initializer.text)) add(node, `prop ${name}`, node.initializer.text);
      }
      // {'literal'} inside JSX or a text prop: <Text>{'Save'}</Text>, title={'Save'}
      if (ts.isJsxExpression(node) && node.expression && ts.isStringLiteral(node.expression) && looksLikeCopy(node.expression.text)) {
        const parent = node.parent;
        const inTextProp = ts.isJsxAttribute(parent) && TEXT_PROPS.has(parent.name.getText(sf));
        if (!ts.isJsxAttribute(parent) || inTextProp) add(node, 'jsx-string', node.expression.text);
      }

      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && NOTIFY_FNS.has(node.expression.name.text)) {
        const owner = node.expression.expression.getText(sf);
        if (/notify$/i.test(owner)) {
          for (const arg of node.arguments) {
            if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) {
              if (looksLikeCopy(arg.text)) add(arg, `notify.${node.expression.name.text}`, arg.text);
            } else if (ts.isObjectLiteralExpression(arg)) {
              for (const prop of arg.properties) {
                if (
                  ts.isPropertyAssignment(prop) &&
                  NOTIFY_KEYS.has(prop.name.getText(sf)) &&
                  (ts.isStringLiteral(prop.initializer) || ts.isNoSubstitutionTemplateLiteral(prop.initializer)) &&
                  looksLikeCopy(prop.initializer.text)
                ) {
                  add(prop, `notify.${node.expression.name.text}.${prop.name.getText(sf)}`, prop.initializer.text);
                }
              }
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return { result, details };
}

const args = process.argv.slice(2);
const { result, details } = scan();
const total = Object.values(result).reduce((a, b) => a + b, 0);

if (args.includes('--update')) {
  const sorted = Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(BASELINE, JSON.stringify(sorted, null, 2) + '\n');
  console.log(`i18n baseline updated: ${total} hard-coded strings in ${Object.keys(result).length} files.`);
  process.exit(0);
}
if (args.includes('--report')) {
  console.log(details.join('\n'));
  console.log(`\n${total} hard-coded strings in ${Object.keys(result).length} files.`);
  process.exit(0);
}

const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : {};
const regressions = Object.entries(result).filter(([file, n]) => n > (baseline[file] ?? 0));
if (regressions.length) {
  console.error('New hard-coded user-visible strings (move them to src/i18n/locales/en and use t()):');
  for (const [file, n] of regressions) console.error(`  ${file}: ${n} (baseline ${baseline[file] ?? 0})`);
  console.error('\nRun `npm run lint:i18n -- --report` to see each line.');
  process.exit(1);
}
const baselineTotal = Object.values(baseline).reduce((a, b) => a + b, 0);
console.log(`i18n OK: ${total} hard-coded strings remain (baseline ${baselineTotal}).`);
