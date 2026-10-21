// Pages: Global deployment cost (Clickatell and Twilio)
/* ── GLOBAL DEPLOYMENT COST ── */
function renderGlobalCost(){
  const SMS_COSTS = SHARED.CLICKATELL_RATES;
  const COUNTRY_ORDERS = SHARED.ORDERS;
  const US_TOTAL_ORDERS = 69927961;
  const US_TOTAL_SMS = 50870513;
  const US_PARTICIPATION = US_TOTAL_SMS / US_TOTAL_ORDERS;
  const SEGMENTS = 2;
  const PARTICIPATION_PCT = (US_PARTICIPATION*100).toFixed(2);

  const REGIONS = {
    'All markets': null,
    'Western Europe': ['Austria','Belgium','Cyprus','Denmark','Finland','France','Germany','Gibraltar','Greece','Iceland','Ireland','Italy','Luxembourg','Malta','Netherlands','Norway','Portugal','Spain','Sweden','Switzerland','United Kingdom'],
    'Eastern Europe': ['Albania','Bosnia Herzegovina','Bulgaria','Croatia','Czech Republic','Estonia','Georgia','Hungary','Kosovo','Latvia','Lithuania','Moldova','Montenegro','North Macedonia','Poland','Romania','Serbia','Slovakia','Slovenia','Ukraine'],
    'North America': ['Canada','United States'],
    'Latin America & Caribbean': ['Antigua & Barbuda','Argentina','Bahamas','Barbados','Belize','Bolivia','Brazil','British Virgin Islands','Cayman Islands','Chile','Dominican Republic','Ecuador','Guam','Guatemala','Guyana','Honduras','Jamaica','Nicaragua','Panama','Paraguay','Peru','Suriname','Trinidad & Tobago','Turks & Caicos'],
    'Middle East & North Africa': ['Bahrain','Jordan','Kazakhstan','Kuwait','Lebanon','Maldives','Morocco','Oman','Qatar','Saudi Arabia','Turkey','United Arab Emirates'],
    'Sub-Saharan Africa': ['Angola','Benin','Botswana','Burkina Faso','Cameroon','Cape Verde','Chad','Comoros','Congo Brazaville','Congo DRC','Gabon','Gambia','Ghana','Guinea','Guinea Bissau','Ivory Coast','Kenya','Liberia','Madagascar','Malawi','Mauritius','Mozambique','Niger','Rwanda','Senegal','Seychelles','Sierra Leone','Solomon Islands','South Africa','South Sudan','Tanzania','Togo','Uganda','Zambia','Zimbabwe'],
    'Asia Pacific': ['Australia','Brunei','Cambodia','Fiji','Hong Kong','India','Indonesia','Japan','Korea South','Kyrgyzstan','Laos','Macau','Malaysia','Mongolia','New Zealand','Papua New Guinea','Philippines','Singapore','Sri Lanka','Thailand','Vanuatu'],
  };

  const allCountries = Object.keys(SMS_COSTS).filter(function(c){
    return !getRiaSendingOnly() || isRiaSendingCountry(c);
  }).sort((a,b)=>{
    const ca=(COUNTRY_ORDERS[a]||0)*US_PARTICIPATION*SMS_COSTS[a]*SEGMENTS;
    const cb=(COUNTRY_ORDERS[b]||0)*US_PARTICIPATION*SMS_COSTS[b]*SEGMENTS;
    return cb-ca;
  });

  function buildGlobalTable(selected){
    window._gcCustomCountries = null;
    document.getElementById('gc-country-tags').innerHTML='';
    document.getElementById('gc-country-sel').value='';
    const list = selected==='All markets' ? allCountries
      : allCountries.filter(c=>(REGIONS[selected]||[]).includes(c));
    gcRenderList(list, selected==='All markets'?'All 139 markets':selected);
  }

  window._gcSort = {col:'cost', dir:'desc'};
  window._gcCurrentList = [];
  window._gcCurrentLabel = '';

  window.gcSortBy = function(col){
    if(window._gcSort.col===col){
      window._gcSort.dir = window._gcSort.dir==='desc'?'asc':'desc';
    } else {
      window._gcSort.col = col;
      window._gcSort.dir = 'desc';
    }
    gcRenderList(window._gcCurrentList, window._gcCurrentLabel);
  };

  function gcRenderList(list, label){
    window._gcCurrentList = list;
    window._gcCurrentLabel = label;
    const sortCol = window._gcSort.col;
    const sortDir = window._gcSort.dir;

    const data = list.map(function(country){
      const orders=COUNTRY_ORDERS[country]||0, rate=SMS_COSTS[country];
      const msgs=Math.round(orders*US_PARTICIPATION), cost=msgs*rate*SEGMENTS;
      const cpo=orders>0?cost/orders:0;
      return {country:country,orders:orders,rate:rate,msgs:msgs,cost:cost,cpo:cpo,isUS:country==='United States'};
    });

    data.sort(function(a,b){
      var av,bv;
      if(sortCol==='market'){av=a.country;bv=b.country;}
      else if(sortCol==='orders'){av=a.orders;bv=b.orders;}
      else if(sortCol==='msgs'){av=a.msgs;bv=b.msgs;}
      else if(sortCol==='rate'){av=a.rate;bv=b.rate;}
      else if(sortCol==='cost'){av=a.cost;bv=b.cost;}
      else if(sortCol==='cpo'){av=a.cpo;bv=b.cpo;}
      if(typeof av==='string') return sortDir==='asc'?av.localeCompare(bv):bv.localeCompare(av);
      return sortDir==='asc'?av-bv:bv-av;
    });

    var gc=0,gm=0,go=0;
    data.forEach(function(d){gc+=d.cost;gm+=d.msgs;go+=d.orders;});

    var rows = data.map(function(d){
      var country=d.country,orders=d.orders,rate=d.rate,msgs=d.msgs,cost=d.cost,cpo=d.cpo,isUS=d.isUS;
      return '<tr style="'+(isUS?'background:#F8F7F4;':'')+'">'+
        '<td style="padding:10px 16px;font-size:12px;font-weight:'+(isUS?'700':'500')+';color:var(--text);border-bottom:1px solid var(--border);white-space:nowrap;">'+(isUS?'\u{1F1FA}\u{1F1F8} ':'')+country+(isUS?' <span style="font-size:9px;font-weight:600;color:var(--muted);background:#E5E3DD;padding:1px 5px;border-radius:3px;margin-left:4px;">BASELINE</span>':'')+'</td>'+
        '<td style="padding:10px 16px;font-size:12px;text-align:right;border-bottom:1px solid var(--border);color:var(--text);">'+orders.toLocaleString('en-US')+'</td>'+
        '<td style="padding:10px 16px;font-size:12px;text-align:right;border-bottom:1px solid var(--border);color:var(--muted);">'+msgs.toLocaleString('en-US')+'</td>'+
        '<td style="padding:10px 16px;font-size:12px;text-align:right;border-bottom:1px solid var(--border);color:var(--sms);font-weight:600;">$'+rate.toFixed(4)+'</td>'+
        '<td style="padding:10px 16px;font-size:12px;text-align:right;border-bottom:1px solid var(--border);font-weight:700;color:'+(isUS?'var(--purple)':'var(--text)')+';">'+(cost>0?'$'+cost.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):'\u2014')+'</td>'+
        '<td style="padding:10px 16px;font-size:12px;text-align:right;border-bottom:1px solid var(--border);color:var(--muted);">'+(cpo>0?'$'+cpo.toFixed(4):'\u2014')+'</td>'+
      '</tr>';
    }).join('');

    var totalCpo=go>0?gc/go:0;

    ['market','orders','msgs','rate','cost','cpo'].forEach(function(c){
      var arrowEl=document.getElementById('gc-th-arrow-'+c);
      if(!arrowEl) return;
      arrowEl.textContent = c===sortCol ? (sortDir==='desc'?' \u2193':' \u2191') : ' \u2195';
      var thEl=document.getElementById('gc-th-'+c);
      if(thEl) thEl.style.color = c===sortCol?'var(--text)':'var(--hint)';
    });

    document.getElementById('gc-tfoot-label').textContent='TOTAL \u2014 '+label;
    document.getElementById('gc-tfoot-orders').textContent=go.toLocaleString('en-US');
    document.getElementById('gc-tfoot-msgs').textContent=gm.toLocaleString('en-US');
    document.getElementById('gc-tfoot-cost').textContent='$'+gc.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
    document.getElementById('gc-tfoot-cpo').textContent='$'+totalCpo.toFixed(4);
    document.getElementById('gc-tbody').innerHTML=rows;
  }

  window.buildGlobalTable = buildGlobalTable;
  window._gcCustomCountries = null;

  window.gcAddCountry = function(country){
    if(!country) return;
    document.getElementById('gc-region-sel').value='';
    if(!window._gcCustomCountries) window._gcCustomCountries = new Set();
    window._gcCustomCountries.add(country);
    gcRenderTags();
    gcRefreshCustom();
    document.getElementById('gc-country-sel').value='';
  };

  window.gcRemoveCountry = function(country){
    if(window._gcCustomCountries) window._gcCustomCountries.delete(country);
    if(!window._gcCustomCountries || window._gcCustomCountries.size===0){
      window._gcCustomCountries=null;
      document.getElementById('gc-region-sel').value='All markets';
      buildGlobalTable('All markets');
    } else { gcRenderTags(); gcRefreshCustom(); }
  };

  window.gcRenderTags = function(){
    const tags=document.getElementById('gc-country-tags');
    if(!tags||!window._gcCustomCountries||window._gcCustomCountries.size===0){if(tags)tags.innerHTML='';return;}
    tags.innerHTML='';
    [...window._gcCustomCountries].forEach(function(c){
      const span=document.createElement('span');
      span.style.cssText='display:inline-flex;align-items:center;gap:4px;background:var(--purple-bg);color:var(--purple);border:1px solid #AFA9EC;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:600;';
      const x=document.createElement('span');
      x.textContent='×';
      x.style.cssText='cursor:pointer;font-size:14px;line-height:1;opacity:.7;';
      x.onclick=function(){gcRemoveCountry(c);};
      span.appendChild(document.createTextNode(c+' '));
      span.appendChild(x);
      tags.appendChild(span);
    });
  };

    window.gcRefreshCustom = function(){
    if(!window._gcCustomCountries) return;
    const list=allCountries.filter(c=>window._gcCustomCountries.has(c));
    gcRenderList(list, 'custom selection ('+list.length+')');
  };


  const regionOptions = Object.keys(REGIONS).map(r=>{
    const count = r==='All markets' ? allCountries.length : allCountries.filter(c=>(REGIONS[r]||[]).includes(c)).length;
    return '<option value="'+r+'">'+r+' ('+count+')</option>';
  }).join('');

  const countryOptions = allCountries.map(c=>'<option value="'+c+'">'+c+'</option>').join('');

  const html = '<div style="max-width:1600px;width:100%;">'+

    '<div style="background:#F0FBF4;border:1px solid #97C459;border-radius:var(--radius);padding:16px 20px;margin-bottom:24px;font-size:12px;color:#27500A;line-height:1.8;">'+
    '<strong>What this shows</strong><br>'+
    'Projected annual SMS cost if Ria deploys its current US notification system — covering all 29 event types — to active B&M markets globally.<br>'+
    '<strong>Participation rates</strong> derived from US Power BI data (Jan–Dec 2025): '+PARTICIPATION_PCT+'% of orders triggered an SMS. Other markets send SMS today but only for a fraction of events — the US is the only market with fully deployed coverage, making it the only reliable benchmark.<br>'+
    '<strong>SMS costs</strong> are current contracted telco rates per SMS (split into 2 billing units of ~160 chars each, as most Ria messages are ~200 chars).'+
    '</div>'+

    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap;">'+
    riaSendingToggleHtml()+
    '</div>'+

    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap;">'+
    '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);">View by region</div>'+
    '<select id="gc-region-sel" onchange="buildGlobalTable(this.value)" style="padding:7px 12px;border-radius:7px;border:1px solid var(--border-mid);background:var(--card);font-size:13px;font-weight:500;color:var(--text);cursor:pointer;">'+regionOptions+'</select>'+
    '<div style="font-size:11px;color:var(--hint);margin-left:4px;">or pick specific countries:</div>'+
    '<select id="gc-country-sel" onchange="gcAddCountry(this.value)" style="padding:7px 12px;border-radius:7px;border:1px solid var(--border-mid);background:var(--card);font-size:13px;color:var(--text);cursor:pointer;min-width:180px;">'+
    '<option value="">+ Add a country</option>'+countryOptions+'</select>'+
    '<div id="gc-country-tags" style="display:flex;gap:6px;flex-wrap:wrap;"></div>'+
    '</div>'+


    '<div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap;">'+
    '<div style="flex:1;min-width:200px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:6px;">Data sources</div><div style="font-size:11px;color:var(--text);line-height:1.7;"><strong>Order volumes</strong> — Power BI, all B&M markets, 2025<br><strong>Participation rates</strong> — US Power BI Jan–Dec 2025<br><strong>SMS costs</strong> — Current contracted telco rates<br><strong>Billing units</strong> — 2 per SMS (messages ~200 chars, billed in 160-char units)</div></div>'+
    '<div style="flex:1;min-width:200px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:6px;">Why US rates — not local data</div><div style="font-size:11px;color:var(--text);line-height:1.7;">Other markets send SMS today but only for a <strong>fraction of events</strong>. Local data is structurally incomplete — using it would produce a misleading baseline. The US is the only market with a fully deployed 29-event system.</div></div>'+
    '<div style="flex:1;min-width:200px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:6px;">Key insight</div><div style="font-size:11px;color:var(--text);line-height:1.7;">The US telco rate is <strong>$0.0055 per billing unit</strong> — among the lowest globally. High-cost markets may warrant telco renegotiation or a WhatsApp-first strategy before full SMS rollout.</div></div>'+
    '</div>'+

    '<div style="overflow-x:auto;border:1px solid var(--border);border-radius:var(--radius);">'+
    '<table style="width:100%;border-collapse:collapse;font-family:inherit;">'+
    '<thead><tr style="background:#FAFAF8;">'+
    '<th id="gc-th-market" onclick="gcSortBy(\'market\')" style="padding:10px 16px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--hint);border-bottom:1px solid var(--border);cursor:pointer;user-select:none;">Market<span id="gc-th-arrow-market"> ↕</span></th>'+
    '<th id="gc-th-orders" onclick="gcSortBy(\'orders\')" style="padding:10px 16px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--hint);border-bottom:1px solid var(--border);cursor:pointer;user-select:none;">B&M orders<br><span style="font-weight:400;text-transform:none;letter-spacing:0;font-size:9px;">Power BI 2025</span><span id="gc-th-arrow-orders"> ↕</span></th>'+
    '<th id="gc-th-msgs" onclick="gcSortBy(\'msgs\')" style="padding:10px 16px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--hint);border-bottom:1px solid var(--border);cursor:pointer;user-select:none;">Est. SMS sent<br><span style="font-weight:400;text-transform:none;letter-spacing:0;font-size:9px;">orders × '+PARTICIPATION_PCT+'%</span><span id="gc-th-arrow-msgs"> ↕</span></th>'+
    '<th id="gc-th-rate" onclick="gcSortBy(\'rate\')" style="padding:10px 16px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--hint);border-bottom:1px solid var(--border);cursor:pointer;user-select:none;">Cost / SMS<br><span style="font-weight:400;text-transform:none;letter-spacing:0;font-size:9px;">telco rate</span><span id="gc-th-arrow-rate"> ↕</span></th>'+
    '<th id="gc-th-cost" onclick="gcSortBy(\'cost\')" style="padding:10px 16px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text);border-bottom:1px solid var(--border);cursor:pointer;user-select:none;">Annual SMS cost<br><span style="font-weight:400;text-transform:none;letter-spacing:0;font-size:9px;">est. SMS × telco rate × 2 billing units</span><span id="gc-th-arrow-cost"> ↓</span></th>'+
    '<th id="gc-th-cpo" onclick="gcSortBy(\'cpo\')" style="padding:10px 16px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--hint);border-bottom:1px solid var(--border);cursor:pointer;user-select:none;">Cost / order<span id="gc-th-arrow-cpo"> ↕</span></th>'+
    '</tr></thead>'+
    '<tbody id="gc-tbody"></tbody>'+
    '<tfoot><tr style="background:var(--purple-bg);">'+
    '<td id="gc-tfoot-label" style="padding:12px 16px;font-size:12px;font-weight:700;color:var(--purple);">TOTAL</td>'+
    '<td id="gc-tfoot-orders" style="padding:12px 16px;font-size:12px;font-weight:700;color:var(--purple);text-align:right;">—</td>'+
    '<td id="gc-tfoot-msgs" style="padding:12px 16px;font-size:12px;font-weight:700;color:var(--purple);text-align:right;">—</td>'+
    '<td style="padding:12px 16px;font-size:12px;color:var(--purple);text-align:right;">—</td>'+
    '<td id="gc-tfoot-cost" style="padding:12px 16px;font-size:14px;font-weight:700;color:var(--purple);text-align:right;">—</td>'+
    '<td id="gc-tfoot-cpo" style="padding:12px 16px;font-size:12px;font-weight:700;color:var(--purple);text-align:right;">—</td>'+
    '</tr></tfoot></table></div>'+
    '<div style="font-size:10px;color:var(--hint);margin-top:10px;">139 markets available — all countries with both Power BI order volume and telco SMS cost data. 6 excluded due to missing telco data: Puerto Rico, Saint Kitts, Mexico, Uzbekistan, Burundi, Pakistan.</div>'+
    '</div>';

  document.getElementById('p4-content').innerHTML = html;
  buildGlobalTable('All markets');
}

