// Cost model test: checks the numbers behind the cost pages against known results.
// Run it with: npm run test:cost
//   Part A: small checks on the calculation functions, using made-up data with answers worked out by hand.
//   Part B: opens the Iterable simulator in a browser and compares what it shows with an independent calculation.
//   Part C: checks the model total in its built-in state against the frozen value in data/clickatell-baseline.json.
// These tests only read the app. They never change how it works.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { root, startServer, openHub } from './lib.mjs';

let failures = 0, checks = 0;
const fail = (msg) => { failures += 1; console.log('FAIL  ' + msg); };
const same = (name, actual, expected) => {
  checks += 1;
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(name + '\n        expected ' + JSON.stringify(expected) + '\n        got      ' + JSON.stringify(actual));
};
const close = (name, actual, expected, tol = 1e-9) => {
  checks += 1;
  if (typeof actual !== 'number' || !(Math.abs(actual - expected) <= tol * Math.max(1, Math.abs(expected)))) fail(name + '\n        expected ' + expected + '\n        got      ' + actual);
};
const yes = (name, cond, detail = '') => { checks += 1; if (!cond) fail(name + (detail ? '\n        ' + detail : '')); };
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));

// ───────────────────────── Part A: calculation functions ─────────────────────────
// The real script files are loaded in an isolated context, so no browser is needed.
function load(observedRates) {
  const ctx = vm.createContext({ HUB_DATA: { observedRates } });
  ctx.window = ctx;
  for (const f of ['js/core/sheet-sync.js', 'js/core/observed-rates.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
  return { ctx, ev: (code) => vm.runInContext(code, ctx) };
}
const row = (channel, country, event, len) => ({ 'Channel': channel, 'Country to': country, 'Event that triggers the message send': event, 'Message': len === undefined ? '' : 'x'.repeat(len) });

// A1. Billing units, 160 characters per unit
{
  const { ctx, ev } = load(readJson('data/observed-2026-rates.json'));
  const rows = [
    row('SMS', 'United States', 'E160', 160), row('SMS', 'United States', 'E161', 161),
    row('SMS', 'United States', 'E320', 320), row('SMS', 'United States', 'E321', 321),
    // the most common value wins
    row('SMS', 'United States', 'Mode', 100), row('SMS', 'United States', 'Mode', 100), row('SMS', 'United States', 'Mode', 200),
    row('SMS', 'United States', 'Mode2', 200), row('SMS', 'United States', 'Mode2', 200), row('SMS', 'United States', 'Mode2', 100),
    // a tie takes the lower value (2 units and 3 units)
    row('SMS', 'United States', 'Tie', 200), row('SMS', 'United States', 'Tie', 300),
    // an empty message gives no units, but the event is still live
    row('SMS', 'United States', 'Empty', 0),
    // other countries never decide the units
    row('SMS', 'United States', 'UsOnly', 100), row('SMS', 'Canada', 'UsOnly', 400),
    // not SMS, or incomplete, or messy spacing
    row('Email', 'France', 'EmailEvent', 500), row('SMS', '', 'NoCountry', 50), row('SMS', 'France', '', 50),
    row('  sms ', '  Spain ', '  Spaced  ', 50),
  ];
  const ok = ctx.libSync(rows);
  yes('libSync returns true when SMS rows exist', ok === true);
  const units = ev('LIB.units');
  same('160 characters = 1 unit', units.E160, 1);
  same('161 characters = 2 units', units.E161, 2);
  same('320 characters = 2 units', units.E320, 2);
  same('321 characters = 3 units', units.E321, 3);
  same('most common unit wins (1,1,2)', units.Mode, 1);
  same('most common unit wins (2,2,1)', units.Mode2, 2);
  same('a tie takes the lower unit (2 and 3)', units.Tie, 2);
  same('an empty message gives no units', units.Empty, undefined);
  same('Canada message length is ignored for units', units.UsOnly, 1);
  same('non-US rows give no units', units.Spaced, undefined);
  const live = ev('LIB.live');
  yes('an empty message still counts as a live event', (live['United States'] || []).includes('Empty'));
  yes('an email row is not a live SMS event', !live.France);
  yes('a row without country is ignored', !live[''] && !Object.values(live).some((l) => l.includes('NoCountry')));
  yes('a row without event is ignored', !(live.France || []).includes(''));
  same('channel and country are trimmed (" sms ", " Spain ")', live.Spain, ['Spaced']);
  same('rows counted = valid SMS rows only', ev('LIB.rows'), 16);
  same('markets counted', ev('LIB.markets'), 3);   // United States, Canada, Spain
  same('the cost pages are told to rebuild', (ctx.window._imData = null, ev('window._imData')), null);
}
// A2. Sync with no SMS rows keeps the built-in values
{
  const { ctx, ev } = load(readJson('data/observed-2026-rates.json'));
  ctx.window._imData = { keep: true };
  same('libSync returns false with no rows', ctx.libSync([]), false);
  same('libSync returns false with only email rows', ctx.libSync([row('Email', 'France', 'X', 10)]), false);
  same('library stays "not synced"', ev('LIB.synced'), false);
  same('cost data is not reset when nothing synced', ctx.window._imData, { keep: true });
  const EV = [{ n: 'A', p: 1, s: 7 }], LIVE = { Spain: [0] };
  ctx.libApplyToModel(EV, LIVE);
  same('libApplyToModel does nothing before a sync (events)', EV, [{ n: 'A', p: 1, s: 7 }]);
  same('libApplyToModel does nothing before a sync (live)', LIVE, { Spain: [0] });
}
// A3. libApplyToModel
{
  const { ctx, ev } = load(readJson('data/observed-2026-rates.json'));
  ctx.libSync([
    row('SMS', 'United States', 'A', 161), row('SMS', 'Spain', 'A', 10), row('SMS', 'Spain', 'B', 10),
    row('SMS', 'Spain', 'Unknown event', 10), row('SMS', 'Germany', 'C', 10),
  ]);
  const EV = [{ n: 'A', p: 1, s: 9 }, { n: 'B', p: 1, s: 9 }, { n: 'C', p: 1, s: 9 }];
  const LIVE = { Spain: [1], France: [0] };
  ctx.libApplyToModel(EV, LIVE);
  same('units from the US message are applied', EV.map((e) => e.s), [2, 9, 9]);
  same('events without US units keep their built-in units', EV[1].s, 9);
  same('live events follow the library (indexes sorted)', Object.keys(LIVE).sort().map((c) => [c, LIVE[c]]), [['Germany', [2]], ['Spain', [0, 1]], ['United States', [0]]]);
  same('an event not in the model is listed as not costed', ev('LIB.notCosted'), ['Unknown event']);
  const ch = ev('LIB.changes');
  yes('a market that left the library is reported (France)', ch.some((x) => x.startsWith('France:') && x.includes('- A')), JSON.stringify(ch));
  yes('a newly live event is reported (Germany)', ch.some((x) => x.startsWith('Germany:') && x.includes('+ C')), JSON.stringify(ch));
  yes('a new event in an existing market is reported (Spain + A)', ch.some((x) => x.startsWith('Spain:') && x.includes('+ A')), JSON.stringify(ch));
}
// A4. Observed rates, with a small made-up data set
{
  const mk = (tx, pickupTx, evs) => ({ tx, pickupTx, ev: evs });
  const obs = { period: 'test', days: 100, markets: {
    'United States': mk(1000, 500, { X: 100, 'Transaction Ready for Pickup': 500 }),
    'France': mk(1000, 100, { X: 100, 'Transaction Ready for Pickup': 100 }),
    'Spain': mk(3000, 600, { X: 60 }),
    'Germany': mk(1000, 0, {}), 'Italy': mk(1000, 0, {}), 'United Kingdom': mk(1000, 0, {}), 'Belgium': mk(1000, 0, {}),
    'Testland': mk(1000, 0, { X: 59, Y: 61 }),   // 5.9% and 6.1%
  } };
  const { ev } = load(obs);
  const D = {
    US_EVENTS: [{ n: 'X', p: 10, s: 2 }, { n: 'Transaction Ready for Pickup', p: 50, s: 1 }, { n: 'Y', p: 10, s: 3 }],
    LIVE_EVENTS: { Poland: [0], Mexico: [] },
    ORDERS: { 'France': 1000, 'Poland': 2000, 'Testland': 1000, 'Mexico': 500, 'Norway': 700 },
    CLICKATELL: { 'France': 0.1, 'Poland': 0.2, 'Testland': 0.3, 'Mexico': 0.4 },   // Norway has no rate
  };
  ev('globalThis.D = ' + JSON.stringify(D));
  close('obsRate = events / transactions x 100', ev("obsRate('France','X')"), 10);
  same('obsRate of an unmeasured market is null', ev("obsRate('Poland','X')"), null);
  close('obsRate of an event never seen is 0', ev("obsRate('France','Nope')"), 0);
  // pooled: all events / all transactions of the 6 European markets = (100+60) / (1000+3000+4000) x 100 = 2
  close('European rate is pooled, not an average of rates', ev("obsEuRate('X')"), 2);
  close('obsTodayRate: measured market uses its own rate', ev('obsTodayRate(D,"France",0)'), 10);
  close('obsTodayRate: unmeasured and live uses the European rate', ev('obsTodayRate(D,"Poland",0)'), 2);
  close('obsTodayRate: unmeasured and not live is 0', ev('obsTodayRate(D,"Norway",0)'), 0);
  close('obsFullRate: normal event is the US rate', ev('obsFullRate(D,"France",0)'), 10);
  // pick-up: p x (market pick-up share) / (US pick-up share) = 50 x 0.1 / 0.5 = 10
  close('obsFullRate: pick-up is scaled by the market pick-up share', ev('obsFullRate(D,"France",1)'), 10);
  close('obsFullRate: pick-up of an unmeasured market is not scaled', ev('obsFullRate(D,"Poland",1)'), 50);
  yes('live when the real rate is 61% of full coverage', ev('obsIsLive(D,"Testland",2)') === true);
  yes('not live when the real rate is 59% of full coverage', ev('obsIsLive(D,"Testland",0)') === false);
  yes('a measured event never sent is not live', ev('obsIsLive(D,"France",2)') === false);
  yes('unmeasured market: the library decides (live)', ev('obsIsLive(D,"Poland",0)') === true);
  yes('unmeasured market: the library decides (not live)', ev('obsIsLive(D,"Poland",1)') === false);
  same('obsLiveIdx, measured: every event seen in the data', ev('obsLiveIdx(D,"France")'), [0, 1]);
  same('obsLiveIdx, unmeasured: the library list', ev('obsLiveIdx(D,"Poland")'), [0]);
  yes('obsLiveIdx returns a copy of the library list', (() => { const a = ev('obsLiveIdx(D,"Poland")'); a.push(99); return ev('D.LIVE_EVENTS.Poland.length') === 1; })());
  // France: X 10% x 1000 orders x 2 units + pick-up 10% x 1000 x 1 unit = 200 + 100 = 300 SMS, x 0.1 = 30
  const f = ev('obsToday(D,"France")');
  close('obsToday sms (France)', f.sms, 300);
  close('obsToday cost (France)', f.cost, 30);
  same('obsToday measured flag', [f.measured, ev('obsToday(D,"Poland")').measured], [true, false]);
  // Poland: X 2% x 2000 x 2 = 80 SMS x 0.2 = 16
  close('obsToday cost (unmeasured, Poland)', ev('obsToday(D,"Poland")').cost, 16);
  same('obsToday of a market without rate is null', ev('obsToday(D,"Norway")'), null);
  close('obsToday with other rates (Twilio-like)', ev('obsToday(D,"France",{France:1})').cost, 300);
  // Total = France 30 + Poland 16 + Testland (X 5.9% x1000 x2 + Y 6.1% x1000 x3 = 118+183 = 301 SMS x 0.3 = 90.3) + Mexico 0 (no live events)
  const t = ev('obsModelTotal(D)');
  close('obsModelTotal sums markets that have a rate', t.all, 30 + 16 + 90.3);
  close('obsModelTotal US part is 0 when the US is not in the model', t.us, 0);
  ev('D.ORDERS["United States"] = 1000; D.CLICKATELL["United States"] = 0.05; D.LIVE_EVENTS["United States"] = []');
  // US: X 10% x 1000 x 2 + pick-up 50% x 1000 x 1 = 200 + 500 = 700 SMS x 0.05 = 35
  close('obsModelTotal US part', ev('obsModelTotal(D)').us, 35);
  close('obsModelTotal all includes the US', ev('obsModelTotal(D)').all, 30 + 16 + 90.3 + 35);
}

// ───────────────────────── Part B and C: the page, in a browser ─────────────────────────
const { server, base } = await startServer();
const hub = await openHub({ base, sheet: 'fail' });   // sheet unreachable: the Hub shows its built-in values, so numbers are fixed
const { page, state } = hub;
try {
  state.where = 'cost model';
  await page.evaluate(() => renderIterableMigration());
  const D = await page.evaluate(() => JSON.parse(JSON.stringify(window._imData)));
  const OBS = readJson('data/observed-2026-rates.json');
  const baseline = readJson('data/clickatell-baseline.json');
  yes('the Hub is in its built-in state (library not synced)', await page.evaluate(() => LIB.synced === false));

  // Independent calculation (written separately from the app code)
  const EU = ['France', 'Spain', 'Germany', 'Italy', 'United Kingdom', 'Belgium'];
  const measured = (c) => OBS.markets[c];
  const euRate = (name) => EU.reduce((s, c) => s + (OBS.markets[c].ev[name] || 0), 0) / EU.reduce((s, c) => s + OBS.markets[c].tx, 0) * 100;
  const todayPct = (c, i) => {
    const name = D.US_EVENTS[i].n;
    if (measured(c)) return (OBS.markets[c].ev[name] || 0) / OBS.markets[c].tx * 100;
    return (D.LIVE_EVENTS[c] || []).includes(i) ? euRate(name) : 0;
  };
  const fullPct = (c, i) => {
    const e = D.US_EVENTS[i], m = OBS.markets[c], u = OBS.markets['United States'];
    if (e.n === 'Transaction Ready for Pickup' && m && u && m.tx && u.pickupTx) return e.p * (m.pickupTx / m.tx) / (u.pickupTx / u.tx);
    return e.p;
  };
  const isLive = (c, i) => measured(c) ? (todayPct(c, i) > 0 && todayPct(c, i) >= 0.6 * fullPct(c, i)) : (D.LIVE_EVENTS[c] || []).includes(i);
  const liveList = (c) => measured(c) ? D.US_EVENTS.map((e, i) => i).filter((i) => todayPct(c, i) > 0) : (D.LIVE_EVENTS[c] || []);
  const orders = (c) => measured(c) ? Math.round(OBS.markets[c].tx * 365 / OBS.days) : (D.ORDERS[c] || 0);
  // oracle for one market. kind 'live' = what is sent today; kind 'custom' = chosen events
  const marketCost = (c, o) => {
    const rate = (o.carrier === 'twilio' ? D.TWILIO : D.CLICKATELL)[c];
    if (rate === undefined) return null;
    const scale = o.scenario === 'full' ? 100 / o.optin : 1;
    const list = o.kind === 'live' ? liveList(c) : o.events;
    let sms = 0;
    for (const i of list) {
      const pct = o.kind === 'live' ? todayPct(c, i) : (isLive(c, i) ? todayPct(c, i) : fullPct(c, i));
      sms += pct / 100 * orders(c) * scale * D.US_EVENTS[i].s;
    }
    return sms * rate;
  };
  const scopeCost = (o) => o.scope.reduce((s, c) => s + (marketCost(c, o) || 0), 0);

  // Drives the page like a user and reads what it shows
  const money = (t) => Number(String(t).replace(/[^0-9.\-]/g, ''));
  async function drive(o) {
    await page.evaluate((o) => {
      const $ = (id) => document.getElementById(id);
      document.querySelectorAll('.im-cc').forEach((cb) => { cb.checked = o.scope.includes(cb.value); });
      $('im-carrier').value = o.carrier || 'clickatell';
      $('im-scenario').value = o.scenario || 'current';
      $('im-optin').value = o.optin === undefined ? 64 : o.optin;
      document.querySelector('input[name="im-evmode"][value="' + (o.kind || 'live') + '"]').checked = true;
      document.querySelectorAll('.im-ev').forEach((cb) => { cb.checked = (o.events || []).includes(Number(cb.value)); });
      $('im-profiles').value = o.profiles === undefined ? '' : o.profiles;
      $('im-profiles-used').value = o.used === undefined ? 0 : o.used;
      $('im-profile-allow').value = o.allow === undefined ? 52000000 : o.allow;
      recalcIterableMigration();
    }, o);
    return page.evaluate(() => ({
      carrier: document.getElementById('im-carrier-cost').textContent,
      fee: document.getElementById('im-profile-cost').textContent,
      feeNote: document.getElementById('im-profile-note').textContent,
      banner: document.getElementById('im-proxy-banner').innerText,
      rows: Array.from(document.querySelectorAll('#im-breakdown tr')).slice(1).map((tr) => tr.children[2].textContent),
    }));
  }
  const US = ['United States'];
  const mix = ['United States', 'France', 'Spain', 'Poland', 'Canada', 'Australia'];
  const allEvents = D.US_EVENTS.map((e, i) => i);

  state.where = 'simulator, live events';
  for (const [name, o] of [
    ['US only', { scope: US }],
    ['six markets (measured and estimated)', { scope: mix }],
    ['Twilio rates', { scope: mix, carrier: 'twilio' }],
    ['all markets', { scope: Object.keys(D.ORDERS) }],
  ]) {
    const r = await drive({ ...o, kind: 'live' });
    close('simulator "' + name + '" matches the independent calculation', money(r.carrier), Math.round(scopeCost({ ...o, kind: 'live', optin: 64 })), 1e-12);
  }
  // scenario "everyone opts in": costs 1/opt-in more
  {
    const cur = money((await drive({ scope: mix, scenario: 'current', optin: 64 })).carrier);
    const full = money((await drive({ scope: mix, scenario: 'full', optin: 64 })).carrier);
    close('"If everyone opted in" at 64% costs 1/0.64 of today', full / cur, 1 / 0.64, 1e-4);
    close('"If everyone opted in" matches the independent calculation', full, Math.round(scopeCost({ scope: mix, kind: 'live', scenario: 'full', optin: 64 })), 1e-12);
    const other = money((await drive({ scope: mix, scenario: 'current', optin: 10 })).carrier);
    close('the opt-in % has no effect in the "today" scenario', other, cur, 1e-12);
    const half = money((await drive({ scope: mix, scenario: 'full', optin: 50 })).carrier);
    close('"If everyone opted in" at 50% costs twice today', half / cur, 2, 1e-4);
  }
  // Twilio: a market without a Twilio rate is left out and the page says so
  {
    const missing = Object.keys(D.ORDERS).find((c) => D.TWILIO[c] === undefined && D.ORDERS[c] > 0);
    yes('test data has a market without a Twilio rate', !!missing);
    if (missing) {
      const withIt = await drive({ scope: [...US, missing], carrier: 'twilio' });
      const without = await drive({ scope: US, carrier: 'twilio' });
      close('a market without a rate adds nothing to the total', money(withIt.carrier), money(without.carrier), 1e-12);
      yes('the page says that market is excluded (' + missing + ')', /excluded/.test(withIt.banner) && withIt.banner.includes(missing), withIt.banner);
    }
  }
  // the rows of the breakdown add up to the total
  {
    const r = await drive({ scope: mix });
    const sum = r.rows.map(money).reduce((a, b) => a + b, 0);
    yes('breakdown rows add up to the total (rounding only)', Math.abs(sum - money(r.carrier)) <= r.rows.length / 2 + 1, 'rows ' + sum + ', total ' + money(r.carrier));
    same('no market selected shows $0', money((await drive({ scope: [] })).carrier), 0);
  }

  state.where = 'simulator, chosen events';
  for (const [name, o] of [
    ['all events, US', { scope: US, events: allEvents }],
    ['all events, six markets', { scope: mix, events: allEvents }],
    ['three events, six markets, full opt-in', { scope: mix, events: [0, 1, 18], scenario: 'full', optin: 64 }],
    ['no event chosen', { scope: mix, events: [] }],
  ]) {
    const r = await drive({ ...o, kind: 'custom' });
    close('chosen events "' + name + '" matches the independent calculation', money(r.carrier), Math.round(scopeCost({ ...o, kind: 'custom', optin: o.optin || 64 })), 1e-12);
  }
  {
    const live = money((await drive({ scope: mix, kind: 'live' })).carrier);
    const all = money((await drive({ scope: mix, kind: 'custom', events: allEvents })).carrier);
    yes('activating every event never costs less than what is live today', all >= live, 'all ' + all + ', live ' + live);
  }

  state.where = 'simulator, profile fee';
  const fee = async (o) => drive({ scope: US, ...o });
  same('profile fee: blank shows "Not set"', (await fee({})).fee, 'Not set');
  // 1,000,000 profiles over a 0 allowance = 1,000 x 1,000 profiles x $0.50 x 12 months = $6,000
  same('profile fee: 1M profiles, no allowance = $6,000', money((await fee({ profiles: 1000000, allow: 0 })).fee), 6000);
  same('profile fee: charged once, not once per market', money((await drive({ scope: mix, profiles: 1000000, allow: 0 })).fee), 6000);
  // 10M new + 45M used = 55M; 3M above a 52M allowance = 3,000 x 0.5 x 12 = $18,000
  same('profile fee: only profiles above the allowance (3M = $18,000)', money((await fee({ profiles: 10000000, used: 45000000 })).fee), 18000);
  yes('profile fee: within the allowance shows "no fee"', /no fee/.test((await fee({ profiles: 1000000, used: 1000000 })).feeNote));
  same('profile fee: within the allowance is $0', money((await fee({ profiles: 1000000, used: 1000000 })).fee), 0);
  same('profile fee: exactly at the allowance is $0', money((await fee({ profiles: 2000000, used: 50000000 })).fee), 0);
  same('profile fee: 0 entered is $0, not "Not set"', (await fee({ profiles: 0 })).fee, '$0');
  same('profile fee does not depend on carrier or opt-in', money((await fee({ profiles: 1000000, allow: 0, carrier: 'twilio', scenario: 'full', optin: 20 })).fee), 6000);

  // ── The Cost calculator page (js/pages/cost-calculator.js) ──
  state.where = 'cost calculator';
  const calc = (S) => page.evaluate((S) => { const r = ccCompute(window._imData, Object.assign({ mode: 'live', events: [], carrier: 'clickatell', scenario: 'current', optin: 64 }, S)); return JSON.parse(JSON.stringify(r)); }, S);
  const usEvents = D.LIVE_EVENTS['United States'];
  const half = allEvents.filter((i) => i % 2 === 0);
  for (const [name, o] of [
    ['US live', { markets: US }],
    ['six markets live', { markets: mix }],
    ['six markets live, Twilio', { markets: mix, carrier: 'twilio' }],
    ['six markets, everyone opts in', { markets: mix, scenario: 'full', optin: 64 }],
    ['all markets, US messages everywhere', { markets: Object.keys(D.ORDERS), mode: 'pick', events: usEvents }],
    ['six markets, half of the messages, Twilio, 40% opt-in', { markets: mix, mode: 'pick', events: half, carrier: 'twilio', scenario: 'full', optin: 40 }],
  ]) {
    const r = await calc(o);
    const ora = { scope: o.markets, kind: o.mode === 'pick' ? 'custom' : 'live', events: o.events || [], carrier: o.carrier, scenario: o.scenario, optin: o.optin || 64 };
    close('calculator "' + name + '": scenario cost matches the independent calculation', r.tot.scenCost, scopeCost(ora), 1e-9);
    close('calculator "' + name + '": today cost matches the independent calculation', r.tot.todayCost, scopeCost({ ...ora, kind: 'live', scenario: 'current' }), 1e-9);
    close('calculator "' + name + '": market rows add up to the total', r.rows.reduce((a, x) => a + x.scenCost, 0), r.tot.scenCost, 1e-9);
    close('calculator "' + name + '": message rows add up to the total', r.evRows.reduce((a, x) => a + x.scenCost, 0), r.tot.scenCost, 1e-9);
    close('calculator "' + name + '": message rows add up to today total', r.evRows.reduce((a, x) => a + x.todayCost, 0), r.tot.todayCost, 1e-9);
  }
  {
    // "What we pay today" for all markets is the same number the Hub model shows elsewhere
    const r = await calc({ markets: Object.keys(D.ORDERS) });
    close('calculator "what we pay today" = the model total of the Activation pages', r.tot.todayCost, (await page.evaluate(() => obsModelTotal(window._imData))).all, 1e-9);
    same('calculator "what we pay today": scenario equals today when nothing changes', Math.round(r.tot.scenCost), Math.round(r.tot.todayCost));
    // same question asked to the older simulator page gives the same answer
    const sim = money((await drive({ scope: mix, kind: 'custom', events: half, scenario: 'full', optin: 64 })).carrier);
    const cc = await calc({ markets: mix, mode: 'pick', events: half, scenario: 'full', optin: 64 });
    close('calculator and the Iterable simulator agree for the same inputs', Math.round(cc.tot.scenCost), sim, 1e-12);
    // markets without a Twilio rate are left out and named
    const tw = await calc({ markets: Object.keys(D.ORDERS), carrier: 'twilio' });
    const noTw = Object.keys(D.ORDERS).filter((c) => D.TWILIO[c] === undefined && D.ORDERS[c] > 0);
    same('calculator names the markets without a Twilio rate', tw.excluded.slice().sort(), noTw.slice().sort());
    // the carrier check is the same scenario priced with both carriers on the markets both cover
    const cmp = await calc({ markets: mix, scenario: 'full', optin: 64 });
    const both = mix.filter((c) => D.CLICKATELL[c] !== undefined && D.TWILIO[c] !== undefined);
    close('carrier check, Clickatell side', cmp.compare.clickatell, scopeCost({ scope: both, kind: 'live', scenario: 'full', optin: 64 }), 1e-9);
    close('carrier check, Twilio side', cmp.compare.twilio, scopeCost({ scope: both, kind: 'live', scenario: 'full', optin: 64, carrier: 'twilio' }), 1e-9);
    // Iterable fee: same rule as the simulator
    same('calculator profile fee: 3M above the allowance = $18,000', await page.evaluate(() => ccProfileFee(10000000, 45000000, 52000000, 0.5).cost), 18000);
    same('calculator profile fee: not entered = $0', await page.evaluate(() => ccProfileFee(null, 0, 52000000, 0.5).cost), 0);
    same('calculator profile fee: at the allowance = $0', await page.evaluate(() => ccProfileFee(2000000, 50000000, 52000000, 0.5).cost), 0);
  }
  {
    // The page itself: quick starts fill the controls and the numbers show
    await page.evaluate(() => renderCostCalculator());
    const shown = () => page.evaluate(() => ({ today: document.getElementById('cc-k-today').textContent, scen: document.getElementById('cc-k-scen').textContent, head: document.getElementById('cc-headline').innerText, rows: document.querySelectorAll('#cc-by-market tr').length }));
    await page.evaluate(() => ccPreset('today'));
    let v = await shown();
    same('quick start "What we pay today": today = scenario on screen', v.today, v.scen);
    yes('quick start "What we pay today": one row per market with a rate + header', v.rows > 20, 'rows: ' + v.rows);
    await page.evaluate(() => ccPreset('optin'));
    const v2 = await shown();
    yes('quick start "If everyone opted in": scenario is higher than today', money(v2.scen) > money(v2.today), JSON.stringify(v2));
    await page.evaluate(() => ccPreset('twilio'));
    same('quick start "Switch to Twilio": the carrier is Twilio', await page.evaluate(() => document.getElementById('cc-carrier').value), 'twilio');
    await page.evaluate(() => ccPreset('global'));
    const v3 = await shown();
    yes('quick start "Global deployment": costs more than today', money(v3.scen) > money(v3.today), JSON.stringify(v3));
    await page.evaluate(() => { ccMarkets('none'); });
    yes('no market picked: the page asks for one', /at least one market/.test((await shown()).head));
  }

  state.where = 'model data';
  yes('every billing unit is a whole number of 1 or more', D.US_EVENTS.every((e) => Number.isInteger(e.s) && e.s >= 1), JSON.stringify(D.US_EVENTS.filter((e) => !(Number.isInteger(e.s) && e.s >= 1))));
  yes('every event rate is 0 or more', D.US_EVENTS.every((e) => typeof e.p === 'number' && e.p >= 0));
  yes('event names are unique', new Set(D.US_EVENTS.map((e) => e.n)).size === D.US_EVENTS.length);
  yes('live event indexes point to real events', Object.values(D.LIVE_EVENTS).every((l) => l.every((i) => Number.isInteger(i) && i >= 0 && i < D.US_EVENTS.length)));
  yes('every carrier rate is a positive number', [D.CLICKATELL, D.TWILIO].every((r) => Object.values(r).every((v) => typeof v === 'number' && v > 0)));
  yes('every measured market has orders and a Clickatell rate', Object.keys(OBS.markets).every((c) => D.ORDERS[c] > 0 && D.CLICKATELL[c] > 0));

  // ── Part C: the calibration anchor ──
  state.where = 'calibration';
  const total = await page.evaluate(() => obsModelTotal(window._imData));
  const fix = ' If you refreshed the rates or the events on purpose, update "calibration" in data/clickatell-baseline.json to the new value.';
  same('model total, all markets, built-in state = frozen value (' + baseline.calibration.modelLiveBaseline + ')' + fix, Math.round(total.all), baseline.calibration.modelLiveBaseline);
  same('model total, United States only, built-in state = frozen value (' + baseline.calibration.modelLiveBaselineUS + ')' + fix, Math.round(total.us), baseline.calibration.modelLiveBaselineUS);
  const share = total.all / baseline.smsYearly;
  yes('the model is still close to the real invoices (80% to 90%)', share > 0.8 && share < 0.9, 'model is ' + (share * 100).toFixed(1) + '% of the invoices');
} catch (e) {
  fail('the test stopped early: ' + String(e.stack || e.message).split('\n').slice(0, 3).join(' | ').slice(0, 300));
} finally {
  await hub.browser.close(); server.close();
}
failures += hub.problems.length;
console.log('\n' + checks + ' checks run.');
if (failures) { console.log(failures + ' problem(s) found.'); process.exit(1); }
console.log('All good.');
