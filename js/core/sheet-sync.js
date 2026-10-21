// Google Sheet connection and Messages Library sync
/* ── GOOGLE SHEET CONNECTION ── */
const SHEET_ID = '14e48fP_4h2Qz_A6AwtCumbQ84uoYE8nmWj_-1QparxY';

const INTENT_KEY_MAP_SHEET = {
  'transaction status':            'transaction_status',
  'documents required':            'documents_required',
  'account messages':              'account_messages',
  'login credentials or password': 'login_credentials',
  'balance settlement deposit':    'balance_settlement',
  'interview required':            'interview_required',
  'refunds':                       'refunds',
  'cancellations - order on hold': 'cancellations',
  'transaction under review':      'transaction_review',
};

function normalizeIntent(raw) {
  if(!raw) return 'transaction_status';
  const key = raw.toString().trim().toLowerCase();
  return INTENT_KEY_MAP_SHEET[key] || key.replace(/\s+/g,'_');
}

// Fixed column order — matches the Ria transactional message library layout (A–T).
// The live sheet doesn't expose gviz header labels, and since we now filter server-side
// (which excludes the literal header row along with non-live rows), we map by position instead.
const SHEET_COLUMNS = ["Product type","Channel","Event that triggers the message send","Message template title","Message","Subject","Language","Send system","Message recipient","From address","Format type","Service","Payment method","Country to","B&M email message incl. HTML","MessageID","Event ID","Agent Company","Intent","Live"];

/* ── MESSAGES LIBRARY SYNC ──
   One shared source for every cost page and the Activation map. Built from the
   live B&M rows of the Google Sheet each time the Hub loads:
   - live SMS events per market (rows with Channel = SMS, a market and an event)
   - billing units per event: for each event, the SMS units (160 characters = 1 unit,
     whole numbers) of every live US SMS message, then the most common value
     (a tie takes the lower value). Same method as the original cost model.
   The values written in the cost pages stay as a fallback if the sheet cannot load. */
const LIB = {synced:false, tried:false, at:null, rows:0, markets:0, live:{}, units:{}, notCosted:[], changes:[]};
const LIB_UNIT_CHARS = 160;

function libSync(bmRows){
  const live = {}, unitsList = {}, notCosted = {};
  let rows = 0;
  (bmRows || []).forEach(function(r){
    if(((r['Channel'] || '').trim().toUpperCase()) !== 'SMS') return;
    const c = (r['Country to'] || '').trim(), ev = (r['Event that triggers the message send'] || '').trim();
    if(!c || !ev) return;
    rows++;
    (live[c] = live[c] || {})[ev] = true;
    if(c === 'United States'){
      const len = String(r['Message'] || '').length;
      if(len > 0) (unitsList[ev] = unitsList[ev] || []).push(Math.ceil(len / LIB_UNIT_CHARS));
    }
  });
  if(!rows) return false;   // sheet not loaded: keep the built-in values
  const units = {};
  Object.keys(unitsList).forEach(function(ev){
    const cnt = {}; unitsList[ev].forEach(function(u){ cnt[u] = (cnt[u] || 0) + 1; });
    let best = null;
    Object.keys(cnt).map(Number).sort(function(a,b){ return a-b; }).forEach(function(u){ if(best === null || cnt[u] > cnt[best]) best = u; });
    units[ev] = best;
  });
  LIB.live = {}; Object.keys(live).forEach(function(c){ LIB.live[c] = Object.keys(live[c]); });
  LIB.units = units; LIB.rows = rows; LIB.markets = Object.keys(live).length;
  LIB.synced = true; LIB.at = new Date();
  window._imData = null;   // the cost pages rebuild their data from the library on next render
  return true;
}

