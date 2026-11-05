#!/usr/bin/env node
/**
 * Draws the app's illustrations to PNG so they can be looked at without a phone.
 *
 *   npm run render:art                 render every scene
 *   npm run render:art -- home fitness render only scenes whose name contains one of the words
 *
 * Output goes to mobile/.art-preview/<scene>.png (git-ignored): one sheet per scene, light on the left and dark on the
 * right (on the app's real background colours), one row per variant.
 *
 * How it works: scenes are pure SVG components (src/illustrations). This script compiles them with the TypeScript
 * compiler, swaps `react-native-svg` for plain SVG tags, renders to markup with react-dom/server and rasterises with
 * resvg. It never starts React Native.
 */
const fs = require('fs');
const Module = require('module');
const path = require('path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { Resvg } = require('@resvg/resvg-js');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, '.art-preview');
const SHIM_ID = path.join(__dirname, '__react-native-svg-shim__.js');

// --- react-native-svg -> plain SVG tags ------------------------------------------------------------------------------
const TAGS = {
  Svg: 'svg', G: 'g', Path: 'path', Circle: 'circle', Ellipse: 'ellipse', Rect: 'rect', Line: 'line', Polygon: 'polygon',
  Polyline: 'polyline', Defs: 'defs', LinearGradient: 'linearGradient', RadialGradient: 'radialGradient', Stop: 'stop',
  ClipPath: 'clipPath', Mask: 'mask', Pattern: 'pattern', Use: 'use', Symbol: 'symbol', Text: 'text', TSpan: 'tspan',
};
const shim = { __esModule: true };
for (const [name, tag] of Object.entries(TAGS)) {
  shim[name] = (props) => React.createElement(tag, tag === 'svg' ? { xmlns: 'http://www.w3.org/2000/svg', ...props } : props);
}
shim.default = shim.Svg;
const shimModule = new Module(SHIM_ID);
shimModule.filename = SHIM_ID;
shimModule.loaded = true;
shimModule.exports = shim;
Module._cache[SHIM_ID] = shimModule;

const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === 'react-native-svg') return SHIM_ID;
  if (request.startsWith('@/')) request = path.join(SRC, request.slice(2));
  return resolve.call(this, request, ...rest);
};

// --- compile .ts / .tsx on the fly -----------------------------------------------------------------------------------
for (const ext of ['.ts', '.tsx']) {
  Module._extensions[ext] = (module, filename) => {
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      fileName: filename,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    });
    module._compile(outputText, filename);
  };
}

const { SCENES } = require(path.join(SRC, 'illustrations', 'registry'));
const { scenePalette } = require(path.join(SRC, 'illustrations', 'palette'));
const { neutral, categoryRamps } = require(path.join(SRC, 'theme', 'colors'));

// --- render ----------------------------------------------------------------------------------------------------------
const WIDTH = 640;
const GAP = 24;
const filters = process.argv.slice(2).map((w) => w.toLowerCase());
const names = Object.keys(SCENES).filter((n) => !filters.length || filters.some((f) => n.toLowerCase().includes(f)));
if (!names.length) {
  console.log('No scenes registered (or none match). Register scenes in src/illustrations/registry.heroes.ts / registry.spot.ts.');
  process.exit(0);
}
fs.mkdirSync(OUT, { recursive: true });

let cellCounter = 0;

/** Gradient / clip ids repeat between cells (every scene instance asks React for the same first id), so give each cell its own. */
function uniqueIds(markup, prefix) {
  return markup
    .replace(/\bid="([^"]+)"/g, (_, id) => `id="${prefix}${id}"`)
    .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${prefix}${id})`)
    .replace(/(xlink:)?href="#([^"]+)"/g, (_, ns, id) => `${ns ?? ''}href="#${prefix}${id}"`);
}

function layerMarkup(def, width, height, p, variant) {
  const prefix = `c${cellCounter++}-`;
  return def.layers
    .map((layer, i) => uniqueIds(renderToStaticMarkup(React.createElement(layer.Component, { width, height, p, variant })), `${prefix}${i}-`))
    .join('');
}

let failed = 0;
for (const name of names) {
  const def = SCENES[name];
  const variants = def.variants?.length ? def.variants : [undefined];
  const h = Math.round(WIDTH / def.aspect);
  // Scene names are `<moduleKey>-<what>` (e.g. finance-hero): the prefix picks the accent, anything else uses the brand accent.
  const prefix = name.split('-')[0];
  const accent = categoryRamps[prefix] ? prefix : 'ai';
  const cells = [];
  variants.forEach((variant, row) => {
    ['light', 'dark'].forEach((scheme, col) => {
      let inner;
      try {
        inner = layerMarkup(def, WIDTH, h, scenePalette(scheme, accent), variant);
      } catch (e) {
        console.error(`FAIL ${name}${variant ? ' / ' + variant : ''} (${scheme}): ${e.message}`);
        failed++;
        return;
      }
      const x = col * (WIDTH + GAP) + GAP;
      const y = row * (h + GAP) + GAP;
      const bg = scheme === 'dark' ? neutral[950] : neutral[50];
      cells.push(`<rect x="${x - 8}" y="${y - 8}" width="${WIDTH + 16}" height="${h + 16}" fill="${bg}"/><g transform="translate(${x},${y})">${inner}</g>`);
    });
  });
  const sheetW = 2 * (WIDTH + GAP) + GAP;
  const sheetH = variants.length * (h + GAP) + GAP;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetW}" height="${sheetH}" viewBox="0 0 ${sheetW} ${sheetH}"><rect width="${sheetW}" height="${sheetH}" fill="${neutral[400]}"/>${cells.join('')}</svg>`;
  try {
    const png = new Resvg(svg, { fitTo: { mode: 'original' }, font: { loadSystemFonts: false } }).render().asPng();
    const file = path.join(OUT, `${name.replace(/[^a-z0-9-_]/gi, '_')}.png`);
    fs.writeFileSync(file, png);
    fs.writeFileSync(file.replace(/\.png$/, '.svg'), svg);
    console.log(`ok   ${name.padEnd(28)} ${variants.length} variant(s) -> ${path.relative(ROOT, file)}`);
  } catch (e) {
    console.error(`FAIL ${name}: ${e.message}`);
    failed++;
  }
}
process.exit(failed ? 1 : 0);
