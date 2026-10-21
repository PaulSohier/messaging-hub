// Pages: SMS calculators (Clickatell and Twilio)
/* ── SMS CALCULATOR ── */
function renderCalc(){
  const SMS_COSTS = SHARED.CLICKATELL_RATES;
  const COUNTRY_ORDERS = SHARED.ORDERS;
  const US_EVENTS = SHARED.US_EVENTS_2025;
  const US_TOTAL_ORDERS = 69927961;
  const US_TOTAL_SMS    = 50870513;
  const OPTIN_BASELINE_PCT = 64; // current real SMS opt-in rate (confirmed, replaces prior stale 26.05% figure)

  const calcCountries = Object.keys(SMS_COSTS).filter(function(c){ return !getRiaSendingOnly() || isRiaSendingCountry(c); }).sort();
  const countryOptions = calcCountries.map(function(co){
    return '<option value="'+co+'"'+(co==='United States'?' selected':'')+'>'+co+'</option>';
  }).join('');

  // Build rows
  let rows = '';
  US_EVENTS.forEach(function(ev, i){
    rows += '<tr class="calc-data-row" id="r'+i+'">'
      + '<td class="calc-name-cell" style="font-size:12px;">'+ev.name+'</td>'
      + '<td class="calc-input-cell">'
      +   '<input type="number" class="calc-input calc-pct-input" id="r'+i+'_pct" '
      +   'value="'+ev.pct+'" step="0.0001" min="0" max="100" oninput="recalcSMS()">'
      + '</td>'
      + '<td class="calc-input-cell">'
      +   '<input type="number" class="calc-input calc-cost-input" id="r'+i+'_cost" '
      +   'step="0.0001" min="0" oninput="recalcSMS()" readonly '
      +   'style="background:var(--purple-bg);color:var(--purple);font-weight:600;cursor:default;">'
      + '</td>'
      + '<td class="calc-input-cell">'
      +   '<input type="number" class="calc-input calc-segs-input" id="r'+i+'_segs" '
      +   'value="'+libUnits(ev.name,2)+'" step="1" min="1" max="10" oninput="recalcSMS()" style="width:56px;">'
      + '</td>'
      + '<td class="calc-orders-cell" id="r'+i+'_orders">—</td>'
      + '<td class="calc-result-cell" id="r'+i+'_result">—</td>'
      + '<td class="calc-notes-cell">'+ev.note+'</td>'
      + '</tr>';
  });

  const html = '<div class="calc-wrap">'

    // ── Header info banner ──
    + '<div style="background:#F0FBF4;border:1px solid #97C459;border-radius:var(--radius);padding:12px 18px;margin-bottom:20px;font-size:12px;color:#27500A;line-height:1.7;">'
    + '<strong>How to read this calculator</strong><br>'
    + 'Participation % = share of total orders that triggered each SMS event, based on US Power BI data (Jan–Dec 2025). '
    + 'These US rates are used as a proxy for all countries — representing the cost of rolling out the US SMS event system globally. '
    + 'Total orders and SMS cost auto-fill when you select a country. All fields remain editable. '
    + '<strong>Billing units</strong> are set per event in the table (160 chars = 1 unit, filled from the live US messages in the Messages Library, or 2 if the library has not loaded) — shorten an event\'s message below 160 characters and drop its billing units to 1 to see the savings for just that event. '
    + '<strong>SMS opt-in scenario</strong> (below) is separate from participation % — it models what happens if the share of customers opted in to SMS changes. '
    + 'Baseline is today\'s real SMS opt-in rate ('+OPTIN_BASELINE_PCT+'%). '
    + 'Used as a proxy for all countries, same as participation % — no other market has its own opt-in data on file yet.'
    + '</div>'

    + '<div style="margin-bottom:12px;">'+riaSendingToggleHtml()+'</div>'

    // ── Controls ──
    + '<div style="display:flex;align-items:flex-end;gap:20px;flex-wrap:wrap;padding:0 0 20px;border-bottom:1px solid var(--border);margin-bottom:20px;">'

    // Country
    + '<div style="display:flex;flex-direction:column;gap:6px;">'
    + '<label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">Country</label>'
    + '<select id="calc-country" onchange="calcSetCountry()" style="padding:8px 12px;border-radius:7px;border:1px solid var(--border-mid);background:var(--card);font-size:13px;font-weight:500;color:var(--text);cursor:pointer;min-width:180px;">'
    + countryOptions
    + '</select>'
    + '<div style="font-size:9px;color:var(--hint);margin-top:2px;">Auto-fills SMS cost</div>'
    + '</div>'

    // Cost per SMS
    + '<div style="display:flex;flex-direction:column;gap:6px;">'
    + '<label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">Cost per SMS</label>'
    + '<div id="calc-cost-display" style="padding:8px 14px;border-radius:7px;border:1px solid var(--border);background:var(--purple-bg);font-size:13px;font-weight:600;color:var(--purple);min-width:110px;">—</div>'
    + '<div style="font-size:9px;color:var(--hint);margin-top:2px;">Average across telcos</div>'
    + '</div>'

    // Total orders
    + '<div style="display:flex;flex-direction:column;gap:6px;">'
    + '<label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">Total orders</label>'
    + '<input id="totalOrders" type="number" value="'+US_TOTAL_ORDERS+'" min="1" oninput="recalcSMS()" '
    + 'style="padding:8px 12px;border-radius:7px;border:1px solid var(--border-mid);background:var(--card);font-size:13px;font-weight:500;color:var(--text);width:170px;">'
    + '<div style="font-size:9px;color:var(--hint);margin-top:2px;">Auto-filled by country · editable</div>'
    + '</div>'

    // SMS opt-in scenario
    + '<div style="display:flex;flex-direction:column;gap:6px;">'
    + '<label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">SMS opt-in scenario</label>'
    + '<div style="display:flex;align-items:center;gap:10px;">'
    + '<input id="calc-optin-slider" type="range" min="0" max="100" step="1" value="'+Math.round(OPTIN_BASELINE_PCT)+'" oninput="calcOptInSlide()" style="width:150px;accent-color:var(--purple);">'
    + '<span id="calc-optin-value" style="font-size:13px;font-weight:700;color:var(--purple);min-width:70px;">'+Math.round(OPTIN_BASELINE_PCT)+'% opt-in</span>'
    + '</div>'
    + '<div id="calc-optin-note" style="font-size:9px;color:var(--hint);margin-top:2px;">Baseline ('+OPTIN_BASELINE_PCT+'%) · 1.00× cost</div>'
    + '</div>'

    + '</div>' // end controls

    // ── Summary strip ──
    + '<div style="display:flex;align-items:center;gap:28px;padding:14px 20px;background:var(--purple-bg);border-radius:var(--radius);margin-bottom:20px;flex-wrap:wrap;">'
    + '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--purple);margin-bottom:3px;">Total projected SMS cost</div>'
    +   '<div id="calc-total-cost" style="font-size:26px;font-weight:700;color:var(--purple);">—</div></div>'
    + '<div style="width:1px;height:40px;background:rgba(60,52,137,.2);"></div>'
    + '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--purple);margin-bottom:3px;">Total projected SMS messages sent</div>'
    +   '<div id="calc-total-msgs" style="font-size:26px;font-weight:700;color:var(--purple);">—</div></div>'
    + '<div style="width:1px;height:40px;background:rgba(60,52,137,.2);"></div>'
    + '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--purple);margin-bottom:3px;">Cost per order</div>'
    +   '<div id="calc-cost-per-order" style="font-size:26px;font-weight:700;color:var(--purple);">—</div></div>'
    + '<div style="font-size:11px;color:var(--purple);opacity:.75;max-width:300px;">'
    + 'Based on US 2025 participation rates (proxy) × selected country orders × country SMS cost × each event\'s own billing units × opt-in scenario multiplier. All fields editable.'
    + '</div>'
    + '</div>'

    // ── Table ──
    + '<div class="calc-table-wrap">'
    + '<table class="calc-table"><thead><tr>'
    + '<th class="calc-th-name">Event</th>'
    + '<th class="calc-th-num" style="min-width:110px;">Participation %<br><span class="calc-th-sub">of total orders — US 2025</span></th>'
    + '<th class="calc-th-cost" style="min-width:110px;">Cost / SMS<br><span class="calc-th-sub">auto-filled by country</span></th>'
    + '<th class="calc-th-num" style="min-width:90px;">Billing units<br><span class="calc-th-sub">160 chars = 1 · per event</span></th>'
    + '<th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--hint);border-bottom:1px solid var(--border);min-width:110px;">Est. messages sent</th>'
    + '<th class="calc-th-result" style="min-width:130px;">Total projected cost</th>'
    + '<th class="calc-th-notes">Source — US Power BI 2025</th>'
    + '</tr></thead><tbody>'
    + rows
    + '</tbody></table>'
    + '</div></div>';

  document.getElementById('p3-content').innerHTML = html;
  window._calcSMSCosts = SMS_COSTS;
  window._calcCountryOrders = COUNTRY_ORDERS;
  window._calcOptInBaselinePct = OPTIN_BASELINE_PCT;
  calcSetCountry();
}

