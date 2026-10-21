// Page: Iterable migration cost simulator
/* ── ITERABLE MIGRATION COST SIMULATOR (CGD-6450) ── */
function renderIterableMigration(){
  const SAVE_KEY = 'riaMessagingHub_iterableMigration';
  const DATA_VERSION = 2;
  let saved = null;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const p = raw ? JSON.parse(raw) : null;
    saved = (p && p.version === DATA_VERSION) ? p : null;
  } catch(e){ saved = null; }

  const CLICKATELL = SHARED.CLICKATELL_RATES;
  const TWILIO = SHARED.TWILIO_RATES;
  const ORDERS = Object.assign({}, SHARED.ORDERS);   // copy: the 2026 measured markets overwrite some values below

  // Orders per year for the 9 measured markets: real 2026 transactions, annualised (365/286).
  Object.keys(OBS.markets).forEach(function(m){ ORDERS[m] = Math.round(OBS.markets[m].tx*365/OBS.days); });

  // Full-coverage event rates (p, % of transactions) = what the US sends in 2026 (Ria BI, 1 Jan to 13 Oct 2026),
  // with the real SMS billing segments. Markets with 2026 data (OBS) use their own real rates for what is live today;
  // the others use the European average. The US rate is only used for what would happen with full coverage.
  const US_EVENTS = [
    {n:'Transaction Ready for Pickup', p:47.3133, s:2},{n:'Transaction Paid', p:36.0787, s:2},
    {n:'Transaction Pick Up Reminder (3 Days)', p:1.6374, s:3},{n:'Transaction Canceled', p:0.3645, s:2},
    {n:'Strategic Retail Partners - Refund Completed', p:0.3082, s:1},{n:'Strategic Retail Partners - Available for Refund', p:0.3072, s:2},
    {n:'Transaction Needs Information', p:0.1245, s:2},{n:'Transaction Pick Up Reminder (7 Days)', p:0.2147, s:2},
    {n:'Transaction Resent', p:0.0707, s:2},{n:'Customer Opt-In', p:0.0738, s:1},
    {n:'Transaction Pick Up Reminder (14 Days)', p:0.0838, s:2},{n:'Agent activated due to paid credit', p:0.0939, s:2},
    {n:'Transaction Rejected', p:0.0393, s:2},{n:'Requires interview', p:0.019, s:2},
    {n:'Refund Reminder (3 Day)', p:0.0435, s:2},{n:'Refund Reminder (7 Day)', p:0.0273, s:2},
    {n:'Refund Reminder (14 Day)', p:0.021, s:2},{n:'Agent suspended due to past-due balance', p:0.0438, s:2},
    {n:'Transaction Ready for Refund', p:0.0164, s:2},{n:'Agent suspended 7 days reminder', p:0.0042, s:2},
    {n:'Agent suspended 15 days reminder', p:0.0039, s:3},{n:'Transaction Cancelled (Time Limit Expired)', p:0.0028, s:2},
    {n:'Refund Reminder (1 Day)', p:0.0007, s:2},{n:'Refund Reminder (2 Day)', p:0.0006, s:2},
    {n:'Refund Reminder (20 Day)', p:0.0003, s:2},{n:'Transaction Pick Up Reminder (1 Day)', p:0.0001, s:1},
    {n:'Transaction Pick Up Reminder (2 Days)', p:0.0001, s:3},{n:'Transaction Sent To Be Paid', p:0.0, s:2},
    {n:'Transaction Cancelled (Test Transaction)', p:0.0, s:1},
    // Added in 2026: events seen in the Ria BI data of the measured markets. Rate = highest rate observed in a measured market.
    {n:'Fraud Model - Transaction Needs Information', p:0.0129, s:2},
    {n:'Payment Instructions Sent', p:3.8854, s:2},
    {n:'Transaction Expired', p:0.2356, s:2},
    {n:'Transaction Cancelled (Incorrect Account Details)', p:0.1203, s:2},
    {n:'Invalid Payment', p:0.063, s:2},
    {n:'Transaction Cancelled (Customer Requested)', p:0.0279, s:2},
    {n:'Transaction Entered', p:0.0002, s:2},
  ];

  // Which SMS events are actually LIVE in each market today, from the
  // Messages Library. Values are indexes into US_EVENTS. This is real data:
  // the US runs 25 events, while most other markets run only 1 to 4.
  const LIVE_EVENTS = {"Australia":[0,1,18,21],"Austria":[0,18],"Belgium":[0,6,18],"Canada":[0,1,6,13],"Colombia":[0],"Czech Republic":[18],"Denmark":[0,18],"Estonia":[18],"Finland":[0,18],"France":[0,1,18],"French Guiana":[18],"Germany":[0,1,18],"Greece":[18],"Guadeloupe":[18],"Hungary":[18],"Ireland":[18],"Italy":[0,18],"Latvia":[18],"Lebanon":[0],"Luxembourg":[0,18],"Malaysia":[3,18],"Martinique":[18],"Mayotte":[18],"Netherlands":[0,18],"New Zealand":[1,21],"Norway":[0,18],"Oman":[0],"Poland":[0,18],"Portugal":[18],"Reunion":[18],"Romania":[0,18],"Singapore":[7,18,21],"Slovakia":[18],"South Africa":[0],"Spain":[0,18],"Sweden":[0,18],"Switzerland":[0,18],"United Arab Emirates":[0,1],"United Kingdom":[0,18],"United States":[0,1,2,3,4,5,6,7,8,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,26]};
  libApplyToModel(US_EVENTS, LIVE_EVENTS);   // live events and billing units follow the Messages Library

  // Iterable contract: only the profile allowance matters for new cost.
  const ITER = { profileAllowance: 52000000, profileCPM: 0.50 };   // $ per 1,000 profiles/month

  const countries = Object.keys(ORDERS).sort();
  const savedScope = (saved && Array.isArray(saved.scope)) ? saved.scope : ['United States'];

  const checkboxes = countries.map(function(c){
    const on = savedScope.indexOf(c) !== -1;
    return '<label style="display:flex;align-items:center;gap:6px;font-size:11px;padding:3px 6px;cursor:pointer;white-space:nowrap;">'
      + '<input type="checkbox" class="im-cc" value="'+esc(c)+'"'+(on?' checked':'')+' onchange="recalcIterableMigration()" style="cursor:pointer;">'
      + esc(c)+'</label>';
  }).join('');

  const html = '<div class="calc-wrap">'

    // ── Plain-language explainer ──
    + '<div style="background:var(--purple-bg);border:1px solid var(--purple);border-radius:var(--radius);padding:16px 20px;margin-bottom:20px;font-size:13px;color:var(--text);line-height:1.75;">'
    + '<div style="font-weight:700;margin-bottom:6px;">What this page answers</div>'
    + 'Pick the markets and the messages you want to send. This page shows <strong>how much the SMS would cost per year</strong>, using the carrier rates and real 2026 event data from Ria BI (9 markets measured, the rest estimated with the European average).<br>'
    + '</div>'

    // ── Headline sentence ──
    + '<div id="im-headline" style="font-size:19px;font-weight:700;color:var(--text);line-height:1.5;margin-bottom:18px;">&nbsp;</div>'

    // ── SMS cost ──
    + '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:10px;">'
    + '<div style="flex:1;min-width:250px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:18px 20px;">'
    + '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:4px;">SMS sending cost per year</div>'
    + '<div id="im-carrier-cost" style="font-size:26px;font-weight:700;color:var(--text);">&mdash;</div>'
    + '<div id="im-carrier-note" style="font-size:11px;color:var(--muted);margin-top:4px;">&nbsp;</div></div>'
    + '<div style="flex:1;min-width:250px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:18px 20px;">'
    + '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:4px;">Iterable profile fee per year</div>'
    + '<div id="im-profile-cost" style="font-size:26px;font-weight:700;color:var(--text);">&mdash;</div>'
    + '<div id="im-profile-note" style="font-size:11px;color:var(--muted);margin-top:4px;">&nbsp;</div></div>'
    + '</div>'

    + '<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:18px 24px;margin-bottom:20px;">'
    + '<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:10px;">Cost by market</div>'
    + '<table style="width:100%;border-collapse:collapse;"><tbody id="im-breakdown"></tbody></table></div>'

    + '<div id="im-proxy-banner" style="display:none;background:#FFF7ED;border:1px solid var(--orange);border-radius:var(--radius);padding:10px 16px;margin-bottom:18px;font-size:11px;color:#7A3300;line-height:1.6;"></div>'

    // ── Scope picker ──
    + '<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:20px 24px;margin-bottom:18px;">'
    + '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:12px;">'
    + '<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);">Which markets are we migrating?</div>'
    + '<button onclick="imScopePreset(\'us\')" class="intent-pill" style="border:none;">US only</button>'
    + '<button onclick="imScopePreset(\'all\')" class="intent-pill" style="border:none;">All countries</button>'
    + '<button onclick="imScopePreset(\'none\')" class="intent-pill" style="border:none;">Clear</button>'
    + '<span id="im-scope-count" style="font-size:11px;color:var(--muted);"></span>'
    + '</div>'
    + '<div style="display:flex;flex-wrap:wrap;gap:2px;max-height:150px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:8px;">'
    + checkboxes + '</div></div>'

    // ── Event scope picker ──
    + '<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:20px 24px;margin-bottom:18px;">'
    + '<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:10px;">Which messages are we sending?</div>'
    + '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;">'
    + '<label style="display:flex;align-items:center;gap:7px;font-size:12px;cursor:pointer;padding:7px 12px;border:1px solid var(--border-mid);border-radius:8px;">'
    + '<input type="radio" name="im-evmode" value="live" checked onchange="imToggleEventMode()" style="cursor:pointer;">'
    + '<span><strong>What&rsquo;s live today</strong> <span style="color:var(--muted);">&mdash; only the events each market already sends</span></span></label>'
    + '<label style="display:flex;align-items:center;gap:7px;font-size:12px;cursor:pointer;padding:7px 12px;border:1px solid var(--border-mid);border-radius:8px;">'
    + '<input type="radio" name="im-evmode" value="custom" onchange="imToggleEventMode()" style="cursor:pointer;">'
    + '<span><strong>Pick events</strong> <span style="color:var(--muted);">&mdash; model activating more</span></span></label>'
    + '</div>'
    + '<div id="im-event-picker" style="display:none;">'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;align-items:center;">'
    + '<button onclick="imEventPreset(\'all\')" class="intent-pill" style="border:none;">All events</button>'
    + '<button onclick="imEventPreset(\'us\')" class="intent-pill" style="border:none;">Match US coverage</button>'
    + '<button onclick="imEventPreset(\'none\')" class="intent-pill" style="border:none;">Clear</button>'
    + '<span id="im-event-count" style="font-size:11px;color:var(--muted);"></span></div>'
    + '<div style="display:flex;flex-direction:column;gap:1px;max-height:190px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:8px;">'
    + US_EVENTS.map(function(e,i){
        return '<label style="display:flex;align-items:center;gap:7px;font-size:11px;padding:3px 5px;cursor:pointer;">'
          + '<input type="checkbox" class="im-ev" value="'+i+'" checked onchange="recalcIterableMigration()" style="cursor:pointer;">'
          + '<span style="flex:1;">'+esc(e.n)+'</span>'
          + '<span style="color:var(--hint);font-size:10px;white-space:nowrap;">'+e.p.toFixed(3)+'% of orders &middot; '+e.s+' seg</span></label>';
      }).join('')
    + '</div></div>'
    + '<div id="im-live-note" style="font-size:11px;color:var(--muted);margin-top:4px;"></div>'
    + '</div>'

    // ── Scenario controls ──
    + '<div style="display:flex;align-items:flex-end;gap:18px;flex-wrap:wrap;padding-bottom:18px;margin-bottom:8px;">'
    + '<div style="display:flex;flex-direction:column;gap:6px;">'
    + '<label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">Carrier</label>'
    + '<select id="im-carrier" onchange="recalcIterableMigration()" style="padding:8px 12px;border-radius:7px;border:1px solid var(--border-mid);background:var(--card);font-size:13px;color:var(--text);cursor:pointer;min-width:140px;">'
    + '<option value="clickatell">Clickatell</option><option value="twilio">Twilio</option></select></div>'
    + '<div style="display:flex;flex-direction:column;gap:6px;">'
    + '<label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">Opt-in scenario</label>'
    + '<select id="im-scenario" onchange="recalcIterableMigration()" style="padding:8px 12px;border-radius:7px;border:1px solid var(--border-mid);background:var(--card);font-size:13px;color:var(--text);cursor:pointer;min-width:170px;">'
    + '<option value="current">Today\'s opt-in rate</option><option value="full">If everyone opted in</option></select></div>'
    + '<div style="display:flex;flex-direction:column;gap:6px;">'
    + '<label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">Today\'s opt-in %</label>'
    + '<input id="im-optin" type="number" min="0.01" max="100" step="0.01" value="64" oninput="recalcIterableMigration()" style="padding:8px 12px;border-radius:7px;border:1px solid var(--border-mid);background:var(--card);font-size:13px;color:var(--text);width:100px;"></div>'
    + '</div>'

    + '<div style="border:1px solid var(--border);border-radius:var(--radius);padding:18px 24px;margin-top:18px;">'
    + '<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:6px;">Profiles</div>'
    + '<div style="font-size:11px;color:var(--muted);line-height:1.6;margin-bottom:14px;">The contract includes 52,000,000 profiles. If the total goes above that, a fee applies ($0.50 per 1,000 profiles per month). Enter the numbers to see if we would go over.</div>'
    + '<div style="display:flex;gap:18px;flex-wrap:wrap;">'
    + '<div style="display:flex;flex-direction:column;gap:6px;">'
    + '<label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">B&amp;M profiles added</label>'
    + '<input id="im-profiles" type="number" min="0" placeholder="unknown" oninput="recalcIterableMigration()" style="padding:8px 12px;border-radius:7px;border:1px solid var(--orange);background:var(--card);font-size:13px;color:var(--text);width:150px;">'
    + '<div style="font-size:9px;color:var(--hint);">Unique customers, not orders</div></div>'
    + '<div style="display:flex;flex-direction:column;gap:6px;">'
    + '<label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">Profiles already used</label>'
    + '<input id="im-profiles-used" type="number" min="0" value="0" oninput="recalcIterableMigration()" style="padding:8px 12px;border-radius:7px;border:1px solid var(--border-mid);background:var(--card);font-size:13px;color:var(--text);width:150px;">'
    + '<div style="font-size:9px;color:var(--hint);">By Digital today</div></div>'
    + '<div style="display:flex;flex-direction:column;gap:6px;">'
    + '<label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">Profile allowance</label>'
    + '<input id="im-profile-allow" type="number" min="0" value="52000000" oninput="recalcIterableMigration()" style="padding:8px 12px;border-radius:7px;border:1px solid var(--border-mid);background:var(--card);font-size:13px;color:var(--text);width:150px;"></div>'
    + '</div></div>'

    + '</div>';

  document.getElementById('p11-content').innerHTML = html;
  window._imData = {CLICKATELL:CLICKATELL, TWILIO:TWILIO, ORDERS:ORDERS, US_EVENTS:US_EVENTS, ITER:ITER, LIVE_EVENTS:LIVE_EVENTS};

  if(saved){
    if(saved.carrier) document.getElementById('im-carrier').value = saved.carrier;
    if(saved.scenario) document.getElementById('im-scenario').value = saved.scenario;
    if(saved.optin !== undefined) document.getElementById('im-optin').value = saved.optin;
    if(saved.profiles !== undefined && saved.profiles !== null) document.getElementById('im-profiles').value = saved.profiles;
    if(saved.profilesUsed !== undefined) document.getElementById('im-profiles-used').value = saved.profilesUsed;
    if(saved.evMode){
      const el = document.querySelector('input[name="im-evmode"][value="'+saved.evMode+'"]');
      if(el) el.checked = true;
      document.getElementById('im-event-picker').style.display = saved.evMode === 'custom' ? 'block' : 'none';
    }
    if(Array.isArray(saved.events)){
      document.querySelectorAll('.im-ev').forEach(function(cb){
        cb.checked = saved.events.indexOf(parseInt(cb.value,10)) !== -1;
      });
    }
  }
  recalcIterableMigration();
}

