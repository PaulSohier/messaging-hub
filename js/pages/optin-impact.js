// Pages: Opt-in cost impact (flat and by journey)
/* ── FULL OPT-IN COST IMPACT (Nick's model) ── */
function renderOptInImpact(){
  const OI_SAVE_KEY = 'riaMessagingHub_optInImpact';
  const OI_DATA_VERSION = 6; // bump this whenever the default event data changes, to force a one-time reset of saved values
  function loadOptInSaved(){
    try{
      const raw = localStorage.getItem(OI_SAVE_KEY);
      if(!raw) return null;
      const parsed = JSON.parse(raw);
      if(parsed.version !== OI_DATA_VERSION) return null; // stale save from before this data update — ignore it
      return parsed;
    } catch(e){ return null; }
  }
  const oiSaved = loadOptInSaved();

  const SMS_COSTS = SHARED.CLICKATELL_RATES;
  const COUNTRY_ORDERS = SHARED.ORDERS;

  // Real US events, full-year 2025 (same period as the SMS Cost Calculator).
  // "msgs" = the real, dominant SMS billing segment count for that event
  // (160 chars = 1 segment, computed per real US message variant — matching
  // the US scope of everything else here — then taking the most
  // common value across every live SMS variant found for that event — never
  // a fractional "1.7 messages", since no single message is ever sent that
  // way). Events with no live SMS content in the Library yet (Customer
  // Opt-In, Pick Up Reminder 1 Day, the test-transaction row) are left at 1 —
  // unmeasured, not guessed. The "Fraud Model -" events didn't exist in 2025
  // (a system introduced sometime in 2026), so they're excluded here.
  // All editable via the "Adjust assumptions" panel below the main view.
  const DEFAULT_ROWS = [
    {name:'Transaction Ready for Pickup', msgs:2, pct:35.6486},
    {name:'Transaction Paid', msgs:2, pct:34.9982},
    {name:'Transaction Pick Up Reminder (3 Days)', msgs:3, pct:0.6675},
    {name:'Transaction Canceled', msgs:2, pct:0.242},
    {name:'Strategic Retail Partners - Refund Completed', msgs:1, pct:0.2409},
    {name:'Strategic Retail Partners - Available for Refund', msgs:2, pct:0.2406},
    {name:'Transaction Needs Information', msgs:2, pct:0.1788},
    {name:'Transaction Pick Up Reminder (7 Days)', msgs:2, pct:0.1394},
    {name:'Transaction Resent', msgs:2, pct:0.0627},
    {name:'Customer Opt-In', msgs:1, pct:0.0571},
    {name:'Transaction Pick Up Reminder (14 Days)', msgs:2, pct:0.0484},
    {name:'Agent activated due to paid credit', msgs:2, pct:0.0344},
    {name:'Transaction Rejected', msgs:2, pct:0.0302},
    {name:'Requires interview', msgs:2, pct:0.0238},
    {name:'Refund Reminder (3 Day)', msgs:2, pct:0.0435},
    {name:'Refund Reminder (7 Day)', msgs:2, pct:0.0273},
    {name:'Refund Reminder (14 Day)', msgs:2, pct:0.021},
    {name:'Agent suspended due to past-due balance', msgs:2, pct:0.0164},
    {name:'Transaction Ready for Refund', msgs:2, pct:0.0137},
    {name:'Agent suspended 7 days reminder', msgs:2, pct:0.0042},
    {name:'Agent suspended 15 days reminder', msgs:3, pct:0.0039},
    {name:'Transaction Cancelled (Time Limit Expired)', msgs:2, pct:0.0028},
    {name:'Refund Reminder (1 Day)', msgs:2, pct:0.0007},
    {name:'Refund Reminder (2 Day)', msgs:2, pct:0.0006},
    {name:'Refund Reminder (20 Day)', msgs:2, pct:0.0003},
    {name:'Transaction Pick Up Reminder (1 Day)', msgs:1, pct:0.0001},
    {name:'Transaction Pick Up Reminder (2 Days)', msgs:3, pct:0.0001},
    {name:'Transaction Sent To Be Paid', msgs:2, pct:0.0},
    {name:'Transaction Cancelled (Test Transaction)', msgs:1, pct:0.0},
  ];
  // Use whatever the person last saved, if anything — otherwise the real
  // 2025 defaults above.
  const ROWS_BASE = (oiSaved && Array.isArray(oiSaved.rows) && oiSaved.rows.length) ? oiSaved.rows : DEFAULT_ROWS;
  // Billing units follow the live US messages in the Messages Library (when it has loaded).
  const ROWS_TO_USE = ROWS_BASE.map(function(r){ return Object.assign({}, r, {msgs: libUnits(r.name, r.msgs)}); });

  const calcCountries = Object.keys(SMS_COSTS).filter(function(c){ return !getRiaSendingOnly() || isRiaSendingCountry(c); }).sort();
  const countryOptions = calcCountries.map(function(co){
    return '<option value="'+co+'"'+(co==='United States'?' selected':'')+'>'+co+'</option>';
  }).join('');

  let rows = '';
  ROWS_TO_USE.forEach(function(r, i){
    rows += '<tr id="oi_row_'+i+'">'
      + '<td style="padding:6px 10px;"><input type="text" id="oi_name_'+i+'" value="'+esc(r.name)+'" oninput="recalcOptInImpact()" style="width:100%;border:1px solid var(--border-mid);border-radius:6px;padding:5px 8px;font-size:12px;font-family:inherit;"></td>'
      + '<td style="padding:6px 10px;"><input type="number" id="oi_msgs_'+i+'" value="'+r.msgs+'" min="0" step="1" oninput="recalcOptInImpact()" style="width:60px;border:1px solid var(--border-mid);border-radius:6px;padding:5px 8px;font-size:12px;font-family:inherit;text-align:center;"></td>'
      + '<td style="padding:6px 10px;"><input type="number" id="oi_pct_'+i+'" value="'+r.pct+'" min="0" max="100" step="0.01" oninput="recalcOptInImpact()" style="width:80px;border:1px solid var(--border-mid);border-radius:6px;padding:5px 8px;font-size:12px;font-family:inherit;text-align:center;">%</td>'
      + '<td style="padding:6px 10px;font-size:12px;text-align:right;color:var(--muted);" id="oi_contrib_'+i+'">—</td>'
      + '<td style="padding:6px 4px;text-align:center;"><button onclick="removeOptInRow('+i+')" title="Remove this row" style="border:none;background:none;color:var(--hint);cursor:pointer;font-size:14px;line-height:1;padding:2px 6px;">&times;</button></td>'
      + '</tr>';
  });
  rows += '<tr><td colspan="5" style="padding:8px 10px;"><button onclick="addOptInRow()" style="font-size:11px;font-weight:600;color:var(--purple);background:var(--purple-bg);border:1px solid var(--purple);border-radius:6px;padding:5px 12px;cursor:pointer;">+ Add event</button></td></tr>';

  const html = '<div class="calc-wrap">'
    + libStatusHtml()

    // ── Presentation view (what Nick sees) ──────────────────────────
    + '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:22px;">'
    + '<div style="flex:1;min-width:190px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:16px 18px;">'
    + '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:6px;">Avg. messages / order @ 100% opt-in</div>'
    + '<div id="oi-avg-msgs" style="font-size:28px;font-weight:700;color:var(--text);">—</div>'
    + '<div id="oi-avg-msgs-today" style="font-size:11px;color:var(--muted);margin-top:4px;">—</div>'
    + '</div>'
    + '<div style="flex:1;min-width:190px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:16px 18px;">'
    + '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:6px;">2025 actual SMS cost</div>'
    + '<div id="oi-actual-display" style="font-size:28px;font-weight:700;color:var(--text);">—</div>'
    + '</div>'
    + '<div style="flex:1;min-width:190px;background:var(--card);border:1px solid var(--purple);border-radius:var(--radius);padding:16px 18px;">'
    + '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:6px;">Expected cost @ 100% opt-in</div>'
    + '<div id="oi-expected-cost" style="font-size:28px;font-weight:700;color:var(--purple);">—</div>'
    + '</div>'
    + '<div style="flex:1;min-width:190px;background:var(--card);border:1px solid var(--orange);border-radius:var(--radius);padding:16px 18px;">'
    + '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:6px;">The gap</div>'
    + '<div id="oi-gap" style="font-size:28px;font-weight:700;color:var(--orange);">—</div>'
    + '</div>'
    + '</div>'

    + '<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:22px 24px;margin-bottom:20px;">'
    + '<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:16px;">2025 actual vs. expected @ 100% opt-in</div>'
    + '<div id="oi-chart-bars" style="display:flex;flex-direction:column;gap:14px;"></div>'
    + '</div>'

    + '<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:22px 24px;margin-bottom:20px;">'
    + '<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:16px;">What drives the average — top contributing events</div>'
    + '<div id="oi-event-bars" style="display:flex;flex-direction:column;gap:10px;"></div>'
    + '</div>'

    // ── Adjustments (Paul only, closed by default) ──────────────────
    + '<details style="border:1px solid var(--border);border-radius:var(--radius);">'
    + '<summary style="cursor:pointer;font-size:12px;font-weight:700;color:var(--muted);padding:12px 18px;">&#9881; Adjust assumptions</summary>'
    + '<div style="padding:0 18px 18px;">'

    + '<div style="background:#F0FBF4;border:1px solid #97C459;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:11px;color:#27500A;line-height:1.6;">'
    + 'Rows below start with all real US events, full-year 2025. Adjust freely — the graphs above update live.'
    + '</div>'

    + '<table style="width:100%;border-collapse:collapse;margin-bottom:8px;">'
    + '<thead><tr style="border-bottom:1px solid var(--border);">'
    + '<th style="padding:6px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);">Message</th>'
    + '<th style="padding:6px 10px;text-align:center;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);">Number of messages sent</th>'
    + '<th style="padding:6px 10px;text-align:center;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);">% of orders</th>'
    + '<th style="padding:6px 10px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);">Contribution</th>'
    + '<th style="width:30px;"></th>'
    + '</tr></thead><tbody id="oi-rows-body">'
    + rows
    + '</tbody></table>'

    + '<div style="margin:8px 0 4px;">'+riaSendingToggleHtml()+'</div>'

    + '<div style="display:flex;align-items:flex-end;gap:20px;flex-wrap:wrap;padding-top:14px;border-top:1px solid var(--border);margin-top:8px;">'
    + '<div style="display:flex;flex-direction:column;gap:6px;">'
    + '<label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">Market</label>'
    + '<select id="oi-country" onchange="recalcOptInImpact()" style="padding:8px 12px;border-radius:7px;border:1px solid var(--border-mid);background:var(--card);font-size:13px;font-weight:500;color:var(--text);cursor:pointer;min-width:180px;">'
    + countryOptions + '</select>'
    + '</div>'
    + '<div style="display:flex;flex-direction:column;gap:6px;">'
    + '<label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">Total orders</label>'
    + '<input id="oi-orders" type="number" min="0" oninput="recalcOptInImpact()" style="padding:8px 12px;border-radius:7px;border:1px solid var(--border-mid);background:var(--card);font-size:13px;font-weight:500;color:var(--text);width:160px;">'
    + '<div style="font-size:9px;color:var(--hint);">Auto-fills by market · editable</div>'
    + '</div>'
    + '<div style="display:flex;flex-direction:column;gap:6px;">'
    + '<label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">SMS rate</label>'
    + '<div id="oi-rate-display" style="padding:8px 14px;border-radius:7px;border:1px solid var(--border);background:var(--purple-bg);font-size:13px;font-weight:600;color:var(--purple);min-width:100px;">—</div>'
    + '</div>'
    + '<div style="display:flex;flex-direction:column;gap:6px;">'
    + '<label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">Current opt-in rate</label>'
    + '<input id="oi-current-optin" type="number" min="0.01" max="100" step="0.01" value="64" oninput="recalcOptInImpact()" style="padding:8px 12px;border-radius:7px;border:1px solid var(--border-mid);background:var(--card);font-size:13px;font-weight:500;color:var(--text);width:100px;">'
    + '<div style="font-size:9px;color:var(--hint);">The % rows above are scaled up from this</div>'
    + '</div>'
    + '<div style="display:flex;flex-direction:column;gap:6px;">'
    + '<label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">2025 actual SMS cost</label>'
    + '<input id="oi-actual-cost" type="number" min="0" placeholder="From billing" oninput="recalcOptInImpact()" style="padding:8px 12px;border-radius:7px;border:1px solid var(--border-mid);background:var(--card);font-size:13px;font-weight:500;color:var(--text);width:160px;">'
    + '<div style="font-size:9px;color:var(--hint);">You provide this — not derived here</div>'
    + '</div>'
    + '</div>'
    + '</div>'
    + '</details>'
    + '</div>';

  document.getElementById('p9-content').innerHTML = html;
  window._oiRowCount = ROWS_TO_USE.length;
  window._oiSmsCosts = SMS_COSTS;
  window._oiCountryOrders = COUNTRY_ORDERS;

  if(oiSaved && oiSaved.country && SMS_COSTS[oiSaved.country] !== undefined){
    document.getElementById('oi-country').value = oiSaved.country;
  }
  document.getElementById('oi-orders').value = (oiSaved && oiSaved.orders !== undefined) ? oiSaved.orders : COUNTRY_ORDERS[document.getElementById('oi-country').value];
  if(oiSaved && oiSaved.optinRate !== undefined){
    document.getElementById('oi-current-optin').value = oiSaved.optinRate;
  }
  if(oiSaved && oiSaved.actualCost !== undefined && oiSaved.actualCost !== null){
    document.getElementById('oi-actual-cost').value = oiSaved.actualCost;
  }
  recalcOptInImpact();
}

