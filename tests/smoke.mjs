// Smoke test: opens every page of the Hub in a real browser and fails on any error.
// Run it with: npm test   (first time: npm ci, then npx playwright install chromium)
// The Google Sheet is replaced by fake rows (tests/fixtures/sheet-rows.json),
// so the test needs no internet and never touches real data.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const fail = (msg) => { failures.push(msg); console.log('FAIL  ' + msg); };

// 1. Static checks: every data file is valid JSON, every script in boot.js exists
for (const f of fs.readdirSync(path.join(root, 'data')).filter((n) => n.endsWith('.json'))) {
  try { JSON.parse(fs.readFileSync(path.join(root, 'data', f), 'utf8')); }
  catch (e) { fail('data/' + f + ' is not valid JSON: ' + e.message); }
}
const boot = fs.readFileSync(path.join(root, 'js/boot.js'), 'utf8');
const scripts = [...boot.matchAll(/'((?:js)\/[^']+\.js)'/g)].map((m) => m[1]);
if (scripts.length < 5) fail('could not read the script list from js/boot.js');
for (const s of scripts) if (!fs.existsSync(path.join(root, s))) fail('js/boot.js lists ' + s + ' but the file does not exist');
for (const f of fs.readdirSync(path.join(root, 'js/pages')).map((n) => 'js/pages/' + n).concat(fs.readdirSync(path.join(root, 'js/core')).map((n) => 'js/core/' + n))) {
  if (f.endsWith('.js') && !scripts.includes(f)) fail(f + ' exists but is not listed in js/boot.js');
}

// 2. Tiny static web server for the repository folder
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.txt': 'text/plain' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.resolve(root, '.' + (p === '/' ? '/index.html' : p));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + server.address().port;

// 3. Fake Google Sheet response
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/sheet-rows.json'), 'utf8'));
const sheetBody = 'google.visualization.Query.setResponse(' + JSON.stringify({ table: { rows: fixture.rows.map((r) => ({ c: r.map((v) => ({ v })) })) } }) + ');';

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
let where = 'start up';
const isFont = (u) => /fonts\.(googleapis|gstatic)\.com/.test(u);
page.on('pageerror', (e) => fail('[' + where + '] JavaScript error: ' + String(e.message).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error' && !isFont(m.location().url || '')) { const t = m.text(); if (!/Failed to load resource/.test(t)) fail('[' + where + '] console error: ' + t.slice(0, 200)); } });
page.on('requestfailed', (r) => { if (!isFont(r.url())) fail('[' + where + '] request failed: ' + r.url()); });
page.on('response', (r) => { if (r.url().startsWith(base) && r.status() >= 400) fail('[' + where + '] HTTP ' + r.status() + ' for ' + r.url().replace(base, '')); });
await page.route('**/*', (route) => {
  const u = route.request().url();
  if (u.includes('docs.google.com')) return route.fulfill({ status: 200, contentType: 'text/plain', body: sheetBody });
  if (isFont(u)) return route.abort();
  return route.continue();
});

let views = 0;
try {
await page.goto(base + '/index.html');
await page.waitForFunction(() => typeof window.setHubMode === 'function' && document.querySelectorAll('#sb-nav .nav-tab').length > 0, null, { timeout: 15000 })
  .catch(() => fail('the Hub did not start (no menu after 15 seconds)'));
await page.waitForTimeout(1500);

const data = await page.evaluate(() => Object.keys(window.HUB_DATA || {}));
for (const k of ['shared', 'observedRates', 'journeys']) if (!data.includes(k)) fail('HUB_DATA.' + k + ' is missing');

async function visit(tag) {
  where = tag; views += 1;
  await page.waitForTimeout(600);
  const text = await page.evaluate(() => { const p = document.querySelector('.page.active'); return p ? p.innerText : ''; });
  if (text.trim().length < 20) fail('[' + tag + '] the page is empty');
  if (/Could not load|could not start/i.test(text)) fail('[' + tag + '] the page shows a load error: ' + text.slice(0, 80).replace(/\s+/g, ' '));
}
async function crawl(prefix) {
  const n = await page.locator('#sb-nav .nav-tab').count();
  for (let i = 0; i < n; i++) {
    const el = page.locator('#sb-nav .nav-tab').nth(i);
    const id = (await el.getAttribute('data-tab')) || String(i);
    where = prefix + ' ' + id;
    await el.evaluate((e) => e.click());
    await visit(prefix + ' ' + id);
  }
}
for (const mode of ['explore', 'tools', 'activation']) {
  await page.evaluate((m) => window.setHubMode(m), mode); await page.waitForTimeout(400);
  await crawl('Ria B&M ' + mode);
}
await page.evaluate(() => { window.setHubMode('explore'); window.setStructuralAudience('digital'); }); await page.waitForTimeout(600);
await crawl('Ria Digital');
await page.evaluate(() => window.setBrand('xe')); await page.waitForTimeout(600);
await crawl('Xe explore');
for (const mode of ['tools', 'activation']) { await page.evaluate((m) => window.setHubMode(m), mode); await visit('Xe ' + mode); }

} catch (e) {
  fail('the test stopped early: ' + String(e.message).split('\n')[0].slice(0, 200));
} finally {
  await browser.close(); server.close();
}
console.log('\nChecked ' + views + ' views, ' + scripts.length + ' script files.');
if (failures.length) { console.log(failures.length + ' problem(s) found.'); process.exit(1); }
console.log('All good.');
