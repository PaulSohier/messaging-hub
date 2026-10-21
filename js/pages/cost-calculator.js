// Page: Cost calculator (the "super calculator", 2026 model)
/* One page to answer the cost questions: what we pay today, what activating more costs, what changes if opt-in
   changes, and what another carrier would cost. It uses the same 2026 model as the Activation pages:
   - live events and billing units come from the Messages Library
   - event rates are real 2026 rates from Ria BI for the 9 measured markets, the European average for the others
   - events that are not live today are costed at full coverage (US 2026 rate)
   ccCompute() does the maths only (no page, no browser), so it can be tested alone. */

const CC_KEY = 'riaMessagingHub_costCalculator';
const CC_ITER = { allowance: 52000000, cpm: 0.50 };   // Iterable: profiles included, $ per 1,000 extra profiles per month

// Iterable profile fee per year. profiles = null means "not entered": no fee.
function ccProfileFee(profiles, used, allowance, cpm){
  if(profiles === null || profiles === undefined) return {over:0, cost:0};
  const over = Math.max(0, profiles + (used||0) - (allowance||0));
  return {over:over, cost:(over/1000) * cpm * 12};
}

// One run for one carrier. S = {markets, mode:'live'|'pick', events:[index], scenario:'current'|'full', optin}
function ccRun(D, S, rates){
  const scale = S.scenario === 'full' ? (100/(S.optin || 100)) : 1;
  const rows = [], excluded = [];
  const ev = {};   // by event index
  const evRow = function(i){ return ev[i] || (ev[i] = {i:i, name:D.US_EVENTS[i].n, todaySms:0, todayCost:0, scenSms:0, scenCost:0}); };
  const tot = {todaySms:0, todayCost:0, scenSms:0, scenCost:0};
  S.markets.forEach(function(c){
    const orders = D.ORDERS[c] || 0, rate = rates[c];
    if(rate === undefined){ if(orders > 0) excluded.push(c); return; }
    const live = obsLiveIdx(D, c);
    const r = {c:c, measured:!!OBS.markets[c], nLive:live.length, nScen:0, todaySms:0, todayCost:0, scenSms:0, scenCost:0};
    live.forEach(function(i){
      const sms = obsTodayRate(D,c,i)/100 * orders * D.US_EVENTS[i].s;
      r.todaySms += sms; evRow(i).todaySms += sms; evRow(i).todayCost += sms*rate;
    });
    const set = S.mode === 'live' ? live : S.events;
    set.forEach(function(i){
      if(!D.US_EVENTS[i]) return;
      const t = obsTodayRate(D,c,i);
      const pct = S.mode === 'live' ? t : (obsIsLive(D,c,i) ? t : obsFullRate(D,c,i));
      const sms = pct/100 * orders * scale * D.US_EVENTS[i].s;
      r.nScen += 1; r.scenSms += sms; evRow(i).scenSms += sms; evRow(i).scenCost += sms*rate;
    });
    r.todayCost = r.todaySms * rate; r.scenCost = r.scenSms * rate;
    tot.todaySms += r.todaySms; tot.todayCost += r.todayCost; tot.scenSms += r.scenSms; tot.scenCost += r.scenCost;
    rows.push(r);
  });
  const evRows = Object.keys(ev).map(function(k){ return ev[k]; });
  return {rows:rows, evRows:evRows, excluded:excluded, tot:tot, scale:scale};
}

// Full result: the chosen carrier, plus the same scenario with each carrier on the markets both carriers cover
function ccCompute(D, S){
  const rates = S.carrier === 'twilio' ? D.TWILIO : D.CLICKATELL;
  const main = ccRun(D, S, rates);
  const both = {markets: S.markets.filter(function(c){ return D.CLICKATELL[c] !== undefined && D.TWILIO[c] !== undefined; })};
  const S2 = Object.assign({}, S, both);
  const cl = ccRun(D, S2, D.CLICKATELL).tot, tw = ccRun(D, S2, D.TWILIO).tot;
  main.compare = {clickatell: cl.scenCost, twilio: tw.scenCost, markets: both.markets.length, today: {clickatell: cl.todayCost, twilio: tw.todayCost}};
  return main;
}

