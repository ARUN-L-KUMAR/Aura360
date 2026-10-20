#!/usr/bin/env node
/**
 * Developer-only visual preview: renders the REAL app screens, with sample data, through react-native-web in headless
 * Chrome and writes phone-sized PNG screenshots, so the UI can be judged without a phone or an emulator.
 *
 *   npm run preview:web                                   every default screen, dark
 *   npm run preview:web -- home finance --scheme light    some screens (names or route fragments), light
 *   npm run preview:web -- finance --scheme both          light and dark
 *   npm run preview:web -- /finance/budget                any route path
 *
 * Options
 *   --scheme light|dark|both   colour scheme (default dark)
 *   --height 1800              screenshot height in CSS px (default 844); use it for long screens
 *   --width 390                screenshot width in CSS px (default 390)
 *   --wait 15000               virtual milliseconds Chrome waits for the screen to settle (default 15000)
 *   --skip-export              reuse the last export in .preview/web (faster when only the screens list changed)
 *   --logs                     print the page's console messages (find out why a screen is blank)
 *
 * Output: .preview/screens/<route-name>-<scheme>.png  (git-ignored). The export is a normal `expo export --platform web`
 * with EXPO_PUBLIC_PREVIEW=1, which signs the app in as a sample user and answers its API calls with sample data
 * (src/preview). Without that flag the app behaves exactly as in production.
 *
 * Nothing is installed: it needs Node, the project's own dependencies and Google Chrome (set CHROME_PATH if Chrome is
 * somewhere unusual).
 */
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PREVIEW_DIR = path.join(ROOT, '.preview');
const WEB_DIR = path.join(PREVIEW_DIR, 'web');
const SCREENS_DIR = path.join(PREVIEW_DIR, 'screens');

/** name -> route. A name that is not here can still be given as a route path (/finance/budget). */
const ROUTES = {
  home: '/',
  finance: '/finance',
  fitness: '/fitness',
  food: '/food',
  fashion: '/fashion',
  skincare: '/skincare',
  notes: '/notes',
  saved: '/saved',
  time: '/time',
  ai: '/ai',
  settings: '/settings',
  notifications: '/notifications',
  search: '/search',
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.map': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function parseArgs(argv) {
  const options = { scheme: 'dark', height: 844, width: 390, wait: 15000, skipExport: false, logs: false, names: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = () => {
      const next = argv[++i];
      if (next === undefined) fail(`${arg} needs a value`);
      return next;
    };
    if (arg === '--scheme') options.scheme = value();
    else if (arg === '--height') options.height = Number(value());
    else if (arg === '--width') options.width = Number(value());
    else if (arg === '--wait') options.wait = Number(value());
    else if (arg === '--skip-export') options.skipExport = true;
    else if (arg === '--logs') options.logs = true;
    else if (arg === '--help' || arg === '-h') {
      console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^#!.*\n/, ''));
      process.exit(0);
    } else if (arg.startsWith('--')) fail(`Unknown option ${arg}`);
    else options.names.push(arg);
  }
  if (!['light', 'dark', 'both'].includes(options.scheme)) fail('--scheme must be light, dark or both');
  for (const key of ['height', 'width', 'wait']) if (!Number.isFinite(options[key]) || options[key] <= 0) fail(`--${key} must be a positive number`);
  return options;
}

function fail(message) {
  console.error(`preview:web: ${message}`);
  process.exit(1);
}