function addOptInRow(){
  const i = window._oiRowCount++;
  const tbody = document.getElementById('oi-rows-body');
  const tr = document.createElement('tr');
  tr.id = 'oi_row_'+i;
  tr.innerHTML = '<td style="padding:6px 10px;"><input type="text" id="oi_name_'+i+'" value="New event" oninput="recalcOptInImpact()" style="width:100%;border:1px solid var(--border-mid);border-radius:6px;padding:5px 8px;font-size:12px;font-family:inherit;"></td>'
    + '<td style="padding:6px 10px;"><input type="number" id="oi_msgs_'+i+'" value="1" min="0" step="1" oninput="recalcOptInImpact()" style="width:60px;border:1px solid var(--border-mid);border-radius:6px;padding:5px 8px;font-size:12px;font-family:inherit;text-align:center;"></td>'
    + '<td style="padding:6px 10px;"><input type="number" id="oi_pct_'+i+'" value="0" min="0" max="100" step="0.01" oninput="recalcOptInImpact()" style="width:80px;border:1px solid var(--border-mid);border-radius:6px;padding:5px 8px;font-size:12px;font-family:inherit;text-align:center;">%</td>'
    + '<td style="padding:6px 10px;font-size:12px;text-align:right;color:var(--muted);" id="oi_contrib_'+i+'">—</td>'
    + '<td style="padding:6px 4px;text-align:center;"><button onclick="removeOptInRow('+i+')" title="Remove this row" style="border:none;background:none;color:var(--hint);cursor:pointer;font-size:14px;line-height:1;padding:2px 6px;">&times;</button></td>';
  tbody.insertBefore(tr, tbody.lastElementChild);
  recalcOptInImpact();
}