/* ── Page ── */
function ccMoney(n){ return '$'+Math.round(n).toLocaleString('en-US'); }
function ccSigned(n){ return (n < 0 ? '-' : '+') + ccMoney(Math.abs(n)); }
function ccNum(n){ return Math.round(n).toLocaleString('en-US'); }

function renderCostCalculator(){
  if(!window._imData) renderIterableMigration();   // loads the shared rate, order and live-event data
  const D = window._imData;
  let saved = null;
  try{ const p = JSON.parse(localStorage.getItem(CC_KEY) || 'null'); saved = (p && p.version === 1) ? p : null; }catch(e){ saved = null; }
  const countries = Object.keys(D.ORDERS).sort();
  const S0 = Object.assign({markets:['United States'], mode:'live', events:[], carrier:'clickatell', scenario:'current', optin:64,
    profiles:null, profilesUsed:0, allowance:CC_ITER.allowance}, saved || {});
  window._cc = S0;

  const lab = 'font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)';
  const box = 'background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:18px 22px;margin-bottom:16px;';
  const inp = 'padding:8px 12px;border-radius:7px;border:1px solid var(--border-mid);background:var(--card);font-size:13px;color:var(--text);';
  const h = function(t){ return '<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:10px;">'+t+'</div>'; };
  const pill = function(label, fn){ return '<button onclick="'+fn+'" class="intent-pill" style="border:none;">'+label+'</button>'; };
  const kpi = function(id, title, note){
    return '<div style="flex:1;min-width:220px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:16px 20px;">'
      + '<div style="'+lab+';margin-bottom:4px;">'+title+'</div><div id="'+id+'" style="font-size:25px;font-weight:700;color:var(--text);">&mdash;</div>'
      + '<div id="'+id+'-n" style="font-size:11px;color:var(--muted);margin-top:4px;">'+(note||'&nbsp;')+'</div></div>';
  };

  const marketBoxes = countries.map(function(c){
    return '<label style="display:flex;align-items:center;gap:6px;font-size:11px;padding:3px 6px;cursor:pointer;white-space:nowrap;">'
      + '<input type="checkbox" class="cc-m" value="'+esc(c)+'" onchange="ccRefresh()" style="cursor:pointer;">'+esc(c)+'</label>';
  }).join('');
  const eventBoxes = D.US_EVENTS.map(function(e,i){
    return '<label style="display:flex;align-items:center;gap:7px;font-size:11px;padding:3px 5px;cursor:pointer;">'
      + '<input type="checkbox" class="cc-e" value="'+i+'" onchange="ccRefresh()" style="cursor:pointer;">'
      + '<span style="flex:1;">'+esc(e.n)+'</span><span style="color:var(--hint);font-size:10px;white-space:nowrap;">'+e.p.toFixed(3)+'% of orders &middot; '+e.s+' seg</span></label>';
  }).join('');

  const html = '<div class="calc-wrap">'
    + '<div style="background:var(--purple-bg);border:1px solid var(--purple);border-radius:var(--radius);padding:16px 20px;margin-bottom:18px;font-size:13px;line-height:1.75;">'
    + '<div style="font-weight:700;margin-bottom:6px;">What this page answers</div>'
    + 'What we pay for SMS today, what it costs to activate more messages, what changes if more customers opt in, and what another carrier would cost. '
    + 'It uses 2026 data: the Messages Library (what is live), real 2026 event rates from Ria BI for 9 measured markets, and the European average for the others. '
    + 'Numbers can differ from the older 2025 calculators.</div>'

    + '<div style="'+box+'"><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">'
    + '<span style="'+lab+';margin-right:6px;">Quick starts</span>'
    + pill('What we pay today', "ccPreset('today')") + pill('If everyone opted in', "ccPreset('optin')")
    + pill('Switch to Twilio', "ccPreset('twilio')") + pill('Global deployment (US messages everywhere)', "ccPreset('global')")
    + '</div></div>'

    + '<div id="cc-headline" style="font-size:19px;font-weight:700;line-height:1.5;margin-bottom:16px;">&nbsp;</div>'
    + '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:16px;">'
    + kpi('cc-k-today','Today per year') + kpi('cc-k-scen','Your scenario per year') + kpi('cc-k-diff','Difference') + '</div>'
    + '<div id="cc-banner" style="display:none;background:#FFF7ED;border:1px solid var(--orange);border-radius:var(--radius);padding:10px 16px;margin-bottom:16px;font-size:11px;color:#7A3300;line-height:1.6;"></div>'

    + '<div style="'+box+'">'+h('1. Which markets?')
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px;">'
    + pill('US only', "ccMarkets('us')") + pill('The 9 measured markets', "ccMarkets('measured')") + pill('All markets', "ccMarkets('all')") + pill('Clear', "ccMarkets('none')")
    + '<span id="cc-m-count" style="font-size:11px;color:var(--muted);"></span></div>'
    + '<div style="display:flex;flex-wrap:wrap;gap:2px;max-height:150px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:8px;">'+marketBoxes+'</div></div>'

    + '<div style="'+box+'">'+h('2. Which messages?')
    + '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px;">'
    + '<label style="display:flex;align-items:center;gap:7px;font-size:12px;cursor:pointer;padding:7px 12px;border:1px solid var(--border-mid);border-radius:8px;"><input type="radio" name="cc-mode" value="live" onchange="ccRefresh()"><span><strong>What is live today</strong> <span style="color:var(--muted);">only what each market sends now</span></span></label>'
    + '<label style="display:flex;align-items:center;gap:7px;font-size:12px;cursor:pointer;padding:7px 12px;border:1px solid var(--border-mid);border-radius:8px;"><input type="radio" name="cc-mode" value="pick" onchange="ccRefresh()"><span><strong>Pick messages</strong> <span style="color:var(--muted);">model activating more</span></span></label></div>'
    + '<div id="cc-e-picker" style="display:none;"><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px;">'
    + pill('All messages', "ccEvents('all')") + pill('Same as the US today', "ccEvents('us')") + pill('Clear', "ccEvents('none')")
    + '<span id="cc-e-count" style="font-size:11px;color:var(--muted);"></span></div>'
    + '<div style="display:flex;flex-direction:column;gap:1px;max-height:190px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:8px;">'+eventBoxes+'</div></div></div>'

    + '<div style="'+box+'">'+h('3. Carrier and opt-in')
    + '<div style="display:flex;align-items:flex-end;gap:18px;flex-wrap:wrap;">'
    + '<div style="display:flex;flex-direction:column;gap:6px;"><label style="'+lab+'">Carrier</label><select id="cc-carrier" onchange="ccRefresh()" style="'+inp+'min-width:140px;"><option value="clickatell">Clickatell</option><option value="twilio">Twilio</option></select></div>'
    + '<div style="display:flex;flex-direction:column;gap:6px;"><label style="'+lab+'">Opt-in scenario</label><select id="cc-scenario" onchange="ccRefresh()" style="'+inp+'min-width:170px;"><option value="current">Today\'s opt-in rate</option><option value="full">If everyone opted in</option></select></div>'
    + '<div style="display:flex;flex-direction:column;gap:6px;"><label style="'+lab+'">Today\'s opt-in %</label><input id="cc-optin" type="number" min="0.01" max="100" step="0.01" oninput="ccRefresh()" style="'+inp+'width:110px;"></div></div></div>'

    + '<div id="cc-compare" style="font-size:12px;color:var(--muted);line-height:1.7;margin-bottom:16px;"></div>'

    + '<div style="'+box+'">'+h('Cost by market')+'<table style="width:100%;border-collapse:collapse;"><tbody id="cc-by-market"></tbody></table></div>'
    + '<div style="'+box+'">'+h('Cost by message')+'<table style="width:100%;border-collapse:collapse;"><tbody id="cc-by-event"></tbody></table></div>'

    + '<details style="'+box+'"><summary style="cursor:pointer;font-weight:700;font-size:13px;">Optional: Iterable profile fee</summary>'
    + '<div style="font-size:11px;color:var(--muted);line-height:1.6;margin:10px 0 14px;">Only needed for a migration to Iterable. The plan includes 52,000,000 profiles. Above that, a fee applies ($0.50 per 1,000 profiles per month). Leave empty to ignore it.</div>'
    + '<div style="display:flex;gap:18px;flex-wrap:wrap;">'
    + '<div style="display:flex;flex-direction:column;gap:6px;"><label style="'+lab+'">B&amp;M profiles added</label><input id="cc-profiles" type="number" min="0" placeholder="not set" oninput="ccRefresh()" style="'+inp+'width:150px;"></div>'
    + '<div style="display:flex;flex-direction:column;gap:6px;"><label style="'+lab+'">Profiles already used</label><input id="cc-used" type="number" min="0" oninput="ccRefresh()" style="'+inp+'width:150px;"></div>'
    + '<div style="display:flex;flex-direction:column;gap:6px;"><label style="'+lab+'">Profile allowance</label><input id="cc-allow" type="number" min="0" oninput="ccRefresh()" style="'+inp+'width:150px;"></div></div>'
    + '<div id="cc-fee" style="font-size:13px;margin-top:12px;font-weight:600;"></div></details>'

    + '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;">'
    + '<button onclick="ccExportPng()" class="intent-pill" style="border:none;background:var(--purple);color:#fff;">Export PNG</button>'
    + '<button onclick="ccExportCsv()" class="intent-pill" style="border:none;">Export CSV</button></div>'
    + '<div id="cc-preview" style="display:none;margin-bottom:16px;"></div>'
    + '<div id="cc-note" style="font-size:11px;color:var(--muted);line-height:1.7;"></div>'
    + '</div>';

  document.getElementById('p15-content').innerHTML = html;
  ccWrite(S0);
  ccRefresh();
  if(window._pendingPreset){   // a Home button asked for a quick start
    const n = window._pendingPreset; window._pendingPreset = null;
    if(['today','optin','twilio','global'].indexOf(n) !== -1) ccPreset(n);
  }
}