/* ── GLOBAL DEPLOYMENT COST — TWILIO ── */
/* Mirrors renderGlobalCost() exactly, but scoped to Twilio's contracted rate card (contract rate schedule).
   Only countries with BOTH a Twilio rate AND Power BI order-volume data are shown — same convention the
   Clickatell version uses for its 6 excluded markets. 11 Twilio-priced countries have no order data on file
   and are excluded here (listed in the footnote) rather than guessed at. */
function renderGlobalCostTwilio(){
  const SMS_COSTS = SHARED.TWILIO_RATES;
  const CARRIER_FEE_COUNTRIES = ["Canada","United States"];
  const COUNTRY_ORDERS = SHARED.TWILIO_ORDERS;
  const EXCLUDED_NO_ORDERS = Object.keys(COUNTRY_ORDERS).filter(c=>COUNTRY_ORDERS[c]===0).sort();
  const US_TOTAL_ORDERS = 69927961;
  const US_TOTAL_SMS = 50870513;
  const US_PARTICIPATION = US_TOTAL_SMS / US_TOTAL_ORDERS;
  const SEGMENTS = 2;
  const PARTICIPATION_PCT = (US_PARTICIPATION*100).toFixed(2);

  const REGIONS = {
    'All markets': null,
    'Western Europe': ['Austria','Belgium','Denmark','Finland','France','Germany','Greece','Ireland','Italy','Luxembourg','Netherlands','Norway','Portugal','Spain','Sweden','Switzerland','United Kingdom'],
    'Eastern Europe': ['Croatia','Lithuania','Poland'],
    'North America': ['Canada','United States'],
    'Latin America & Caribbean': ['Cayman Islands','Chile','Colombia','El Salvador','Guadeloupe','Guatemala','Haiti','Honduras','Martinique','Mexico','Nicaragua','Panama','Paraguay','Peru','Puerto Rico','Reunion'],
    'Middle East & North Africa': ['Algeria','Equatorial Guinea','Israel','Morocco','Palestine','Tunisia','United Arab Emirates'],
    'Sub-Saharan Africa': ['Botswana','Niger','Senegal','Togo'],
    'Asia Pacific': ['Australia','India','Laos','Malaysia','New Zealand','Philippines','Singapore'],
  };

  // Only markets with BOTH a Twilio rate and order-volume data on file
  const allCountries = Object.keys(SMS_COSTS).filter(function(c){
    return (COUNTRY_ORDERS[c]||0)>0 && (!getRiaSendingOnly() || isRiaSendingCountry(c));
  }).sort((a,b)=>{
    const ca=(COUNTRY_ORDERS[a]||0)*US_PARTICIPATION*SMS_COSTS[a]*SEGMENTS;
    const cb=(COUNTRY_ORDERS[b]||0)*US_PARTICIPATION*SMS_COSTS[b]*SEGMENTS;
    return cb-ca;
  });

  function buildGlobalTableTw(selected){
    window._gcCustomCountriesTw = null;
    document.getElementById('gc-country-tags-tw').innerHTML='';
    document.getElementById('gc-country-sel-tw').value='';
    const list = selected==='All markets' ? allCountries
      : allCountries.filter(c=>(REGIONS[selected]||[]).includes(c));
    gcRenderListTw(list, selected==='All markets'?'All '+allCountries.length+' markets':selected);
  }

  window._gcSortTw = {col:'cost', dir:'desc'};
  window._gcCurrentListTw = [];
  window._gcCurrentLabelTw = '';

  window.gcSortByTw = function(col){
    if(window._gcSortTw.col===col){
      window._gcSortTw.dir = window._gcSortTw.dir==='desc'?'asc':'desc';
    } else {
      window._gcSortTw.col = col;
      window._gcSortTw.dir = 'desc';
    }
    gcRenderListTw(window._gcCurrentListTw, window._gcCurrentLabelTw);
  };

  function gcRenderListTw(list, label){
    window._gcCurrentListTw = list;
    window._gcCurrentLabelTw = label;
    const sortCol = window._gcSortTw.col;
    const sortDir = window._gcSortTw.dir;

    const data = list.map(function(country){
      const orders=COUNTRY_ORDERS[country]||0, rate=SMS_COSTS[country];
      const msgs=Math.round(orders*US_PARTICIPATION), cost=msgs*rate*SEGMENTS;
      const cpo=orders>0?cost/orders:0;
      return {country:country,orders:orders,rate:rate,msgs:msgs,cost:cost,cpo:cpo,isUS:country==='United States',hasFee:CARRIER_FEE_COUNTRIES.indexOf(country)!==-1};
    });

    data.sort(function(a,b){
      var av,bv;
      if(sortCol==='market'){av=a.country;bv=b.country;}
      else if(sortCol==='orders'){av=a.orders;bv=b.orders;}
      else if(sortCol==='msgs'){av=a.msgs;bv=b.msgs;}
      else if(sortCol==='rate'){av=a.rate;bv=b.rate;}
      else if(sortCol==='cost'){av=a.cost;bv=b.cost;}
      else if(sortCol==='cpo'){av=a.cpo;bv=b.cpo;}
      if(typeof av==='string') return sortDir==='asc'?av.localeCompare(bv):bv.localeCompare(av);
      return sortDir==='asc'?av-bv:bv-av;
    });

    var gc=0,gm=0,go=0;
    data.forEach(function(d){gc+=d.cost;gm+=d.msgs;go+=d.orders;});

    var rows = data.map(function(d){
      var country=d.country,orders=d.orders,rate=d.rate,msgs=d.msgs,cost=d.cost,cpo=d.cpo,isUS=d.isUS,hasFee=d.hasFee;
      return '<tr style="'+(isUS?'background:#F8F7F4;':'')+'">'+
        '<td style="padding:10px 16px;font-size:12px;font-weight:'+(isUS?'700':'500')+';color:var(--text);border-bottom:1px solid var(--border);white-space:nowrap;">'+(isUS?'\u{1F1FA}\u{1F1F8} ':'')+country+(isUS?' <span style="font-size:9px;font-weight:600;color:var(--muted);background:#E5E3DD;padding:1px 5px;border-radius:3px;margin-left:4px;">BASELINE</span>':'')+(hasFee?' <span title="Excludes Twilio carrier fees" style="font-size:9px;font-weight:600;color:var(--em);background:var(--em-bg);padding:1px 5px;border-radius:3px;margin-left:4px;">+FEES</span>':'')+'</td>'+
        '<td style="padding:10px 16px;font-size:12px;text-align:right;border-bottom:1px solid var(--border);color:var(--text);">'+orders.toLocaleString('en-US')+'</td>'+
        '<td style="padding:10px 16px;font-size:12px;text-align:right;border-bottom:1px solid var(--border);color:var(--muted);">'+msgs.toLocaleString('en-US')+'</td>'+
        '<td style="padding:10px 16px;font-size:12px;text-align:right;border-bottom:1px solid var(--border);color:var(--sms);font-weight:600;">$'+rate.toFixed(5)+'</td>'+
        '<td style="padding:10px 16px;font-size:12px;text-align:right;border-bottom:1px solid var(--border);font-weight:700;color:'+(isUS?'var(--purple)':'var(--text)')+';">'+(cost>0?'$'+cost.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):'\u2014')+'</td>'+
        '<td style="padding:10px 16px;font-size:12px;text-align:right;border-bottom:1px solid var(--border);color:var(--muted);">'+(cpo>0?'$'+cpo.toFixed(4):'\u2014')+'</td>'+
      '</tr>';
    }).join('');

    var totalCpo=go>0?gc/go:0;

    ['market','orders','msgs','rate','cost','cpo'].forEach(function(c){
      var arrowEl=document.getElementById('gc-th-arrow-'+c+'-tw');
      if(!arrowEl) return;
      arrowEl.textContent = c===sortCol ? (sortDir==='desc'?' \u2193':' \u2191') : ' \u2195';
      var thEl=document.getElementById('gc-th-'+c+'-tw');
      if(thEl) thEl.style.color = c===sortCol?'var(--text)':'var(--hint)';
    });

    document.getElementById('gc-tfoot-label-tw').textContent='TOTAL \u2014 '+label;
    document.getElementById('gc-tfoot-orders-tw').textContent=go.toLocaleString('en-US');
    document.getElementById('gc-tfoot-msgs-tw').textContent=gm.toLocaleString('en-US');
    document.getElementById('gc-tfoot-cost-tw').textContent='$'+gc.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
    document.getElementById('gc-tfoot-cpo-tw').textContent='$'+totalCpo.toFixed(4);
    document.getElementById('gc-tbody-tw').innerHTML=rows;
  }

  window.buildGlobalTableTw = buildGlobalTableTw;
  window._gcCustomCountriesTw = null;

  window.gcAddCountryTw = function(country){
    if(!country) return;
    document.getElementById('gc-region-sel-tw').value='';
    if(!window._gcCustomCountriesTw) window._gcCustomCountriesTw = new Set();
    window._gcCustomCountriesTw.add(country);
    gcRenderTagsTw();
    gcRefreshCustomTw();
    document.getElementById('gc-country-sel-tw').value='';
  };

  window.gcRemoveCountryTw = function(country){
    if(window._gcCustomCountriesTw) window._gcCustomCountriesTw.delete(country);
    if(!window._gcCustomCountriesTw || window._gcCustomCountriesTw.size===0){
      window._gcCustomCountriesTw=null;
      document.getElementById('gc-region-sel-tw').value='All markets';
      buildGlobalTableTw('All markets');
    } else { gcRenderTagsTw(); gcRefreshCustomTw(); }
  };

  window.gcRenderTagsTw = function(){
    const tags=document.getElementById('gc-country-tags-tw');
    if(!tags||!window._gcCustomCountriesTw||window._gcCustomCountriesTw.size===0){if(tags)tags.innerHTML='';return;}
    tags.innerHTML='';
    [...window._gcCustomCountriesTw].forEach(function(c){
      const span=document.createElement('span');
      span.style.cssText='display:inline-flex;align-items:center;gap:4px;background:var(--purple-bg);color:var(--purple);border:1px solid #AFA9EC;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:600;';
      const x=document.createElement('span');
      x.textContent='×';
      x.style.cssText='cursor:pointer;font-size:14px;line-height:1;opacity:.7;';
      x.onclick=function(){gcRemoveCountryTw(c);};
      span.appendChild(document.createTextNode(c+' '));
      span.appendChild(x);
      tags.appendChild(span);
    });
  };

  window.gcRefreshCustomTw = function(){
    if(!window._gcCustomCountriesTw) return;
    const list=allCountries.filter(c=>window._gcCustomCountriesTw.has(c));
    gcRenderListTw(list, 'custom selection ('+list.length+')');
  };

  const regionOptions = Object.keys(REGIONS).map(r=>{
    const count = r==='All markets' ? allCountries.length : allCountries.filter(c=>(REGIONS[r]||[]).includes(c)).length;
    return '<option value="'+r+'">'+r+' ('+count+')</option>';
  }).join('');

  const countryOptions = allCountries.map(c=>'<option value="'+c+'">'+c+'</option>').join('');

  const html = '<div style="max-width:1600px;width:100%;">'+

    '<div style="background:#F0FBF4;border:1px solid #97C459;border-radius:var(--radius);padding:16px 20px;margin-bottom:14px;font-size:12px;color:#27500A;line-height:1.8;">'+
    '<strong>What this shows</strong><br>'+
    'Same model as the main Global Deployment Cost tab, using Twilio\'s contracted rates (contract rate schedule, effective Aug 1, 2025) instead of Clickatell\'s — projected annual SMS cost if Ria deploys its current US notification system to active B&M markets, via Iterable/Twilio.<br>'+
    '<strong>Participation rates</strong> derived from US Power BI data (Jan–Dec 2025): '+PARTICIPATION_PCT+'% of orders triggered an SMS.<br>'+
    '<strong>SMS costs</strong> use Twilio\'s "Other" carrier rate per country, split into 2 billing units as most Ria messages are ~200 chars.'+
    '</div>'+

    '<div style="background:#FDF5E8;border:1px solid #EF9F27;border-radius:var(--radius);padding:10px 18px;margin-bottom:20px;font-size:11px;color:#633806;line-height:1.6;">'+
    '<strong>Scope &amp; known gaps</strong><br>'+
    allCountries.length+' markets shown — Twilio-priced countries with order-volume data on file. '+EXCLUDED_NO_ORDERS.length+' Twilio-priced countries excluded for missing order data: '+EXCLUDED_NO_ORDERS.join(', ')+'. '+
    'Rows tagged <span style="font-size:9px;font-weight:600;color:var(--em);background:var(--em-bg);padding:1px 5px;border-radius:3px;">+FEES</span> (US, Canada) exclude an additional, unquantified Twilio carrier-fee surcharge (twilio.com/sms/pricing).'+
    '</div>'+

    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap;">'+
    riaSendingToggleHtml()+
    '</div>'+

    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap;">'+
    '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);">View by region</div>'+
    '<select id="gc-region-sel-tw" onchange="buildGlobalTableTw(this.value)" style="padding:7px 12px;border-radius:7px;border:1px solid var(--border-mid);background:var(--card);font-size:13px;font-weight:500;color:var(--text);cursor:pointer;">'+regionOptions+'</select>'+
    '<div style="font-size:11px;color:var(--hint);margin-left:4px;">or pick specific countries:</div>'+
    '<select id="gc-country-sel-tw" onchange="gcAddCountryTw(this.value)" style="padding:7px 12px;border-radius:7px;border:1px solid var(--border-mid);background:var(--card);font-size:13px;color:var(--text);cursor:pointer;min-width:180px;">'+
    '<option value="">+ Add a country</option>'+countryOptions+'</select>'+
    '<div id="gc-country-tags-tw" style="display:flex;gap:6px;flex-wrap:wrap;"></div>'+
    '</div>'+

    '<div style="overflow-x:auto;border:1px solid var(--border);border-radius:var(--radius);">'+
    '<table style="width:100%;border-collapse:collapse;font-family:inherit;">'+
    '<thead><tr style="background:#FAFAF8;">'+
    '<th id="gc-th-market-tw" onclick="gcSortByTw(\'market\')" style="padding:10px 16px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--hint);border-bottom:1px solid var(--border);cursor:pointer;user-select:none;">Market<span id="gc-th-arrow-market-tw"> ↕</span></th>'+
    '<th id="gc-th-orders-tw" onclick="gcSortByTw(\'orders\')" style="padding:10px 16px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--hint);border-bottom:1px solid var(--border);cursor:pointer;user-select:none;">B&M orders<br><span style="font-weight:400;text-transform:none;letter-spacing:0;font-size:9px;">Power BI 2025</span><span id="gc-th-arrow-orders-tw"> ↕</span></th>'+
    '<th id="gc-th-msgs-tw" onclick="gcSortByTw(\'msgs\')" style="padding:10px 16px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--hint);border-bottom:1px solid var(--border);cursor:pointer;user-select:none;">Est. SMS sent<br><span style="font-weight:400;text-transform:none;letter-spacing:0;font-size:9px;">orders × '+PARTICIPATION_PCT+'%</span><span id="gc-th-arrow-msgs-tw"> ↕</span></th>'+
    '<th id="gc-th-rate-tw" onclick="gcSortByTw(\'rate\')" style="padding:10px 16px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--hint);border-bottom:1px solid var(--border);cursor:pointer;user-select:none;">Cost / SMS<br><span style="font-weight:400;text-transform:none;letter-spacing:0;font-size:9px;">Twilio rate</span><span id="gc-th-arrow-rate-tw"> ↕</span></th>'+
    '<th id="gc-th-cost-tw" onclick="gcSortByTw(\'cost\')" style="padding:10px 16px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text);border-bottom:1px solid var(--border);cursor:pointer;user-select:none;">Annual SMS cost<br><span style="font-weight:400;text-transform:none;letter-spacing:0;font-size:9px;">est. SMS × Twilio rate × 2 billing units</span><span id="gc-th-arrow-cost-tw"> ↓</span></th>'+
    '<th id="gc-th-cpo-tw" onclick="gcSortByTw(\'cpo\')" style="padding:10px 16px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--hint);border-bottom:1px solid var(--border);cursor:pointer;user-select:none;">Cost / order<span id="gc-th-arrow-cpo-tw"> ↕</span></th>'+
    '</tr></thead>'+
    '<tbody id="gc-tbody-tw"></tbody>'+
    '<tfoot><tr style="background:var(--purple-bg);">'+
    '<td id="gc-tfoot-label-tw" style="padding:12px 16px;font-size:12px;font-weight:700;color:var(--purple);">TOTAL</td>'+
    '<td id="gc-tfoot-orders-tw" style="padding:12px 16px;font-size:12px;font-weight:700;color:var(--purple);text-align:right;">—</td>'+
    '<td id="gc-tfoot-msgs-tw" style="padding:12px 16px;font-size:12px;font-weight:700;color:var(--purple);text-align:right;">—</td>'+
    '<td style="padding:12px 16px;font-size:12px;color:var(--purple);text-align:right;">—</td>'+
    '<td id="gc-tfoot-cost-tw" style="padding:12px 16px;font-size:14px;font-weight:700;color:var(--purple);text-align:right;">—</td>'+
    '<td id="gc-tfoot-cpo-tw" style="padding:12px 16px;font-size:12px;font-weight:700;color:var(--purple);text-align:right;">—</td>'+
    '</tr></tfoot></table></div>'+
    '<div style="font-size:10px;color:var(--hint);margin-top:10px;">'+allCountries.length+' markets available — Twilio-priced countries with both Twilio rate and Power BI order volume data. '+EXCLUDED_NO_ORDERS.length+' excluded due to missing order data: '+EXCLUDED_NO_ORDERS.join(', ')+'.</div>'+
    '</div>';

  document.getElementById('p6-content').innerHTML = html;
  buildGlobalTableTw('All markets');
}