function calcOptInSlide(){
  const slider = document.getElementById('calc-optin-slider');
  const valueEl = document.getElementById('calc-optin-value');
  const noteEl = document.getElementById('calc-optin-note');
  const baseline = window._calcOptInBaselinePct || 26.05;
  if(slider && valueEl){
    const v = parseFloat(slider.value);
    valueEl.textContent = v + '% opt-in';
    if(noteEl){
      const mult = v / baseline;
      noteEl.textContent = v === Math.round(baseline)
        ? 'Baseline ('+baseline+'%) · 1.00× cost'
        : mult.toFixed(2)+'× baseline cost ('+baseline+'% → '+v+'%)';
    }
  }
  recalcSMS();
}

function calcSetCountry(){
  const costs = window._calcSMSCosts;
  const orders = window._calcCountryOrders;
  if(!costs) return;
  const sel = document.getElementById('calc-country');
  if(!sel) return;
  const country = sel.value;
  const cost = costs[country] || 0;
  const display = document.getElementById('calc-cost-display');
  if(display) display.textContent = '$' + cost.toFixed(4);
  document.querySelectorAll('.calc-cost-input').forEach(function(input){
    input.value = cost;
  });
  if(orders && orders[country] !== undefined){
    const ordersEl = document.getElementById('totalOrders');
    if(ordersEl){
      if(orders[country] === 0){
        ordersEl.value = '';
        ordersEl.placeholder = 'No data — enter manually';
      } else {
        ordersEl.value = orders[country];
        ordersEl.placeholder = '';
      }
    }
  }
  recalcSMS();
}