function removeOptInRow(i){
  const row = document.getElementById('oi_row_'+i);
  if(row) row.remove();
  recalcOptInImpact();
}

function recalcOptInImpact(){
  const country = document.getElementById('oi-country').value;
  const rate = window._oiSmsCosts[country] || 0;
  const rateDisplay = document.getElementById('oi-rate-display');
  if(rateDisplay) rateDisplay.textContent = '$'+rate.toFixed(4);

  const ordersInput = document.getElementById('oi-orders');
  if(document.activeElement !== ordersInput && window._oiCountryOrders[country] !== undefined){
    ordersInput.value = window._oiCountryOrders[country];
  }
  const orders = parseFloat(ordersInput.value) || 0;

  let avgMsgsToday = 0;
  const eventContribs = [];
  for(let i=0; i<window._oiRowCount; i++){
    const nameEl = document.getElementById('oi_name_'+i);
    const msgsEl = document.getElementById('oi_msgs_'+i);
    const pctEl = document.getElementById('oi_pct_'+i);
    const contribEl = document.getElementById('oi_contrib_'+i);
    if(!msgsEl || !pctEl) continue;
    const msgs = parseFloat(msgsEl.value) || 0;
    const pct = parseFloat(pctEl.value) || 0;
    const contrib = msgs * (pct/100);
    avgMsgsToday += contrib;
    if(contribEl) contribEl.textContent = contrib.toFixed(4);
    eventContribs.push({name: nameEl ? nameEl.value : ('Event '+i), contrib: contrib});
  }

  // The % rows above reflect TODAY's real observed rates — which are already
  // suppressed by the current opt-in rate, since only opted-in customers can
  // receive anything. To get the 100%-opt-in scenario, scale that figure up.
  const currentOptinInput = document.getElementById('oi-current-optin');
  const currentOptin = parseFloat(currentOptinInput.value) || 100;
  const avgMsgs100 = avgMsgsToday / (currentOptin/100);

  const expectedCost = avgMsgs100 * orders * rate;
  const actualCostInput = document.getElementById('oi-actual-cost');
  const actualCost = parseFloat(actualCostInput.value) || null;

  document.getElementById('oi-avg-msgs').textContent = avgMsgs100.toFixed(3);
  document.getElementById('oi-avg-msgs-today').textContent = 'vs. '+avgMsgsToday.toFixed(3)+' today at '+currentOptin+'% opt-in';
  document.getElementById('oi-expected-cost').textContent = '$'+expectedCost.toLocaleString('en-US',{maximumFractionDigits:0});
  document.getElementById('oi-actual-display').textContent = actualCost !== null ? ('$'+actualCost.toLocaleString('en-US',{maximumFractionDigits:0})) : 'Enter below';

  const gapEl = document.getElementById('oi-gap');
  let gap = null;
  if(actualCost !== null){
    gap = expectedCost - actualCost;
    gapEl.textContent = (gap>=0?'+':'')+'$'+gap.toLocaleString('en-US',{maximumFractionDigits:0});
  } else {
    gapEl.textContent = 'Enter 2025 cost';
  }

  // Comparison bar chart: 2025 actual vs expected @ 100% opt-in
  const chartEl = document.getElementById('oi-chart-bars');
  if(chartEl){
    const maxVal = Math.max(actualCost || 0, expectedCost, 1);
    function costBar(label, value, color, known){
      const pctW = known ? Math.max(2, (value/maxVal)*100) : 0;
      return '<div>'
        + '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">'
        + '<span style="font-weight:600;color:var(--text);">'+label+'</span>'
        + '<span style="font-weight:700;color:'+color+';">'+(known ? ('$'+value.toLocaleString('en-US',{maximumFractionDigits:0})) : '—')+'</span>'
        + '</div>'
        + '<div style="background:var(--bg);border-radius:6px;height:22px;overflow:hidden;">'
        + '<div style="background:'+color+';height:100%;width:'+pctW+'%;border-radius:6px;transition:width .3s;"></div>'
        + '</div></div>';
    }
    chartEl.innerHTML = costBar('2025 actual', actualCost || 0, 'var(--text)', actualCost !== null)
      + costBar('Expected @ 100% opt-in', expectedCost, 'var(--purple)', true);
  }

  // Top contributing events, ranked
  const eventsEl = document.getElementById('oi-event-bars');
  if(eventsEl){
    const top = eventContribs.filter(function(e){ return e.contrib > 0; })
      .sort(function(a,b){ return b.contrib - a.contrib; })
      .slice(0, 8);
    const maxContrib = top.length ? top[0].contrib : 1;
    eventsEl.innerHTML = top.map(function(e){
      const w = Math.max(2, (e.contrib/maxContrib)*100);
      const shareOfAvg = avgMsgsToday > 0 ? (e.contrib/avgMsgsToday*100) : 0;
      return '<div>'
        + '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;">'
        + '<span style="color:var(--text);">'+esc(e.name)+'</span>'
        + '<span style="color:var(--muted);">'+shareOfAvg.toFixed(1)+'% of average</span>'
        + '</div>'
        + '<div style="background:var(--bg);border-radius:5px;height:14px;overflow:hidden;">'
        + '<div style="background:var(--orange);height:100%;width:'+w+'%;border-radius:5px;transition:width .3s;"></div>'
        + '</div></div>';
    }).join('') || '<div style="font-size:12px;color:var(--muted);">No events with a positive rate yet.</div>';
  }

  // Persist everything the person typed, so it survives a page reload.
  try{
    const rowsToSave = [];
    for(let i=0; i<window._oiRowCount; i++){
      const nameEl = document.getElementById('oi_name_'+i);
      const msgsEl = document.getElementById('oi_msgs_'+i);
      const pctEl = document.getElementById('oi_pct_'+i);
      if(!nameEl || !msgsEl || !pctEl) continue;
      rowsToSave.push({name: nameEl.value, msgs: parseFloat(msgsEl.value)||0, pct: parseFloat(pctEl.value)||0});
    }
    localStorage.setItem('riaMessagingHub_optInImpact', JSON.stringify({
      version: 6,
      rows: rowsToSave,
      country: country,
      orders: orders,
      optinRate: currentOptin,
      actualCost: actualCost,
    }));
  } catch(e){ /* storage unavailable — fail silently, nothing critical depends on this */ }
}

