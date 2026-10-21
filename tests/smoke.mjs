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
  const view = () => page.evaluate(() => ({ url: location.pathname + location.search, active: (document.querySelector('.page.active') || {}).id, title: document.title }));
  const open = async (q) => { await page.goto(base + '/index.html' + q); await page.waitForFunction(() => typeof window.setHubMode === 'function' && document.querySelectorAll('#sb-nav .nav-tab').length > 0, null, { timeout: 15000 }); await page.waitForTimeout(700); };
  await page.evaluate(() => { window.setBrand('ria'); window.setHubMode('explore'); }); await page.waitForTimeout(400);
  if (await badge('p0') !== 'ok') fail('[p0] the Messages Library badge should be green when the sheet is synced, it is ' + await badge('p0'));
  await open('?page=iterable-migration');
  const costBadge = await badge('p11');
  if (costBadge !== 'ok') fail('[p11] the cost page badge should be green when synced, it is ' + costBadge);
  await open('?page=sms-costs');
  if (await badge('p3') !== null) fail('[p3] the older cost pages should have no badge');
  await open('?page=cost-calculator');
  if (await badge('p15') !== 'ok') fail('[p15] the Cost calculator badge should be green when synced, it is ' + await badge('p15'));
  await open('?page=fx-client-activations');
  if (await badge('p12') !== 'ok') fail('[p12] the FX Client Activations badge should be green when synced, it is ' + await badge('p12'));

  // Pages that are not in the menu must still open by link and work
  for (const slug of ['full-opt-in-impact', 'iterable-migration', 'sms-costs', 'twilio-sms-calculator', 'global-deployment-cost', 'global-deployment-twilio', 'opt-in-by-journey']) {
    state.where = 'hidden page ' + slug;
    await open('?page=' + slug); views += 1;
    const text = await page.evaluate(() => { const p = document.querySelector('.page.active'); return p ? p.innerText : ''; });
    if (text.trim().length < 20) fail('[' + slug + '] the page is empty when opened by link');
    const inMenu = await page.evaluate(() => document.querySelectorAll('#sb-nav .nav-tab.active').length);
    if (inMenu) fail('[' + slug + '] this page should not be in the menu');
  }

  // Menus: Costs and Activation show what we decided
  state.where = 'menus';
  const menu = async (mode) => { await page.evaluate((m) => window.setHubMode(m), mode); await page.waitForTimeout(300); return page.evaluate(() => Array.from(document.querySelectorAll('#sb-nav .nav-tab')).map((a) => a.dataset.tab)); };
  await open('');
  const costsMenu = await menu('tools'), actMenu = await menu('activation');
  if (JSON.stringify(costsMenu) !== JSON.stringify(['p15', 'p7'])) fail('[menus] the Costs menu should show the Cost calculator and "How we calculate this", it shows ' + JSON.stringify(costsMenu));
  if (JSON.stringify(actMenu) !== JSON.stringify(['p13', 'p14', 'p12'])) fail('[menus] the Activation menu should show the map, the roadmap and FX Client Activations, it shows ' + JSON.stringify(actMenu));

  // Links: every page has its own readable address, Back and Forward work, old links still open
  state.where = 'links';
  const slugs = await page.evaluate(() => Array.from(document.querySelectorAll('.page')).filter((p) => p.id !== 'xe-placeholder').map((p) => ({ id: p.id, slug: (PAGE_META[p.id] || {}).slug })));
  for (const x of slugs) if (!x.slug) fail('[' + x.id + '] has no readable link name in PAGE_META (js/core/deep-links.js)');
  if (new Set(slugs.map((x) => x.slug)).size !== slugs.length) fail('two pages have the same link name in PAGE_META');
  await open('');
  let v = await view();
  if (v.url !== '/index.html') fail('[links] the start page should have a clean address, it is ' + v.url);
  await page.evaluate(() => window.setHubMode('tools')); await page.waitForTimeout(300);
  const hrefs = await page.evaluate(() => Array.from(document.querySelectorAll('#sb-nav .nav-tab')).map((a) => a.tagName + ' ' + a.getAttribute('href')));
  if (!hrefs.length || hrefs.some((h) => !/^A .*\?page=[a-z-]+/.test(h))) fail('[links] every menu item should be a link with its own address, found ' + JSON.stringify(hrefs.slice(0, 3)));
  if (await page.evaluate(() => navLinkClick({ ctrlKey: true }, 'p7', null)) !== true) fail('[links] Ctrl+click on a menu item must open a new tab (the link must not be blocked)');
  v = await view();
  if (!v.url.includes('page=cost-calculator') || v.active !== 'p15') fail('[links] the Costs mode should open the Cost calculator at ?page=cost-calculator, it is ' + v.url + ' (' + v.active + ')');
  await page.evaluate(() => window.setHubMode('activation')); await page.waitForTimeout(300);
  await page.locator('#sb-nav .nav-tab[data-tab="p12"]').evaluate((e) => e.click()); await page.waitForTimeout(500);
  v = await view();
  if (!v.url.includes('page=fx-client-activations') || v.active !== 'p12') fail('[links] opening FX Client Activations should give ?page=fx-client-activations, it is ' + v.url + ' (' + v.active + ')');
  if (!v.title.startsWith('FX Client Activations')) fail('[links] the browser tab title should name the page, it is "' + v.title + '"');
  await page.goBack(); await page.waitForTimeout(600);
  v = await view();
  if (v.active !== 'p13') fail('[links] Back from FX Client Activations should return to the previous page (SMS activation map), it shows ' + v.active + ' at ' + v.url);
  await page.goBack(); await page.waitForTimeout(600);
  v = await view();
  if (v.active !== 'p15') fail('[links] Back should return to the Cost calculator, it shows ' + v.active + ' at ' + v.url);
  await page.goBack(); await page.waitForTimeout(600);
  v = await view();
  if (v.active !== 'p0' || v.url !== '/index.html') fail('[links] Back should return to the start page, it shows ' + v.active + ' at ' + v.url);
  await page.goForward(); await page.waitForTimeout(600);
  v = await view();
  if (v.active !== 'p15') fail('[links] Forward should go to the Cost calculator, it shows ' + v.active);
  await open('?tab=p11');
  v = await view();
  if (v.active !== 'p11' || !v.url.includes('page=iterable-migration') || v.url.includes('tab=')) fail('[links] an old link (?tab=p11) should open the page and turn into the readable link, it is ' + v.url + ' (' + v.active + ')');
  await open('?page=customer-journeys&brand=xe');
  v = await view();
  if (v.active !== 'p2' || !v.url.includes('brand=xe')) fail('[links] a link with brand=xe should open the Xe journeys, it is ' + v.url + ' (' + v.active + ')');
  await open('?page=opt-in-rates&aud=digital');
  v = await view();
  if (v.active !== 'p8' || !v.url.includes('aud=digital')) fail('[links] a link with aud=digital should keep Digital, it is ' + v.url);
  await open('?tab=p1&msg=abc123');
  v = await view();
  if (v.active !== 'p1') fail('[links] an old shared message link (?tab=p1&msg=...) should open the Messages Library, it shows ' + v.active);
  await open('?page=does-not-exist');
  v = await view();
  if (v.active !== 'p0') fail('[links] an unknown page name should open the start page, it shows ' + v.active);
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
