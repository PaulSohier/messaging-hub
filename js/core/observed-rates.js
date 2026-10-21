// Observed 2026 rates from Ria BI
/* ── OBSERVED 2026 RATES (Ria BI: Global BI notifications + Ria Transactions) ──
   Real SMS counts per event and real transactions (Country From) for 9 markets, 1 Jan to 13 Oct 2026 (286 days).
   Unmeasured markets use the European average (pooled FR, ES, DE, IT, UK, BE) for the events live in the Messages Library. */
const OBS = {period:'1 Jan to 13 Oct 2026', days:286, markets:{"United States":{"tx":53383737,"ev":{"Transaction Ready for Pickup":25257623,"Transaction Paid":19260179,"Transaction Pick Up Reminder (3 Days)":874110,"Transaction Canceled":194596,"Strategic Retail Partners - Refund Completed":164552,"Strategic Retail Partners - Available for Refund":164020,"Transaction Pick Up Reminder (7 Days)":114620,"Transaction Needs Information":66450,"Agent activated due to paid credit":50152,"Transaction Pick Up Reminder (14 Days)":44709,"Customer Opt-In":39382,"Transaction Resent":37756,"Agent suspended due to past-due balance":23375,"Transaction Rejected":20970,"Requires interview":10144,"Transaction Ready for Refund":8762,"Fraud Model - Transaction Needs Information":6908},"pickupTx":30302074},"Canada":{"tx":4456257,"ev":{"Transaction Paid":1524870,"Transaction Ready for Pickup":570091,"Transaction Needs Information":3340,"Customer Opt-In":2001,"Requires interview":1185,"Agent activated due to paid credit":43,"Agent suspended due to past-due balance":39,"Agent suspended 15 days reminder":12,"Agent suspended 7 days reminder":6},"pickupTx":2448905},"Australia":{"tx":2225104,"ev":{"Transaction Ready for Pickup":570573,"Transaction Paid":551502,"Payment Instructions Sent":86455,"Transaction Expired":5243,"Transaction Cancelled (Incorrect Account Details)":2677,"Transaction Ready for Refund":1960,"Invalid Payment":1401,"Transaction Cancelled (Time Limit Expired)":887,"Customer Opt-In":757,"Transaction Cancelled (Customer Requested)":620,"Transaction Needs Information":5,"Transaction Cancelled (Test Transaction)":2},"pickupTx":792396},"France":{"tx":12491882,"ev":{"Transaction Ready for Pickup":47982,"Transaction Ready for Refund":17395,"Customer Opt-In":5371,"Transaction Paid":778},"pickupTx":8790174},"Spain":{"tx":15429613,"ev":{"Transaction Ready for Refund":56722,"Transaction Ready for Pickup":33374,"Customer Opt-In":5737,"Transaction Entered":37,"Transaction Needs Information":12},"pickupTx":7114510},"Germany":{"tx":5609166,"ev":{"Transaction Ready for Pickup":43240,"Transaction Ready for Refund":10024,"Transaction Paid":5608,"Customer Opt-In":1996},"pickupTx":3850136},"Italy":{"tx":7980980,"ev":{"Transaction Ready for Pickup":74405,"Transaction Ready for Refund":4880,"Customer Opt-In":4496},"pickupTx":3961525},"United Kingdom":{"tx":4811366,"ev":{"Transaction Ready for Pickup":62408,"Transaction Ready for Refund":17544,"Customer Opt-In":2020,"Transaction Needs Information":1},"pickupTx":1958650},"Belgium":{"tx":2226285,"ev":{"Transaction Ready for Pickup":6973,"Transaction Ready for Refund":2845,"Customer Opt-In":776,"Transaction Needs Information":241},"pickupTx":1760541}}};
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