function recalcSMS(){
  const totalOrders = parseFloat(document.getElementById('totalOrders') ? document.getElementById('totalOrders').value : 0) || 0;
  const optinSliderEl = document.getElementById('calc-optin-slider');
  const optinBaseline = window._calcOptInBaselinePct || 26.05;
  const optinPct    = optinSliderEl ? parseFloat(optinSliderEl.value) : optinBaseline;
  const optinMult   = optinBaseline > 0 ? (optinPct / optinBaseline) : 1;
  let grandTotal = 0;
  let grandMsgs  = 0;

  document.querySelectorAll('.calc-data-row[id^="r"]').forEach(function(row){
    const rid    = row.id;
    const pctEl  = document.getElementById(rid + '_pct');
    const costEl = document.getElementById(rid + '_cost');
    const segsEl = document.getElementById(rid + '_segs');
    const resEl  = document.getElementById(rid + '_result');
    const ordEl  = document.getElementById(rid + '_orders');
    if(!pctEl || !costEl || !resEl) return;
    const pct   = parseFloat(pctEl.value)  / 100 || 0;
    const cost  = parseFloat(costEl.value) || 0;
    const segs  = parseFloat(segsEl ? segsEl.value : 2) || 1;
    const msgs  = Math.round(totalOrders * pct * optinMult);
    const total = msgs * cost * segs;

    if(ordEl) ordEl.textContent = msgs > 0 ? msgs.toLocaleString('en-US') : '—';

    if(pct > 0 && cost > 0 && totalOrders > 0){
      resEl.textContent = '$' + total.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
      resEl.className = 'calc-result-cell calc-result-filled';
      grandTotal += total;
      grandMsgs  += msgs;
    } else {
      resEl.textContent = '—';
      resEl.className = 'calc-result-cell';
      if(pct > 0 && totalOrders > 0) grandMsgs += msgs;
    }
  });

  const totalCostEl = document.getElementById('calc-total-cost');
  const totalMsgsEl = document.getElementById('calc-total-msgs');
  const cpoEl       = document.getElementById('calc-cost-per-order');

  if(totalCostEl) totalCostEl.textContent = grandTotal > 0
    ? '$' + grandTotal.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) : '—';
  if(totalMsgsEl) totalMsgsEl.textContent = grandMsgs > 0
    ? Math.round(grandMsgs).toLocaleString('en-US') : '—';
  if(cpoEl && grandTotal > 0 && totalOrders > 0)
    cpoEl.textContent = '$' + (grandTotal / totalOrders).toFixed(4);
  else if(cpoEl) cpoEl.textContent = '—';
}