/* ── OPT-IN COST IMPACT, BY JOURNEY (delivery-path model) ── */
function renderOptInImpactByJourney(){
  const OJ_SAVE_KEY = 'riaMessagingHub_optInByJourney';
  let ojSaved = null;
  try { const raw = localStorage.getItem(OJ_SAVE_KEY); ojSaved = raw ? JSON.parse(raw) : null; } catch(e){ ojSaved = null; }

  // The rate/order tables are populated by the flat-event calculator. If this
  // page is opened first, prime them by rendering that one once (it writes to
  // its own hidden container, so nothing visible changes here).
  if(!window._oiSmsCosts || !window._oiCountryOrders){
    try { renderOptInImpact(); } catch(e){ /* fall through — guarded below */ }
  }
  if(!window._oiSmsCosts || !window._oiCountryOrders){
    document.getElementById('p10-content').innerHTML = '<div class="empty-intent"><div class="empty-intent-title">Could not load rate data</div>'
      + '<div class="empty-intent-sub">Open the SMS cost calculator once, then come back.</div></div>';
    return;
  }


  // Journeys / delivery paths. "msgs" = number of separate sends in that path.
  // Percentages marked real come from 2025 US Power BI event rates; the two
  // delivery-path splits are left blank on purpose — the flat event data can't
  // distinguish "step 2 of a cash pickup" from "the only message for a bank
  // deposit", so that split has to be supplied rather than guessed.
  const DEFAULT_JOURNEYS = [
    {name:'Cash pickup (Ready for Pickup + Paid)', msgs:2, pct:35.6486, real:true},
    {name:'Bank deposit (single confirmation)', msgs:1, pct:'', real:false},
    {name:'Info required', msgs:1, pct:0.1788, real:true},
    {name:'Cancellation', msgs:1, pct:0.242, real:true},
    {name:'Pick up reminders (3/7/14 day)', msgs:1, pct:0.8553, real:true},
    {name:'Refund available + completed', msgs:2, pct:0.2406, real:true},
    {name:'Refund reminders (3/7/14 day)', msgs:1, pct:0.0918, real:true},
    {name:'Transaction resent', msgs:1, pct:0.0627, real:true},
    {name:'Transaction rejected', msgs:1, pct:0.0302, real:true},
    {name:'Requires interview', msgs:1, pct:0.0238, real:true},
  ];
  const JOURNEYS_TO_USE = (ojSaved && Array.isArray(ojSaved.rows) && ojSaved.rows.length) ? ojSaved.rows : DEFAULT_JOURNEYS;

  const countryList = Object.keys(window._oiSmsCosts || {}).filter(function(c){
    return !getRiaSendingOnly() || isRiaSendingCountry(c);
  }).sort();
  const countryOptions = countryList.map(function(co){
    return '<option value="'+co+'">'+co+'</option>';
  }).join('');

  let rows = '';
  JOURNEYS_TO_USE.forEach(function(r, i){
    rows += '<tr id="oj_row_'+i+'">'
      + '<td style="padding:7px 10px;"><input type="text" id="oj_name_'+i+'" value="'+esc(r.name)+'" oninput="recalcOptInByJourney()" style="width:100%;border:1px solid var(--border-mid);border-radius:6px;padding:6px 9px;font-size:12px;font-family:inherit;"></td>'
      + '<td style="padding:7px 10px;"><input type="number" id="oj_msgs_'+i+'" value="'+r.msgs+'" min="0" step="1" oninput="recalcOptInByJourney()" style="width:60px;border:1px solid var(--border-mid);border-radius:6px;padding:6px 9px;font-size:12px;font-family:inherit;text-align:center;"></td>'
      + '<td style="padding:7px 10px;"><input type="number" id="oj_pct_'+i+'" value="'+(r.pct===''?'':r.pct)+'" placeholder="—" min="0" max="100" step="0.0001" oninput="recalcOptInByJourney()" style="width:90px;border:1px solid '+(r.real===false?'var(--orange)':'var(--border-mid)')+';border-radius:6px;padding:6px 9px;font-size:12px;font-family:inherit;text-align:center;">%</td>'
      + '<td style="padding:7px 10px;font-size:12px;text-align:right;color:var(--muted);" id="oj_contrib_'+i+'">—</td>'
      + '<td style="padding:7px 4px;text-align:center;"><button onclick="removeOptInJourneyRow('+i+')" title="Remove" style="border:none;background:none;color:var(--hint);cursor:pointer;font-size:14px;padding:2px 6px;">&times;</button></td>'
      + '</tr>';
  });
  rows += '<tr><td colspan="5" style="padding:8px 10px;"><button onclick="addOptInJourneyRow()" style="font-size:11px;font-weight:600;color:var(--purple);background:var(--purple-bg);border:1px solid var(--purple);border-radius:6px;padding:5px 12px;cursor:pointer;">+ Add journey</button></td></tr>';

  const html = '<div class="calc-wrap">'
    + '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:22px;">'
    + '<div style="flex:1;min-width:190px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:16px 18px;">'
    + '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:6px;">Avg. messages / order @ 100% opt-in</div>'
    + '<div id="oj-avg-msgs" style="font-size:28px;font-weight:700;color:var(--text);">—</div>'
    + '<div id="oj-avg-msgs-today" style="font-size:11px;color:var(--muted);margin-top:4px;">—</div>'
    + '</div>'
    + '<div style="flex:1;min-width:190px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:16px 18px;">'
    + '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:6px;">2025 actual SMS cost</div>'
    + '<div id="oj-actual-display" style="font-size:28px;font-weight:700;color:var(--text);">—</div>'
    + '</div>'
    + '<div style="flex:1;min-width:190px;background:var(--card);border:1px solid var(--purple);border-radius:var(--radius);padding:16px 18px;">'
    + '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:6px;">Expected cost @ 100% opt-in</div>'
    + '<div id="oj-expected-cost" style="font-size:28px;font-weight:700;color:var(--purple);">—</div>'
    + '</div>'
    + '<div style="flex:1;min-width:190px;background:var(--card);border:1px solid var(--orange);border-radius:var(--radius);padding:16px 18px;">'
    + '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:6px;">The gap</div>'
    + '<div id="oj-gap" style="font-size:28px;font-weight:700;color:var(--orange);">—</div>'
    + '</div>'
    + '</div>'

    + '<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:22px 24px;margin-bottom:20px;">'
    + '<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:16px;">2025 actual vs. expected @ 100% opt-in</div>'
    + '<div id="oj-chart-bars" style="display:flex;flex-direction:column;gap:14px;"></div>'
    + '</div>'

    + '<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:22px 24px;margin-bottom:20px;">'
    + '<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:16px;">Messages per order, by journey</div>'
    + '<div id="oj-journey-bars" style="display:flex;flex-direction:column;gap:10px;"></div>'
    + '</div>'

    + '<details style="border:1px solid var(--border);border-radius:var(--radius);">'
    + '<summary style="cursor:pointer;font-size:12px;font-weight:700;color:var(--muted);padding:12px 18px;">&#9881; Adjust assumptions</summary>'
    + '<div style="padding:0 18px 18px;">'
    + '<div style="background:#FFF7ED;border:1px solid var(--orange);border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:11px;color:#7A3300;line-height:1.6;">'
    + '<strong>Journeys, not individual events.</strong> Each row is one delivery path, and &ldquo;sends&rdquo; is how many separate messages that path triggers (cash pickup = 2: ready for pickup, then paid). '
    + 'Percentages come from real 2025 US event rates, except <strong>Bank deposit</strong>, left blank on purpose &mdash; the event data can&rsquo;t tell a bank-deposit confirmation apart from step 2 of a cash pickup, so that split needs to be supplied rather than guessed.'
    + '</div>'

    + '<table style="width:100%;border-collapse:collapse;margin-bottom:8px;">'
    + '<thead><tr style="border-bottom:1px solid var(--border);">'
    + '<th style="padding:6px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);">Journey / delivery path</th>'
    + '<th style="padding:6px 10px;text-align:center;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);">Sends</th>'
    + '<th style="padding:6px 10px;text-align:center;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);">% of orders</th>'
    + '<th style="padding:6px 10px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);">Msgs / order</th>'
    + '<th style="width:30px;"></th>'
    + '</tr></thead><tbody id="oj-rows-body">'
    + rows
    + '</tbody></table>'

    + '<div style="margin:8px 0 4px;">'+riaSendingToggleHtml()+'</div>'

    + '<div style="display:flex;align-items:flex-end;gap:20px;flex-wrap:wrap;padding-top:14px;border-top:1px solid var(--border);margin-top:8px;">'
    + '<div style="display:flex;flex-direction:column;gap:6px;">'
    + '<label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">Market</label>'
    + '<select id="oj-country" onchange="recalcOptInByJourney()" style="padding:8px 12px;border-radius:7px;border:1px solid var(--border-mid);background:var(--card);font-size:13px;color:var(--text);cursor:pointer;min-width:180px;">'
    + countryOptions + '</select>'
    + '</div>'
    + '<div style="display:flex;flex-direction:column;gap:6px;">'
    + '<label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">Total orders</label>'
    + '<input id="oj-orders" type="number" min="0" oninput="recalcOptInByJourney()" style="padding:8px 12px;border-radius:7px;border:1px solid var(--border-mid);background:var(--card);font-size:13px;color:var(--text);width:160px;">'
    + '<div style="font-size:9px;color:var(--hint);">Auto-fills by market · editable</div>'
    + '</div>'
    + '<div style="display:flex;flex-direction:column;gap:6px;">'
    + '<label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">SMS rate</label>'
    + '<div id="oj-rate-display" style="padding:8px 14px;border-radius:7px;border:1px solid var(--border);background:var(--purple-bg);font-size:13px;font-weight:600;color:var(--purple);min-width:100px;">—</div>'
    + '</div>'
    + '<div style="display:flex;flex-direction:column;gap:6px;">'
    + '<label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">Billing segments / message</label>'
    + '<input id="oj-segments" type="number" min="1" step="1" value="1" oninput="recalcOptInByJourney()" style="padding:8px 12px;border-radius:7px;border:1px solid var(--border-mid);background:var(--card);font-size:13px;color:var(--text);width:100px;">'
    + '<div style="font-size:9px;color:var(--hint);">160 chars = 1 segment</div>'
    + '</div>'
    + '<div style="display:flex;flex-direction:column;gap:6px;">'
    + '<label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">Current opt-in rate</label>'
    + '<input id="oj-current-optin" type="number" min="0.01" max="100" step="0.01" value="64" oninput="recalcOptInByJourney()" style="padding:8px 12px;border-radius:7px;border:1px solid var(--border-mid);background:var(--card);font-size:13px;color:var(--text);width:100px;">'
    + '<div style="font-size:9px;color:var(--hint);">Rows above scale up from this</div>'
    + '</div>'
    + '<div style="display:flex;flex-direction:column;gap:6px;">'
    + '<label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">2025 actual SMS cost</label>'
    + '<input id="oj-actual-cost" type="number" min="0" placeholder="From billing" oninput="recalcOptInByJourney()" style="padding:8px 12px;border-radius:7px;border:1px solid var(--border-mid);background:var(--card);font-size:13px;color:var(--text);width:160px;">'
    + '<div style="font-size:9px;color:var(--hint);">You provide this</div>'
    + '</div>'
    + '</div>'
    + '</div></details>'
    + '</div>';

  document.getElementById('p10-content').innerHTML = html;
  window._ojRowCount = JOURNEYS_TO_USE.length;

  const cSel = document.getElementById('oj-country');
  cSel.value = (ojSaved && ojSaved.country && window._oiSmsCosts[ojSaved.country] !== undefined) ? ojSaved.country : 'United States';
  document.getElementById('oj-orders').value = (ojSaved && ojSaved.orders !== undefined) ? ojSaved.orders : (window._oiCountryOrders[cSel.value] || 0);
  if(ojSaved && ojSaved.optinRate !== undefined) document.getElementById('oj-current-optin').value = ojSaved.optinRate;
  if(ojSaved && ojSaved.segments !== undefined) document.getElementById('oj-segments').value = ojSaved.segments;
  if(ojSaved && ojSaved.actualCost !== undefined && ojSaved.actualCost !== null) document.getElementById('oj-actual-cost').value = ojSaved.actualCost;
  recalcOptInByJourney();
}

