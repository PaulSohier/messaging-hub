// Shared helpers for the tests: a small web server for the repository folder,
// a fake Google Sheet, and a browser page with the Hub open.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.txt': 'text/plain' };
const isFont = (u) => /fonts\.(googleapis|gstatic)\.com/.test(u);

export async function startServer() {
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.resolve(root, '.' + (p === '/' ? '/index.html' : p));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { server, base: 'http://127.0.0.1:' + server.address().port };
}

// The fake sheet answers like Google does (gviz format)
export function fixtureSheetBody() {
  const fixture = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/sheet-rows.json'), 'utf8'));
  return 'google.visualization.Query.setResponse(' + JSON.stringify({ table: { rows: fixture.rows.map((r) => ({ c: r.map((v) => ({ v })) })) } }) + ');';
}

// sheet: 'fixture' = fake rows (default), 'fail' = the sheet cannot be reached (the Hub then uses its built-in values)
export async function openHub({ base, sheet = 'fixture' }) {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const problems = [];
  const state = { where: 'start up' };
  const note = (msg) => { problems.push(msg); console.log('FAIL  ' + msg); };
  page.on('pageerror', (e) => note('[' + state.where + '] JavaScript error: ' + String(e.message).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error' && !isFont(m.location().url || '') && !/Failed to load resource/.test(m.text())) note('[' + state.where + '] console error: ' + m.text().slice(0, 200)); });
  page.on('requestfailed', (r) => { if (!isFont(r.url()) && !(sheet === 'fail' && r.url().includes('docs.google.com'))) note('[' + state.where + '] request failed: ' + r.url()); });
  page.on('response', (r) => { if (r.url().startsWith(base) && r.status() >= 400) note('[' + state.where + '] HTTP ' + r.status() + ' for ' + r.url().replace(base, '')); });
  const body = fixtureSheetBody();
  await page.route('**/*', (route) => {
    const u = route.request().url();
    if (u.includes('docs.google.com')) return sheet === 'fail' ? route.abort() : route.fulfill({ status: 200, contentType: 'text/plain', body });
    if (isFont(u)) return route.abort();
    return route.continue();
  });
  await page.goto(base + '/index.html');
  await page.waitForFunction(() => typeof window.setHubMode === 'function' && document.querySelectorAll('#sb-nav .nav-tab').length > 0, null, { timeout: 15000 })
    .catch(() => note('the Hub did not start (no menu after 15 seconds)'));
  await page.waitForTimeout(1500);
  return { page, browser, problems, state, note };
}
