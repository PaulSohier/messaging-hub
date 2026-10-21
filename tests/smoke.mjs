// Smoke test: opens every page of the Hub in a real browser and fails on any error.
// Run it with: npm run test:smoke   (first time: npm ci, then npx playwright install chromium)
// The Google Sheet is replaced by fake rows (tests/fixtures/sheet-rows.json),
// so the test needs no internet and never touches real data.
import fs from 'node:fs';
import path from 'node:path';
import { root, startServer, openHub } from './lib.mjs';

let problems = 0;
const fail = (msg) => { problems += 1; console.log('FAIL  ' + msg); };

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

// 2. Open the Hub and visit every view
const { server, base } = await startServer();
const hub = await openHub({ base });
const { page, state } = hub;
let views = 0;
try {
  const data = await page.evaluate(() => Object.keys(window.HUB_DATA || {}));
  for (const k of ['shared', 'observedRates', 'journeys']) if (!data.includes(k)) fail('HUB_DATA.' + k + ' is missing');

  const visit = async (tag) => {
    state.where = tag; views += 1;
    await page.waitForTimeout(600);
    const text = await page.evaluate(() => { const p = document.querySelector('.page.active'); return p ? p.innerText : ''; });
    if (text.trim().length < 20) fail('[' + tag + '] the page is empty');
    if (/Could not load|could not start/i.test(text)) fail('[' + tag + '] the page shows a load error: ' + text.slice(0, 80).replace(/\s+/g, ' '));
  };
  const crawl = async (prefix) => {
    const n = await page.locator('#sb-nav .nav-tab').count();
    for (let i = 0; i < n; i++) {
      const el = page.locator('#sb-nav .nav-tab').nth(i);
      const id = (await el.getAttribute('data-tab')) || String(i);
      state.where = prefix + ' ' + id;
      await el.evaluate((e) => e.click());
      await visit(prefix + ' ' + id);
    }
  };
  for (const mode of ['explore', 'tools', 'activation']) {
    await page.evaluate((m) => window.setHubMode(m), mode); await page.waitForTimeout(400);
    await crawl('Ria B&M ' + mode);
  }
  await page.evaluate(() => { window.setHubMode('explore'); window.setStructuralAudience('digital'); }); await page.waitForTimeout(600);
  await crawl('Ria Digital');
  await page.evaluate(() => window.setBrand('xe')); await page.waitForTimeout(600);
  await crawl('Xe explore');
  for (const mode of ['tools', 'activation']) { await page.evaluate((m) => window.setHubMode(m), mode); await visit('Xe ' + mode); }

  // Every page has the same header: one h1 title, no grey note, and a status badge only where it makes sense
  state.where = 'page header';
  const heads = await page.evaluate(() => Array.from(document.querySelectorAll('.page')).map((p) => ({
    id: p.id, h1: p.querySelectorAll(':scope > .page-head > h1.page-title').length, notes: p.querySelectorAll('.page-note').length,
  })));
  for (const h of heads) {
    if (h.h1 !== 1) fail('[' + h.id + '] the page needs exactly one header with an h1 title (.page-head > h1.page-title), found ' + h.h1);
    if (h.notes) fail('[' + h.id + '] has a grey page note; use the status badge or the page content instead');
  }
  const badge = (id) => page.evaluate((id) => { const b = document.querySelector('#' + id + ' .hub-status'); return b ? b.className.replace('hub-status ', '').replace('hub-status--', '') : null; }, id);
  const show = async (mode, i) => { await page.evaluate((m) => window.setHubMode(m), mode); await page.waitForTimeout(300); await page.locator('#sb-nav .nav-tab').nth(i).evaluate((e) => e.click()); await page.waitForTimeout(600); };
  await page.evaluate(() => { window.setBrand('ria'); window.setHubMode('explore'); }); await page.waitForTimeout(400);
  if (await badge('p0') !== 'ok') fail('[p0] the Messages Library badge should be green when the sheet is synced, it is ' + await badge('p0'));
  await show('tools', 1);
  const costBadge = await badge('p11');
  if (costBadge !== 'ok') fail('[p11] the cost page badge should be green when synced, it is ' + costBadge);
  if (await badge('p3') !== null) fail('[p3] the older cost pages should have no badge');
} catch (e) {
  fail('the test stopped early: ' + String(e.message).split('\n')[0].slice(0, 200));
} finally {
  await hub.browser.close();
}

// When the sheet cannot be reached the badge must be red, with no hover box. The badges that have details (data dates) must open DOWNWARD and stay on screen.
{
  const off = await openHub({ base, sheet: 'fail' });
  try {
    off.state.where = 'offline badge';
    const status = await off.page.evaluate(() => { const b = document.querySelector('.page.active .hub-status'); return { cls: b ? b.className : '', tips: document.querySelectorAll('.page.active .hub-status-tip').length }; });
    if (!/hub-status--error/.test(status.cls)) fail('[offline] the badge should be red when the Messages Library cannot be reached, found "' + status.cls + '"');
    if (status.tips) fail('[offline] the Messages Library badge should have no hover box');
    off.state.where = 'badge hover';
    await off.page.evaluate(() => { window.setHubMode('explore'); window.setStructuralAudience('digital'); });
    await off.page.waitForTimeout(400);
    await off.page.locator('#sb-nav .nav-tab').nth(2).evaluate((e) => e.click());
    await off.page.waitForSelector('.page.active .hub-status-tip', { state: 'attached', timeout: 5000 });
    await off.page.hover('.page.active .hub-status-pill'); await off.page.waitForTimeout(300);
    const box = await off.page.evaluate(() => {
      const a = document.querySelector('.page.active'); const pill = a.querySelector('.hub-status-pill').getBoundingClientRect(); const tip = a.querySelector('.hub-status-tip');
      const t = tip.getBoundingClientRect(); return { pillBottom: pill.bottom, tipTop: t.top, left: t.left, right: t.right, visible: getComputedStyle(tip).visibility === 'visible', width: window.innerWidth };
    });
    if (!box.visible) fail('[badge hover] the badge details do not open on hover');
    if (box.tipTop < box.pillBottom) fail('[badge hover] the badge details open upward, they must open downward');
    if (box.left < 0 || box.right > box.width) fail('[badge hover] the badge details run off the screen');
  } catch (e) { fail('[offline] the test stopped early: ' + String(e.message).split('\n')[0].slice(0, 200)); }
  finally { await off.browser.close(); }
  problems += off.problems.length;
}
server.close();
problems += hub.problems.length;
console.log('\nChecked ' + views + ' views, ' + scripts.length + ' script files.');
if (problems) { console.log(problems + ' problem(s) found.'); process.exit(1); }
console.log('All good.');