// Put a state into the controls
function ccWrite(S){
  document.querySelectorAll('.cc-m').forEach(function(cb){ cb.checked = S.markets.indexOf(cb.value) !== -1; });
  document.querySelectorAll('.cc-e').forEach(function(cb){ cb.checked = S.events.indexOf(parseInt(cb.value,10)) !== -1; });
  const r = document.querySelector('input[name="cc-mode"][value="'+S.mode+'"]'); if(r) r.checked = true;
  document.getElementById('cc-carrier').value = S.carrier;
  document.getElementById('cc-scenario').value = S.scenario;
  document.getElementById('cc-optin').value = S.optin;
  document.getElementById('cc-profiles').value = (S.profiles === null || S.profiles === undefined) ? '' : S.profiles;
  document.getElementById('cc-used').value = S.profilesUsed || 0;
  document.getElementById('cc-allow').value = S.allowance;
}
// Read the controls into a state
function ccRead(){
  const raw = document.getElementById('cc-profiles').value.trim();
  const modeEl = document.querySelector('input[name="cc-mode"]:checked');
  return {
    markets: Array.from(document.querySelectorAll('.cc-m')).filter(function(c){ return c.checked; }).map(function(c){ return c.value; }),
    events: Array.from(document.querySelectorAll('.cc-e')).filter(function(c){ return c.checked; }).map(function(c){ return parseInt(c.value,10); }),
    mode: modeEl ? modeEl.value : 'live',
    carrier: document.getElementById('cc-carrier').value,
    scenario: document.getElementById('cc-scenario').value,
    optin: parseFloat(document.getElementById('cc-optin').value) || 100,
    profiles: raw === '' ? null : (parseFloat(raw) || 0),
    profilesUsed: parseFloat(document.getElementById('cc-used').value) || 0,
    allowance: parseFloat(document.getElementById('cc-allow').value) || 0,
  };
}