/** The screens to shoot: [{ name, route }]. Names and fragments match route names and paths; "/x/y" is used as given. */
function pickScreens(names) {
  if (names.length === 0) return Object.entries(ROUTES).map(([name, route]) => ({ name, route }));
  const picked = new Map();
  for (const wanted of names) {
    if (wanted.startsWith('/')) {
      // Name = path plus query, so /finance?section=ledger and /finance?section=budgets get separate screenshots.
      const name =
        wanted
          .replace(/^\/|\/$/g, '')
          .replace(/[^a-zA-Z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') || 'home';
      picked.set(name, { name, route: wanted });
      continue;
    }
    const needle = wanted.toLowerCase();
    const exact = Object.entries(ROUTES).filter(([name]) => name === needle);
    const found = exact.length ? exact : Object.entries(ROUTES).filter(([name, route]) => name.includes(needle) || route.includes(needle));
    if (found.length === 0) fail(`No screen matches "${wanted}". Known: ${Object.keys(ROUTES).join(', ')} (or give a route path such as /finance/budget)`);
    for (const [name, route] of found) picked.set(name, { name, route });
  }
  return [...picked.values()];
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) fail(`Google Chrome was not found. Install it or set CHROME_PATH. Looked in:\n  ${candidates.join('\n  ')}`);
  return found;
}

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: process.platform === 'win32', ...options });
    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`))));
  });
}

async function exportWeb() {
  console.log('Exporting the web build with sample data (EXPO_PUBLIC_PREVIEW=1)...');
  fs.rmSync(WEB_DIR, { recursive: true, force: true });
  await run('npx', ['expo', 'export', '--platform', 'web', '--output-dir', WEB_DIR], {
    cwd: ROOT,
    env: { ...process.env, EXPO_PUBLIC_PREVIEW: '1', CI: '1', EXPO_NO_TELEMETRY: '1' },
  });
  if (!fs.existsSync(path.join(WEB_DIR, 'index.html'))) throw new Error('The export finished but .preview/web/index.html is missing');
}

const escapeHtml = (text) => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Static files from the export, SPA fallback to index.html, and /__frame: the app inside an exactly phone-sized iframe. */
function startServer() {
  const server = http.createServer((req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/__frame') {
        const w = Number(url.searchParams.get('w')) || 390;
        const h = Number(url.searchParams.get('h')) || 844;
        const p = url.searchParams.get('p') || '/';
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(
          `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#222"><iframe src="${escapeHtml(p)}" style="border:0;width:${w}px;height:${h}px;display:block"></iframe></body>`,
        );
        return;
      }
      let file = path.join(WEB_DIR, decodeURIComponent(url.pathname));
      if (!file.startsWith(WEB_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(WEB_DIR, 'index.html');
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    } catch (error) {
      res.writeHead(500);
      res.end(String(error));
    }
  });
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function shoot({ chrome, port, route, scheme, width, height, wait, file, logs }) {
  const page = `${route}${route.includes('?') ? '&' : '?'}scheme=${scheme}`;
  const url = `http://127.0.0.1:${port}/__frame?p=${encodeURIComponent(page)}&w=${width}&h=${height}`;
  // A fresh profile per shot: nothing left over from an earlier screen (storage, caches).
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'aura-preview-'));
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--force-device-scale-factor=2',
    // Headless Chrome does not run requestAnimationFrame-driven animations (count-ups, rings) to the end under virtual
    // time, so the screens would be photographed at zero. Reduced motion makes the app jump to the final values.
    '--force-prefers-reduced-motion',
    `--user-data-dir=${profile}`,
    `--window-size=${width},${height}`,
    `--virtual-time-budget=${wait}`,
    `--screenshot=${file}`,
    ...(logs ? ['--enable-logging=stderr', '--v=0'] : []),
    url,
  ];
  return new Promise((resolve) => {
    const child = spawn(chrome, args, { stdio: ['ignore', 'ignore', logs ? 'pipe' : 'ignore'] });
    let output = '';
    if (logs) child.stderr.on('data', (chunk) => (output += chunk));
    const timer = setTimeout(() => child.kill(), wait + 90_000);
    const done = (ok) => {
      clearTimeout(timer);
      try {
        fs.rmSync(profile, { recursive: true, force: true });
      } catch {
        // A locked temp folder is not worth failing for.
      }
      if (logs) {
        const lines = output.split('\n').filter((line) => /CONSOLE|Uncaught|ERROR:CONSOLE/.test(line));
        if (lines.length) console.log(lines.map((line) => `    ${line.trim()}`).join('\n'));
      }
      resolve(ok && fs.existsSync(file));
    };
    child.on('error', () => done(false));
    child.on('exit', (code) => done(code === 0));
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const screens = pickScreens(options.names);
  const schemes = options.scheme === 'both' ? ['light', 'dark'] : [options.scheme];
  const chrome = findChrome();

  if (options.skipExport) {
    if (!fs.existsSync(path.join(WEB_DIR, 'index.html'))) fail('--skip-export needs an earlier export: run once without it');
  } else {
    await exportWeb();
  }

  fs.mkdirSync(SCREENS_DIR, { recursive: true });
  const server = await startServer();
  const stop = () => server.close();
  process.on('SIGINT', () => {
    stop();
    process.exit(130);
  });

  const written = [];
  const failed = [];
  try {
    const port = server.address().port;
    console.log(`Serving the export on port ${port}; taking ${screens.length * schemes.length} screenshot(s) with ${chrome}`);
    for (const screen of screens) {
      for (const scheme of schemes) {
        const file = path.join(SCREENS_DIR, `${screen.name}-${scheme}.png`);
        fs.rmSync(file, { force: true });
        const ok = await shoot({ chrome, port, route: screen.route, scheme, width: options.width, height: options.height, wait: options.wait, file, logs: options.logs });
        (ok ? written : failed).push(file);
        console.log(`${ok ? 'ok    ' : 'FAILED'} ${file}`);
      }
    }
  } finally {
    stop();
    server.closeAllConnections?.();
  }

  console.log(`\n${written.length} screenshot(s) written to ${SCREENS_DIR}`);
  if (failed.length) {
    console.error(`${failed.length} failed: ${failed.join(', ')}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`preview:web: ${error.message}`);
  process.exit(1);
});