function imToggleEventMode(){
  const mode = document.querySelector('input[name="im-evmode"]:checked').value;
  document.getElementById('im-event-picker').style.display = mode === 'custom' ? 'block' : 'none';
  recalcIterableMigration();
}

function imEventPreset(which){
  const D = window._imData;
  const usLive = (D && D.LIVE_EVENTS['United States']) || [];
  document.querySelectorAll('.im-ev').forEach(function(cb){
    const i = parseInt(cb.value,10);
    if(which === 'all') cb.checked = true;
    else if(which === 'none') cb.checked = false;
    else if(which === 'us') cb.checked = usLive.indexOf(i) !== -1;
  });
  recalcIterableMigration();
}

function imScopePreset(which){
  document.querySelectorAll('.im-cc').forEach(function(cb){
    if(which === 'all') cb.checked = true;
    else if(which === 'none') cb.checked = false;
    else if(which === 'us') cb.checked = (cb.value === 'United States');
  });
  recalcIterableMigration();
}

function recalcIterableMigration(){
  const D = window._imData; if(!D) return;
  const carrier  = document.getElementById('im-carrier').value;
  const scenario = document.getElementById('im-scenario').value;
  const optin    = parseFloat(document.getElementById('im-optin').value) || 100;
  const rates    = carrier === 'twilio' ? D.TWILIO : D.CLICKATELL;
  const carrierName = carrier === 'twilio' ? 'Twilio' : 'Clickatell';

  const scope = Array.from(document.querySelectorAll('.im-cc')).filter(function(cb){ return cb.checked; }).map(function(cb){ return cb.value; });
  const scale = scenario === 'full' ? (1/(optin/100)) : 1;
  const evModeEl = document.querySelector('input[name="im-evmode"]:checked');
  const evMode = evModeEl ? evModeEl.value : 'live';
  const chosenEvents = Array.from(document.querySelectorAll('.im-ev')).filter(function(cb){ return cb.checked; }).map(function(cb){ return parseInt(cb.value,10); });

  // Cost for a given country using a given set of event indexes
  // mode 'today': what the market really sends today. mode 'full': live events at today's rate, the others at full coverage.
  function costFor(country, evIdxs, mode){
    const orders = D.ORDERS[country] || 0;
    const rate = rates[country];
    if(rate === undefined) return null;
    let segs = 0, evs = 0;
    evIdxs.forEach(function(i){
      const e = D.US_EVENTS[i]; if(!e) return;
      const t = obsTodayRate(D,country,i);
      const pct = mode === 'full' ? (obsIsLive(D,country,i) ? t : obsFullRate(D,country,i)) : t;
      const fires = (pct/100) * orders * scale;
      evs  += fires;
      segs += fires * e.s;
    });
    return {segments: segs, events: evs, cost: segs * rate};
  }

  let segments = 0, events = 0, carrierCost = 0;
  let baselineCost = 0;   // what these markets send today
  const missingRate = [];
  const marketRows = [];  // one row per market for the breakdown table
  let newlyActivated = 0; // count of country+event combos being switched on

  scope.forEach(function(c){
    const liveIdxs = obsLiveIdx(D,c);
    const useIdxs = evMode === 'live' ? liveIdxs : chosenEvents;
    const r = costFor(c, useIdxs, evMode === 'live' ? 'today' : 'full');
    if(r === null){ if((D.ORDERS[c]||0) > 0) missingRate.push(c); return; }
    segments += r.segments; events += r.events; carrierCost += r.cost;
    marketRows.push({c:c, events:r.events, cost:r.cost, measured:!!OBS.markets[c]});

    const b = costFor(c, liveIdxs, 'today');
    if(b) baselineCost += b.cost;
    if(evMode === 'custom'){
      useIdxs.forEach(function(i){ if(!obsIsLive(D,c,i)) newlyActivated++; });
    }
  });

  function money(n){ return '$'+n.toLocaleString('en-US',{maximumFractionDigits:0}); }
  function num(n){ return n.toLocaleString('en-US',{maximumFractionDigits:0}); }

  // Scope label
  const total = document.querySelectorAll('.im-cc').length;
  let scopeLabel;
  if(scope.length === 0) scopeLabel = 'no markets';
  else if(scope.length === total) scopeLabel = 'all markets';
  else if(scope.length === 1) scopeLabel = scope[0];
  else if(scope.length <= 3) scopeLabel = scope.slice(0,-1).join(', ')+' and '+scope[scope.length-1];
  else scopeLabel = scope.length+' markets';
  document.getElementById('im-scope-count').textContent = scope.length+' of '+total+' selected';

  // Profile fee (only applies above the contract allowance)
  const profilesRaw  = document.getElementById('im-profiles').value.trim();
  const profiles     = profilesRaw === '' ? null : (parseFloat(profilesRaw) || 0);
  const profilesUsed = parseFloat(document.getElementById('im-profiles-used').value) || 0;
  const profileAllow = parseFloat(document.getElementById('im-profile-allow').value) || 0;
  const profileOverUnits = profiles === null ? null : Math.max(0, (profiles + profilesUsed) - profileAllow);
  const profileOverCost  = profileOverUnits === null ? 0 : (profileOverUnits/1000) * D.ITER.profileCPM * 12;

  // Headline sentence
  const hl = document.getElementById('im-headline');
  if(!scope.length){
    hl.innerHTML = '<span style="color:var(--muted);font-weight:500;">Pick at least one market below to see the cost.</span>';
  } else {
    const isLive = evMode === 'live';
    const what = isLive ? 'what is live today' : (chosenEvents.length+' chosen message'+(chosenEvents.length===1?'':'s'));
    hl.innerHTML = 'Sending '+what+' in <strong>'+esc(scopeLabel)+'</strong> costs about '
      + '<span style="color:var(--purple);">'+money(carrierCost)+' per year</span> in SMS.'
      + ((!isLive && newlyActivated > 0 && carrierCost > baselineCost) ? ' That is <strong>'+money(Math.max(0, carrierCost - baselineCost))+'</strong> more than today.' : '')
      + (profileOverCost > 0 ? ' Plus <strong>'+money(profileOverCost)+' per year</strong> in Iterable profile fee.' : '');
  }

  document.getElementById('im-carrier-cost').textContent = money(carrierCost);
  document.getElementById('im-carrier-note').textContent = carrierName+' rates · '+scope.length+' market'+(scope.length===1?'':'s');
  document.getElementById('im-profile-cost').textContent = profiles === null ? 'Not set' : money(profileOverCost);
  document.getElementById('im-profile-note').textContent = profiles === null
    ? 'Enter B&M profiles added below to check the '+num(profileAllow)+' allowance'
    : (profileOverUnits > 0 ? num(profileOverUnits)+' profiles above the allowance' : 'Within the '+num(profileAllow)+' allowance, no fee');

  // Event coverage context
  const evCountEl = document.getElementById('im-event-count');
  if(evCountEl) evCountEl.textContent = chosenEvents.length+' of '+D.US_EVENTS.length+' events selected';
  const liveNote = document.getElementById('im-live-note');
  if(liveNote){
    if(!scope.length){ liveNote.textContent = ''; }
    else if(evMode === 'live'){
      const counts = scope.map(function(c){ return obsLiveIdx(D,c).length; });
      const totalLive = counts.reduce(function(a,b){ return a+b; },0);
      const noneLive = scope.filter(function(c){ return !obsLiveIdx(D,c).length; });
      liveNote.innerHTML = 'Using what each market really sends today: '+totalLive+' country+event combinations live across '+scope.length+' market'+(scope.length===1?'':'s')+'.'
        + (noneLive.length ? ' <strong>'+noneLive.length+'</strong> selected market'+(noneLive.length>1?'s have':' has')+' no live SMS events at all, so contribute nothing here.' : '');
    } else {
      const extra = newlyActivated > 0
        ? ' <strong>'+newlyActivated+'</strong> country+event combination'+(newlyActivated>1?'s':'')+' would be newly activated.'+(carrierCost > baselineCost ? ' This is <strong>'+money(carrierCost - baselineCost)+'</strong>/year more than these markets spend today.' : '')
        : ' This matches what these markets already send, so no new SMS cost.';
      liveNote.innerHTML = 'Modelling a chosen event set across all selected markets.'+extra;
    }
  }

  // Banner
  const banner = document.getElementById('im-proxy-banner');
  const notes = [];
  const nonUS = scope.filter(function(c){ return c !== 'United States'; });
  if(nonUS.length){
    const unm = scope.filter(function(c){ return !OBS.markets[c]; });
    const meas = scope.length - unm.length;
    notes.push((meas ? '<strong>'+meas+' market'+(meas>1?'s are':' is')+' measured</strong> with real 2026 event rates from Ria BI. ' : '')
      + (unm.length ? '<strong>'+unm.length+' market'+(unm.length>1?'s are':' is')+' estimated:</strong> no 2026 data, so the European average rate is used for the events live in the Messages Library. ' : '')
      + 'Events not live today are costed at the full-coverage rate (US 2026 rate).');
  }
  if(missingRate.length){
    notes.push('<strong>'+missingRate.length+' selected market'+(missingRate.length>1?'s':'')+' excluded</strong> — no '+carrierName+' rate on file: '+missingRate.slice(0,10).join(', ')+(missingRate.length>10?', and '+(missingRate.length-10)+' more':'')+'.');
  }
  if(notes.length){ banner.style.display='block'; banner.innerHTML = notes.join('<br>'); }
  else { banner.style.display='none'; }

  // Breakdown by market
  const th = 'padding:6px 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);';
  const head = '<tr><td style="'+th+'">Market</td><td style="'+th+'text-align:right;">SMS per year</td><td style="'+th+'text-align:right;">Cost per year</td></tr>';
  const rowsHtml = head + marketRows.sort(function(a,b){ return b.cost - a.cost; }).map(function(r){
    return '<tr style="border-top:1px solid var(--border);">'
      + '<td style="padding:8px 10px;font-size:12px;color:var(--text);">'+esc(r.c)+(r.measured ? '' : ' <span style="color:var(--hint);font-size:10px;">(estimate)</span>')+'</td>'
      + '<td style="padding:8px 10px;font-size:12px;text-align:right;color:var(--text);white-space:nowrap;">'+num(r.events)+'</td>'
      + '<td style="padding:8px 10px;font-size:12px;text-align:right;color:var(--text);white-space:nowrap;">'+money(r.cost)+'</td></tr>';
  }).join('');
  document.getElementById('im-breakdown').innerHTML = rowsHtml;

  try{
    localStorage.setItem('riaMessagingHub_iterableMigration', JSON.stringify({
      version:2, scope:scope, carrier:carrier, scenario:scenario, optin:optin,
      profiles: profiles, profilesUsed: profilesUsed,
      evMode: evMode, events: chosenEvents,
    }));
  } catch(e){}
}

