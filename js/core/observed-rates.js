// Observed 2026 rates from Ria BI (the values are in data/observed-2026-rates.json)
/* ── OBSERVED 2026 RATES (Ria BI: Global BI notifications + Ria Transactions) ──
   Real SMS counts per event and real transactions (Country From) for 9 markets, 1 Jan to 13 Oct 2026 (286 days).
   Unmeasured markets use the European average (pooled FR, ES, DE, IT, UK, BE) for the events live in the Messages Library. */
const OBS = HUB_DATA.observedRates;
const OBS_EU = ['France','Spain','Germany','Italy','United Kingdom','Belgium'];
const OBS_COVER_MIN = 0.6;   // an event counts as live when its real rate reaches 60% of the full-coverage rate
function obsRate(c,n){ const m = OBS.markets[c]; return m ? ((m.ev[n]||0)/m.tx*100) : null; }
function obsEuRate(n){ let a=0, t=0; OBS_EU.forEach(function(c){ const m = OBS.markets[c]; a += m.ev[n]||0; t += m.tx; }); return a/t*100; }
function obsLibLive(D,c,i){ return (D.LIVE_EVENTS[c]||[]).indexOf(i) !== -1; }
// What the market sends today, as % of transactions
function obsTodayRate(D,c,i){
  const e = D.US_EVENTS[i];
  if(OBS.markets[c]) return obsRate(c,e.n);
  return obsLibLive(D,c,i) ? obsEuRate(e.n) : 0;
}
// What the market would send with full coverage, as % of transactions (US 2026 rate; office pick-up scaled by the market's pick-up share)
function obsFullRate(D,c,i){
  const e = D.US_EVENTS[i]; let r = e.p;
  if(e.n === 'Transaction Ready for Pickup'){
    const m = OBS.markets[c], u = OBS.markets['United States'];
    if(m && u && m.tx && u.pickupTx) r = e.p * (m.pickupTx/m.tx) / (u.pickupTx/u.tx);
  }
  return r;
}
function obsIsLive(D,c,i){
  if(!OBS.markets[c]) return obsLibLive(D,c,i);   // unmeasured: the Messages Library decides
  const t = obsTodayRate(D,c,i);
  return t > 0 && t >= obsFullRate(D,c,i) * OBS_COVER_MIN;
}
// Events a market sends today (measured: seen in the 2026 data; unmeasured: live in the library)
function obsLiveIdx(D,c){
  const ix = [];
  if(OBS.markets[c]){ D.US_EVENTS.forEach(function(e,i){ if(obsTodayRate(D,c,i) > 0) ix.push(i); }); return ix; }
  return (D.LIVE_EVENTS[c]||[]).slice();
}
// Yearly SMS and cost of what is live today for one market
function obsToday(D,c,rates){
  const rate = (rates||D.CLICKATELL)[c], orders = D.ORDERS[c]||0;
  if(rate === undefined) return null;
  let sms = 0;
  obsLiveIdx(D,c).forEach(function(i){ sms += obsTodayRate(D,c,i)/100 * orders * D.US_EVENTS[i].s; });
  return {sms:sms, cost:sms*rate, measured:!!OBS.markets[c]};
}
// Model total for all markets (what the hub says we spend today)
function obsModelTotal(D,rates){
  let all = 0, us = 0;
  Object.keys(D.ORDERS).forEach(function(c){ const r = obsToday(D,c,rates); if(r){ all += r.cost; if(c === 'United States') us = r.cost; } });
  return {all:all, us:us};
}