/* ── TWILIO SMS CALCULATOR ── */
/* Rate source: Twilio contract rate schedule, effective Aug 1, 2025, Exhibit A rate schedule.
   Uses the "Other" carrier rate per country as the default. Covers only the 57 countries priced in that contract —
   this is intentional: unlisted countries fall back to Twilio's public rate card (twilio.com/pricing), which isn't
   reflected here, so we don't guess at rates we don't have on file.
   US and Canada rows carry an additional, unquantified "Carrier Fees" surcharge per the contract footnote —
   flagged in the banner below rather than folded into the number silently. */
function renderCalcTwilio(){
  const TWILIO_SMS_COSTS = SHARED.TWILIO_RATES;
  const CARRIER_FEE_COUNTRIES = ["Canada","United States"];
  // Order volumes reused from existing B&M order data (COUNTRY_ORDERS) where the country overlaps.
  // Countries priced by Twilio but with no order-volume data on file are set to 0, which triggers the
  // same "No data — enter manually" fallback used elsewhere in this dashboard.
  const COUNTRY_ORDERS = SHARED.TWILIO_ORDERS;
  const US_EVENTS = SHARED.US_EVENTS_2025;
  const US_TOTAL_ORDERS = 69927961;

  const calcCountries = Object.keys(TWILIO_SMS_COSTS).filter(function(c){
    return !getRiaSendingOnly() || isRiaSendingCountry(c);
  }).sort();
  const countryOptions = calcCountries.map(function(co){
    return '<option value="'+co+'"'+(co==='United States'?' selected':'')+'>'+co+'</option>';
  }).join('');

  let rows = '';
  US_EVENTS.forEach(function(ev, i){
    rows += '<tr class="calc-data-row" id="tr'+i+'">'
      + '<td class="calc-name-cell" style="font-size:12px;">'+ev.name+'</td>'
      + '<td class="calc-input-cell">'
      +   '<input type="number" class="calc-input calc-pct-input-tw" id="tr'+i+'_pct" '
      +   'value="'+ev.pct+'" step="0.0001" min="0" max="100" oninput="recalcSMSTwilio()">'
      + '</td>'
      + '<td class="calc-input-cell">'
      +   '<input type="number" class="calc-input calc-cost-input-tw" id="tr'+i+'_cost" '
      +   'step="0.0001" min="0" oninput="recalcSMSTwilio()" readonly '
      +   'style="background:var(--purple-bg);color:var(--purple);font-weight:600;cursor:default;">'
      + '</td>'
      + '<td class="calc-input-cell">'
      +   '<input type="number" class="calc-input calc-segs-input-tw" id="tr'+i+'_segs" '
      +   'value="'+libUnits(ev.name,2)+'" step="1" min="1" max="10" oninput="recalcSMSTwilio()" style="width:56px;">'
      + '</td>'
      + '<td class="calc-orders-cell" id="tr'+i+'_orders">—</td>'
      + '<td class="calc-result-cell" id="tr'+i+'_result">—</td>'
      + '<td class="calc-notes-cell">'+ev.note+'</td>'
      + '</tr>';
  });

  const html = '<div class="calc-wrap">'

    + '<div style="background:#F0FBF4;border:1px solid #97C459;border-radius:var(--radius);padding:12px 18px;margin-bottom:14px;font-size:12px;color:#27500A;line-height:1.7;">'
    + '<strong>How to read this calculator</strong><br>'
    + 'Same model as the main SMS cost calculator, using Twilio\'s contracted rates (contract rate schedule, effective Aug 1, 2025) instead of Clickatell\'s. '
    + 'Participation % = share of total orders that triggered each SMS event, based on US Power BI data (Jan–Dec 2025), used as a proxy for all countries. '
    + 'Total orders and SMS cost auto-fill when you select a country. '
    + '<strong>Billing units</strong> are set per event in the table (160 chars = 1 unit, filled from the live US messages in the Messages Library, or 2 if the library has not loaded) — shorten an event\'s message below 160 characters and drop its billing units to 1 to see the savings for just that event. '
    + 'All fields remain editable.'
    + '</div>'

    + '<div style="background:#FDF5E8;border:1px solid #EF9F27;border-radius:var(--radius);padding:10px 18px;margin-bottom:20px;font-size:11px;color:#633806;line-height:1.6;">'
    + '<strong>Scope &amp; known gaps</strong><br>'
    + 'Covers only the 57 countries priced in the current Twilio contract — countries not listed fall back to Twilio\'s public rate card (twilio.com/pricing), not reflected here. '
    + 'US and Canada rates carry an additional, unquantified carrier-fee surcharge per the contract (see twilio.com/sms/pricing) — not included in the figures below. '
    + 'Algeria, Colombia, Equatorial Guinea, Guadeloupe, Haiti, Martinique, Mexico, Palestine, Puerto Rico, Réunion, and Tunisia have a Twilio rate but no order-volume data on file — enter total orders manually for those.'
    + '</div>'

    + '<div style="margin-bottom:12px;">'+riaSendingToggleHtml()+'</div>'

    + '<div style="display:flex;align-items:flex-end;gap:20px;flex-wrap:wrap;padding:0 0 20px;border-bottom:1px solid var(--border);margin-bottom:20px;">'

    + '<div style="display:flex;flex-direction:column;gap:6px;">'
    + '<label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">Country</label>'
    + '<select id="calc-country-tw" onchange="calcSetCountryTwilio()" style="padding:8px 12px;border-radius:7px;border:1px solid var(--border-mid);background:var(--card);font-size:13px;font-weight:500;color:var(--text);cursor:pointer;min-width:180px;">'
    + countryOptions
    + '</select>'
    + '<div style="font-size:9px;color:var(--hint);margin-top:2px;">Auto-fills SMS cost · 57 countries only</div>'
    + '</div>'

    + '<div style="display:flex;flex-direction:column;gap:6px;">'
    + '<label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">Cost per SMS</label>'
    + '<div id="calc-cost-display-tw" style="padding:8px 14px;border-radius:7px;border:1px solid var(--border);background:var(--purple-bg);font-size:13px;font-weight:600;color:var(--purple);min-width:110px;">—</div>'
    + '<div id="calc-carrier-fee-note-tw" style="font-size:9px;color:var(--hint);margin-top:2px;">Twilio "Other" carrier rate</div>'
    + '</div>'

    + '<div style="display:flex;flex-direction:column;gap:6px;">'
    + '<label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">Total orders</label>'
    + '<input id="totalOrders-tw" type="number" value="'+US_TOTAL_ORDERS+'" min="1" oninput="recalcSMSTwilio()" '
    + 'style="padding:8px 12px;border-radius:7px;border:1px solid var(--border-mid);background:var(--card);font-size:13px;font-weight:500;color:var(--text);width:170px;">'
    + '<div style="font-size:9px;color:var(--hint);margin-top:2px;">Auto-filled by country · editable</div>'
    + '</div>'

    + '</div>'

    + '<div style="display:flex;align-items:center;gap:28px;padding:14px 20px;background:var(--purple-bg);border-radius:var(--radius);margin-bottom:20px;flex-wrap:wrap;">'
    + '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--purple);margin-bottom:3px;">Total projected SMS cost</div>'
    +   '<div id="calc-total-cost-tw" style="font-size:26px;font-weight:700;color:var(--purple);">—</div></div>'
    + '<div style="width:1px;height:40px;background:rgba(60,52,137,.2);"></div>'
    + '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--purple);margin-bottom:3px;">Total projected SMS messages sent</div>'
    +   '<div id="calc-total-msgs-tw" style="font-size:26px;font-weight:700;color:var(--purple);">—</div></div>'
    + '<div style="width:1px;height:40px;background:rgba(60,52,137,.2);"></div>'
    + '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--purple);margin-bottom:3px;">Cost per order</div>'
    +   '<div id="calc-cost-per-order-tw" style="font-size:26px;font-weight:700;color:var(--purple);">—</div></div>'
    + '<div style="font-size:11px;color:var(--purple);opacity:.75;max-width:300px;">'
    + 'Twilio rate card × US 2025 participation rates (proxy) × selected country orders × each event\'s own billing units. Excludes carrier fees. All fields editable.'
    + '</div>'
    + '</div>'

    + '<div class="calc-table-wrap">'
    + '<table class="calc-table"><thead><tr>'
    + '<th class="calc-th-name">Event</th>'
    + '<th class="calc-th-num" style="min-width:110px;">Participation %<br><span class="calc-th-sub">of total orders — US 2025</span></th>'
    + '<th class="calc-th-cost" style="min-width:110px;">Cost / SMS<br><span class="calc-th-sub">auto-filled by country</span></th>'
    + '<th class="calc-th-num" style="min-width:90px;">Billing units<br><span class="calc-th-sub">160 chars = 1 · per event</span></th>'
    + '<th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--hint);border-bottom:1px solid var(--border);min-width:110px;">Est. messages sent</th>'
    + '<th class="calc-th-result" style="min-width:130px;">Total projected cost</th>'
    + '<th class="calc-th-notes">Source — US Power BI 2025</th>'
    + '</tr></thead><tbody>'
    + rows
    + '</tbody></table>'
    + '</div></div>';

  document.getElementById('p5-content').innerHTML = html;
  window._calcSMSCostsTwilio = TWILIO_SMS_COSTS;
  window._calcCountryOrdersTwilio = COUNTRY_ORDERS;
  window._carrierFeeCountriesTwilio = CARRIER_FEE_COUNTRIES;
  calcSetCountryTwilio();
}