function addOptInJourneyRow(){
  const i = window._ojRowCount++;
  const tbody = document.getElementById('oj-rows-body');
  const tr = document.createElement('tr');
  tr.id = 'oj_row_'+i;
  tr.innerHTML = '<td style="padding:7px 10px;"><input type="text" id="oj_name_'+i+'" value="New journey" oninput="recalcOptInByJourney()" style="width:100%;border:1px solid var(--border-mid);border-radius:6px;padding:6px 9px;font-size:12px;font-family:inherit;"></td>'
    + '<td style="padding:7px 10px;"><input type="number" id="oj_msgs_'+i+'" value="1" min="0" step="1" oninput="recalcOptInByJourney()" style="width:60px;border:1px solid var(--border-mid);border-radius:6px;padding:6px 9px;font-size:12px;font-family:inherit;text-align:center;"></td>'
    + '<td style="padding:7px 10px;"><input type="number" id="oj_pct_'+i+'" value="" placeholder="—" min="0" max="100" step="0.0001" oninput="recalcOptInByJourney()" style="width:90px;border:1px solid var(--border-mid);border-radius:6px;padding:6px 9px;font-size:12px;font-family:inherit;text-align:center;">%</td>'
    + '<td style="padding:7px 10px;font-size:12px;text-align:right;color:var(--muted);" id="oj_contrib_'+i+'">—</td>'
    + '<td style="padding:7px 4px;text-align:center;"><button onclick="removeOptInJourneyRow('+i+')" title="Remove" style="border:none;background:none;color:var(--hint);cursor:pointer;font-size:14px;padding:2px 6px;">&times;</button></td>';
  tbody.insertBefore(tr, tbody.lastElementChild);
  recalcOptInByJourney();
}