function ccMarkets(which){
  const D = window._imData;
  document.querySelectorAll('.cc-m').forEach(function(cb){
    cb.checked = which === 'all' ? true : which === 'none' ? false : which === 'us' ? cb.value === 'United States' : !!OBS.markets[cb.value];
  });
  ccRefresh();
}
function ccEvents(which){
  const D = window._imData, usLive = (D.LIVE_EVENTS['United States'] || []);
  document.querySelectorAll('.cc-e').forEach(function(cb){
    const i = parseInt(cb.value,10);
    cb.checked = which === 'all' ? true : which === 'none' ? false : usLive.indexOf(i) !== -1;
  });
  ccRefresh();
}
// Quick starts: the questions people used to answer with the older pages
function ccPreset(name){
  const D = window._imData;
  const all = Object.keys(D.ORDERS).sort();
  const base = {markets:all, mode:'live', events:[], carrier:'clickatell', scenario:'current'};
  const us = (D.LIVE_EVENTS['United States'] || []).slice();
  const p = name === 'optin' ? {scenario:'full'} : name === 'twilio' ? {carrier:'twilio'}
    : name === 'global' ? {mode:'pick', events:us} : {};
  const S = Object.assign({}, window._cc, base, p);
  window._cc = S; ccWrite(S); ccRefresh();
}