function calcSetCountryTwilio(){
  const costs = window._calcSMSCostsTwilio;
  const orders = window._calcCountryOrdersTwilio;
  const feeCountries = window._carrierFeeCountriesTwilio || [];
  if(!costs) return;
  const sel = document.getElementById('calc-country-tw');
  if(!sel) return;
  const country = sel.value;
  const cost = costs[country] || 0;
  const display = document.getElementById('calc-cost-display-tw');
  if(display) display.textContent = '$' + cost.toFixed(5);
  document.querySelectorAll('.calc-cost-input-tw').forEach(function(input){
    input.value = cost;
  });
  const feeNote = document.getElementById('calc-carrier-fee-note-tw');
  if(feeNote){
    feeNote.textContent = feeCountries.indexOf(country) !== -1
      ? '+ unquantified carrier fees (see twilio.com/sms/pricing)'
      : 'Twilio "Other" carrier rate';
  }
  if(orders && orders[country] !== undefined){
    const ordersEl = document.getElementById('totalOrders-tw');
    if(ordersEl){
      if(orders[country] === 0){
        ordersEl.value = '';
        ordersEl.placeholder = 'No data — enter manually';
      } else {
        ordersEl.value = orders[country];
        ordersEl.placeholder = '';
      }
    }
  }
  recalcSMSTwilio();
}