function removeOptInJourneyRow(i){
  const row = document.getElementById('oj_row_'+i);
  if(row) row.remove();
  recalcOptInByJourney();
}

function recalcOptInByJourney(){
  const country = document.getElementById('oj-country').value;
  const rate = (window._oiSmsCosts || {})[country] || 0;
  document.getElementById('oj-rate-display').textContent = '$'+rate.toFixed(4);

  const ordersInput = document.getElementById('oj-orders');
  if(document.activeElement !== ordersInput && (window._oiCountryOrders||{})[country] !== undefined){
    ordersInput.value = window._oiCountryOrders[country];
  }
  const orders = parseFloat(ordersInput.value) || 0;
  const segments = parseFloat(document.getElementById('oj-segments').value) || 1;

  let avgToday = 0;
  const bars = [];
  for(let i=0; i<window._ojRowCount; i++){
    const nameEl = document.getElementById('oj_name_'+i);
    const msgsEl = document.getElementById('oj_msgs_'+i);
    const pctEl  = document.getElementById('oj_pct_'+i);
    const contribEl = document.getElementById('oj_contrib_'+i);
    if(!msgsEl || !pctEl) continue;
    const msgs = parseFloat(msgsEl.value) || 0;
    const pctRaw = pctEl.value.trim();
    if(pctRaw === ''){ if(contribEl) contribEl.textContent = 'not set'; continue; }
    const pct = parseFloat(pctRaw) || 0;
    const contrib = msgs * (pct/100);
    avgToday += contrib;
    if(contribEl) contribEl.textContent = contrib.toFixed(4);
    bars.push({name: nameEl ? nameEl.value : ('Journey '+i), contrib: contrib});
  }

  const currentOptin = parseFloat(document.getElementById('oj-current-optin').value) || 100;
  const avg100 = avgToday / (currentOptin/100);
  const expectedCost = avg100 * orders * rate * segments;
  const actualCost = parseFloat(document.getElementById('oj-actual-cost').value) || null;

  document.getElementById('oj-avg-msgs').textContent = avg100.toFixed(3);
  document.getElementById('oj-avg-msgs-today').textContent = 'vs. '+avgToday.toFixed(3)+' today at '+currentOptin+'% opt-in';
  document.getElementById('oj-expected-cost').textContent = '$'+expectedCost.toLocaleString('en-US',{maximumFractionDigits:0});
  document.getElementById('oj-actual-display').textContent = actualCost !== null ? ('$'+actualCost.toLocaleString('en-US',{maximumFractionDigits:0})) : 'Enter below';
  const gapEl = document.getElementById('oj-gap');
  if(actualCost !== null){
    const gap = expectedCost - actualCost;
    gapEl.textContent = (gap>=0?'+':'')+'$'+gap.toLocaleString('en-US',{maximumFractionDigits:0});
  } else { gapEl.textContent = 'Enter 2025 cost'; }

  const chartEl = document.getElementById('oj-chart-bars');
  if(chartEl){
    const maxVal = Math.max(actualCost || 0, expectedCost, 1);
    function costBar(label, value, color, known){
      const w = known ? Math.max(2, (value/maxVal)*100) : 0;
      return '<div><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">'
        + '<span style="font-weight:600;color:var(--text);">'+label+'</span>'
        + '<span style="font-weight:700;color:'+color+';">'+(known?('$'+value.toLocaleString('en-US',{maximumFractionDigits:0})):'—')+'</span>'
        + '</div><div style="background:var(--bg);border-radius:6px;height:22px;overflow:hidden;">'
        + '<div style="background:'+color+';height:100%;width:'+w+'%;border-radius:6px;transition:width .3s;"></div></div></div>';
    }
    chartEl.innerHTML = costBar('2025 actual', actualCost||0, 'var(--text)', actualCost!==null)
      + costBar('Expected @ 100% opt-in', expectedCost, 'var(--purple)', true);
  }

  const jEl = document.getElementById('oj-journey-bars');
  if(jEl){
    const top = bars.filter(function(b){ return b.contrib > 0; }).sort(function(a,b){ return b.contrib-a.contrib; });
    const max = top.length ? top[0].contrib : 1;
    jEl.innerHTML = top.map(function(b){
      const w = Math.max(2,(b.contrib/max)*100);
      const share = avgToday>0 ? (b.contrib/avgToday*100) : 0;
      return '<div><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;">'
        + '<span style="color:var(--text);">'+esc(b.name)+'</span>'
        + '<span style="color:var(--muted);">'+b.contrib.toFixed(3)+' msgs · '+share.toFixed(1)+'%</span>'
        + '</div><div style="background:var(--bg);border-radius:5px;height:14px;overflow:hidden;">'
        + '<div style="background:var(--orange);height:100%;width:'+w+'%;border-radius:5px;transition:width .3s;"></div></div></div>';
    }).join('') || '<div style="font-size:12px;color:var(--muted);">No journeys with a rate set yet.</div>';
  }

  try{
    const rowsToSave = [];
    for(let i=0; i<window._ojRowCount; i++){
      const nameEl = document.getElementById('oj_name_'+i);
      const msgsEl = document.getElementById('oj_msgs_'+i);
      const pctEl  = document.getElementById('oj_pct_'+i);
      if(!nameEl || !msgsEl || !pctEl) continue;
      rowsToSave.push({name:nameEl.value, msgs:parseFloat(msgsEl.value)||0, pct: pctEl.value.trim()===''?'':(parseFloat(pctEl.value)||0)});
    }
    localStorage.setItem('riaMessagingHub_optInByJourney', JSON.stringify({
      rows: rowsToSave, country: country, orders: orders,
      optinRate: currentOptin, segments: segments, actualCost: actualCost,
    }));
  } catch(e){ /* storage unavailable, non-critical */ }
}