function ccRefresh(){
  const D = window._imData; if(!D || !document.getElementById('cc-headline')) return;
  const S = ccRead(); window._cc = S;
  document.getElementById('cc-e-picker').style.display = S.mode === 'pick' ? 'block' : 'none';
  document.getElementById('cc-m-count').textContent = S.markets.length+' of '+document.querySelectorAll('.cc-m').length+' selected';
  document.getElementById('cc-e-count').textContent = S.events.length+' of '+D.US_EVENTS.length+' selected';
  const R = ccCompute(D, S), T = R.tot, name = S.carrier === 'twilio' ? 'Twilio' : 'Clickatell';
  const fee = ccProfileFee(S.profiles, S.profilesUsed, S.allowance, CC_ITER.cpm);
  const diff = T.scenCost - T.todayCost, hasMk = R.rows.length > 0;

  const hl = document.getElementById('cc-headline');
  if(!S.markets.length) hl.innerHTML = '<span style="color:var(--muted);font-weight:500;">Pick at least one market below.</span>';
  else if(S.mode === 'pick' && !S.events.length) hl.innerHTML = '<span style="color:var(--muted);font-weight:500;">Pick at least one message below, or choose "What is live today".</span>';
  else hl.innerHTML = 'Your scenario costs about <span style="color:var(--purple);">'+ccMoney(T.scenCost)+' per year</span> in SMS with '+name+'. '
    + (Math.abs(diff) < 0.5 ? 'That is the same as today.' : 'That is <strong>'+ccMoney(Math.abs(diff))+'</strong> '+(diff > 0 ? 'more' : 'less')+' than the same markets cost today.')
    + (fee.cost > 0 ? ' Plus <strong>'+ccMoney(fee.cost)+' per year</strong> in Iterable profile fee.' : '');

  const set = function(id, v, n){ document.getElementById(id).textContent = v; document.getElementById(id+'-n').textContent = n; };
  set('cc-k-today', hasMk ? ccMoney(T.todayCost) : '—', hasMk ? ccNum(T.todaySms)+' SMS, what is live today, '+name+' rates' : ' ');
  set('cc-k-scen', hasMk ? ccMoney(T.scenCost) : '—', hasMk ? ccNum(T.scenSms)+' SMS'+(R.scale !== 1 ? ', everyone opted in (x'+R.scale.toFixed(2)+')' : '') : ' ');
  set('cc-k-diff', hasMk ? ccSigned(diff) : '—', fee.cost > 0 ? 'SMS only. Iterable fee: '+ccMoney(fee.cost)+' per year' : 'SMS per year');

  const cmp = document.getElementById('cc-compare');
  if(R.compare.markets){
    const a = R.compare.clickatell, b = R.compare.twilio, d = b - a;
    cmp.innerHTML = '<strong>Carrier check</strong> (same scenario, '+R.compare.markets+' market'+(R.compare.markets>1?'s':'')+' priced by both): Clickatell '+ccMoney(a)+' &middot; Twilio '+ccMoney(b)
      + (Math.abs(d) < 0.5 ? '' : ' &middot; Twilio is '+ccMoney(Math.abs(d))+' '+(d > 0 ? 'more' : 'less')+' per year');
  } else cmp.innerHTML = '';

  const bn = document.getElementById('cc-banner'), notes = [];
  if(S.markets.length){
    const unm = S.markets.filter(function(c){ return !OBS.markets[c]; }).length, meas = S.markets.length - unm;
    notes.push((meas ? '<strong>'+meas+' market'+(meas>1?'s are':' is')+' measured</strong> with real 2026 rates from Ria BI. ' : '')
      + (unm ? '<strong>'+unm+' market'+(unm>1?'s are':' is')+' estimated</strong> with the European average. ' : '')
      + 'Messages not live today are costed at the full-coverage rate (US 2026).');
  }
  if(R.excluded.length) notes.push('<strong>'+R.excluded.length+' market'+(R.excluded.length>1?'s':'')+' left out:</strong> no '+name+' rate on file ('+R.excluded.slice(0,8).map(esc).join(', ')+(R.excluded.length>8?', ...':'')+').');
  bn.style.display = notes.length ? 'block' : 'none'; bn.innerHTML = notes.join('<br>');

  const th = 'padding:6px 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);';
  const td = 'padding:8px 10px;font-size:12px;text-align:right;white-space:nowrap;';
  const head = function(first){ return '<tr><td style="'+th+'">'+first+'</td><td style="'+th+'text-align:right;">Today per year</td><td style="'+th+'text-align:right;">Scenario SMS</td><td style="'+th+'text-align:right;">Scenario per year</td><td style="'+th+'text-align:right;">Difference</td></tr>'; };
  const row = function(label, a, b, sms){ return '<tr style="border-top:1px solid var(--border);"><td style="padding:8px 10px;font-size:12px;">'+label+'</td>'
    + '<td style="'+td+'color:var(--muted);">'+ccMoney(a)+'</td><td style="'+td+'">'+ccNum(sms)+'</td><td style="'+td+'font-weight:600;">'+ccMoney(b)+'</td><td style="'+td+'">'+ccSigned(b-a)+'</td></tr>'; };
  document.getElementById('cc-by-market').innerHTML = head('Market') + R.rows.slice().sort(function(x,y){ return y.scenCost - x.scenCost; }).map(function(r){
    return row(esc(r.c)+(r.measured ? '' : ' <span style="color:var(--hint);font-size:10px;">(estimate)</span>'), r.todayCost, r.scenCost, r.scenSms); }).join('');
  document.getElementById('cc-by-event').innerHTML = head('Message') + R.evRows.slice().sort(function(x,y){ return y.scenCost - x.scenCost || y.todayCost - x.todayCost; }).map(function(e){
    return row(esc(e.name), e.todayCost, e.scenCost, e.scenSms); }).join('');

  document.getElementById('cc-fee').textContent = S.profiles === null ? ''
    : (fee.over > 0 ? ccNum(fee.over)+' profiles above the allowance: '+ccMoney(fee.cost)+' per year.' : 'Within the allowance, no fee.');
  document.getElementById('cc-note').innerHTML = 'Estimate based on 2026 data. Order volumes are yearly (2026 data annualised for measured markets). '
    + 'The older calculators (SMS Costs, Global deployment, Full opt-in impact) use 2025 data and are still available by link.';

  try{ localStorage.setItem(CC_KEY, JSON.stringify(Object.assign({version:1}, S))); }catch(e){}
}