function recalcSMSTwilio(){
  const totalOrders = parseFloat(document.getElementById('totalOrders-tw') ? document.getElementById('totalOrders-tw').value : 0) || 0;
  let grandTotal = 0;
  let grandMsgs  = 0;

  document.querySelectorAll('.calc-data-row[id^="tr"]').forEach(function(row){
    const rid    = row.id;
    const pctEl  = document.getElementById(rid + '_pct');
    const costEl = document.getElementById(rid + '_cost');
    const segsEl = document.getElementById(rid + '_segs');
    const resEl  = document.getElementById(rid + '_result');
    const ordEl  = document.getElementById(rid + '_orders');
    if(!pctEl || !costEl || !resEl) return;
    const pct   = parseFloat(pctEl.value)  / 100 || 0;
    const cost  = parseFloat(costEl.value) || 0;
    const segs  = parseFloat(segsEl ? segsEl.value : 2) || 1;
    const msgs  = Math.round(totalOrders * pct);
    const total = msgs * cost * segs;

    if(ordEl) ordEl.textContent = msgs > 0 ? msgs.toLocaleString('en-US') : '—';

    if(pct > 0 && cost > 0 && totalOrders > 0){
      resEl.textContent = '$' + total.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
      resEl.className = 'calc-result-cell calc-result-filled';
      grandTotal += total;
      grandMsgs  += msgs;
    } else {
      resEl.textContent = '—';
      resEl.className = 'calc-result-cell';
      if(pct > 0 && totalOrders > 0) grandMsgs += msgs;
    }
  });

  const totalCostEl = document.getElementById('calc-total-cost-tw');
  const totalMsgsEl = document.getElementById('calc-total-msgs-tw');
  const cpoEl       = document.getElementById('calc-cost-per-order-tw');

  if(totalCostEl) totalCostEl.textContent = grandTotal > 0
    ? '$' + grandTotal.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) : '—';
  if(totalMsgsEl) totalMsgsEl.textContent = grandMsgs > 0
    ? Math.round(grandMsgs).toLocaleString('en-US') : '—';
  if(cpoEl && grandTotal > 0 && totalOrders > 0)
    cpoEl.textContent = '$' + (grandTotal / totalOrders).toFixed(4);
  else if(cpoEl) cpoEl.textContent = '—';
}