// Applies the library to a cost model: US_EVENTS items are {n, p, s}; LIVE maps market -> indexes.
function libApplyToModel(EV, LIVE){
  if(!LIB.synced) return;
  const idx = {}; EV.forEach(function(e,i){ idx[e.n] = i; });
  const before = {}; Object.keys(LIVE).forEach(function(c){ before[c] = LIVE[c].slice(); });
  EV.forEach(function(e){ if(LIB.units[e.n]) e.s = LIB.units[e.n]; });
  Object.keys(LIVE).forEach(function(c){ delete LIVE[c]; });
  const names = {};
  Object.keys(LIB.live).forEach(function(c){
    const ix = [];
    LIB.live[c].forEach(function(n){ if(idx[n] !== undefined) ix.push(idx[n]); else names[n] = true; });
    if(ix.length) LIVE[c] = ix.sort(function(a,b){ return a-b; });
  });
  LIB.notCosted = Object.keys(names).sort();
  const ch = [];
  Object.keys(LIVE).sort().forEach(function(c){
    const was = before[c] || [], now = LIVE[c];
    const add = now.filter(function(i){ return was.indexOf(i) === -1; }), rem = was.filter(function(i){ return now.indexOf(i) === -1; });
    if(add.length || rem.length) ch.push(c+': '+add.map(function(i){ return '+ '+EV[i].n; }).concat(rem.map(function(i){ return '- '+EV[i].n; })).join(', '));
  });
  Object.keys(before).forEach(function(c){ if(!LIVE[c]) ch.push(c+': '+before[c].map(function(i){ return '- '+EV[i].n; }).join(', ')); });
  LIB.changes = ch;
  if(typeof refreshLibraryStatus === 'function') refreshLibraryStatus();   // the badge lists what changed (the unit tests load this file without the page)
}

function libUnits(name, fallback){ return (LIB.synced && LIB.units[name]) || fallback; }

/* A filter applied on the Google Sheet hides rows from this fetch too. To avoid that, the Hub first reads a
   mirror tab ("Hub feed B&M", "Hub feed Digital"). A mirror tab is made of one formula (see README), and a
   formula always returns every row, whatever filter someone has applied. If the mirror tab is missing or
   empty, the Hub reads the original tab as before. */
async function fetchSheetFeed(feedTab, originalTab) {
  const rows = await fetchSheetTab(feedTab);
  if(rows.length && rows.some(function(r){ return (r['Channel'] || '').trim(); })){
    window._sheetFeedUsed = (window._sheetFeedUsed || []).concat(feedTab);
    return rows;
  }
  return fetchSheetTab(originalTab);
}

async function fetchSheetTab(tabName) {
  // Server-side filter: only rows where column T (Live) = 'Yes' come back over the wire.
  // Cuts the B&M+Digital payload from 2,012 rows to ~1,162 — same set the dashboard already
  // displays, just without downloading the ~850 non-live rows first.
  const tq = encodeURIComponent("select * where T = 'Yes'");
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tabName)}&tq=${tq}`;
  try {
    const res = await fetch(url);
    const text = await res.text();
    const json = JSON.parse(text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/)[1]);
    const tableRows = json.table.rows;
    if(!tableRows || tableRows.length === 0) return [];

    return tableRows.map(r => {
      const obj = {};
      r.c.forEach((cell, i) => {
        const key = SHEET_COLUMNS[i] || '';
        obj[key] = cell ? (cell.v !== null && cell.v !== undefined ? String(cell.v) : '') : '';
      });
      return obj;
    });
  } catch(e) {
    console.warn('Sheet fetch failed:', tabName, e);
    return [];
  }
}

function sheetRowToTemplate(row, audience) {
  return {
    event:      (row['Event that triggers the message send'] || '').trim(),
    channel:    (row['Channel'] || '').trim(),
    live:       true,
    title:      (row['Message template title'] || '').trim(),
    msg:        (row['Message'] || '').trim().substring(0, 400),
    r1:         (row['Country to'] || '').trim(),
    r2:         '',
    r3:         '',
    region:     (row['Country to'] || '').trim(),
    sendTo:     (row['Message recipient'] || '').trim(),
    entry:      (row['Service'] || '').trim(),
    agent:      (row['Agent Company'] || '').trim(),
    group:      '',
    audience:   audience,
    intent:     normalizeIntent(row['Intent'] || ''),
    _fromSheet: true,
  };
}