/* ── Export ── */
function ccDownload(url, name){ const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a); }
function ccExportCsv(){
  const D = window._imData, S = ccRead(), R = ccCompute(D, S);
  if(!R.rows.length) return;
  const q = function(s){ return '"'+String(s).replace(/"/g,'""')+'"'; };
  const lines = ['Section,Name,Today cost per year (USD),Scenario SMS per year,Scenario cost per year (USD),Difference (USD)'];
  R.rows.forEach(function(r){ lines.push(['Market', q(r.c), r.todayCost.toFixed(2), Math.round(r.scenSms), r.scenCost.toFixed(2), (r.scenCost-r.todayCost).toFixed(2)].join(',')); });
  R.evRows.forEach(function(e){ lines.push(['Message', q(e.name), e.todayCost.toFixed(2), Math.round(e.scenSms), e.scenCost.toFixed(2), (e.scenCost-e.todayCost).toFixed(2)].join(',')); });
  ccDownload(URL.createObjectURL(new Blob([lines.join('\n')], {type:'text/csv'})), 'cost-calculator.csv');
}
function ccExportPng(){
  const D = window._imData, S = ccRead(), R = ccCompute(D, S);
  const rows = R.rows.slice().sort(function(a,b){ return b.scenCost - a.scenCost; }).slice(0, 25);
  if(!rows.length) return;
  const accent = (getComputedStyle(document.documentElement).getPropertyValue('--purple') || '').trim() || '#FF6100';
  const W = 1100, PAD = 40, SC = 2, RH = 30, H = 230 + rows.length*RH + 90;
  const font = function(w, s){ return w+' '+s+'px -apple-system, "Segoe UI", Helvetica, Arial, sans-serif'; };
  const cv = document.createElement('canvas'); cv.width = W*SC; cv.height = H*SC;
  const g = cv.getContext('2d'); g.scale(SC,SC);
  g.fillStyle = '#FFFFFF'; g.fillRect(0,0,W,H); g.fillStyle = accent; g.fillRect(0,0,W,8);
  g.fillStyle = '#1A1A1A'; g.font = font('700', 26); g.fillText('SMS cost scenario per year', PAD, 55);
  g.fillStyle = '#6B6B6B'; g.font = font('400', 13);
  g.fillText((S.carrier === 'twilio' ? 'Twilio' : 'Clickatell')+' · '+(S.mode === 'live' ? 'what is live today' : S.events.length+' messages picked')+' · '+(S.scenario === 'full' ? 'if everyone opted in' : 'today\'s opt-in')+' · '+R.rows.length+' markets · '+new Date().toISOString().slice(0,10), PAD, 78);
  const boxes = [['TODAY', ccMoney(R.tot.todayCost)], ['SCENARIO', ccMoney(R.tot.scenCost)], ['DIFFERENCE', ccSigned(R.tot.scenCost-R.tot.todayCost)]];
  const bw = (W-2*PAD-2*16)/3;
  boxes.forEach(function(b,k){ const x = PAD + k*(bw+16);
    g.fillStyle = k===1 ? accent : '#F5F5F5'; g.fillRect(x,100,bw,72);
    g.fillStyle = k===1 ? '#FFFFFF' : '#6B6B6B'; g.font = font('700', 10); g.fillText(b[0], x+16, 124);
    g.fillStyle = k===1 ? '#FFFFFF' : '#1A1A1A'; g.font = font('700', 26); g.fillText(b[1], x+16, 157); });
  let y = 200; g.font = font('700', 10); g.fillStyle = '#6B6B6B'; g.fillText('MARKET', PAD, y);
  g.textAlign = 'right'; g.fillText('TODAY', 700, y); g.fillText('SCENARIO', 880, y); g.fillText('DIFFERENCE', W-PAD, y); g.textAlign = 'left'; y += 12;
  rows.forEach(function(r){ y += RH;
    g.fillStyle = '#1A1A1A'; g.font = font('600', 13); g.fillText(r.c, PAD, y);
    g.textAlign = 'right'; g.font = font('400', 13); g.fillStyle = '#6B6B6B'; g.fillText(ccMoney(r.todayCost), 700, y);
    g.fillStyle = '#1A1A1A'; g.font = font('700', 13); g.fillText(ccMoney(r.scenCost), 880, y);
    g.font = font('400', 13); g.fillText(ccSigned(r.scenCost-r.todayCost), W-PAD, y); g.textAlign = 'left'; });
  g.fillStyle = '#6B6B6B'; g.font = font('400', 11);
  g.fillText('Estimate from 2026 data (Ria BI, Messages Library). Unmeasured markets use the European average.'+(R.rows.length > rows.length ? ' Top '+rows.length+' markets shown.' : ''), PAD, y+40);
  g.fillStyle = '#AAAAAA'; g.fillText('Ria B&M Messaging Hub', PAD, y+60);
  const url = cv.toDataURL('image/png'), pv = document.getElementById('cc-preview');
  pv.style.display = 'block';
  pv.innerHTML = '<div style="display:flex;gap:12px;align-items:center;margin-bottom:8px;"><a href="'+url+'" download="cost-calculator.png" class="intent-pill" style="border:none;text-decoration:none;background:var(--purple);color:#fff;">Download PNG</a><span style="font-size:11px;color:var(--muted);">Preview</span></div><img src="'+url+'" style="max-width:100%;border:1px solid var(--border);border-radius:8px;">';
  ccDownload(url, 'cost-calculator.png');
}
