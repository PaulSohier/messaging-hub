// Page: Opt-in rates charts
/* ── OPT-IN RATES ── */
const OPTIN_CHANNELS = [
  {key:'Email', mkt:'mktEmailPct', svc:'svcEmailPct', mktN:'mktEmail', svcN:'svcEmail', color:'var(--em)'},
  {key:'SMS', mkt:'mktSmsPct', svc:'svcSmsPct', mktN:'mktSms', svcN:'svcSms', color:'var(--sms)'},
  {key:'WhatsApp', mkt:'mktWaPct', svc:'svcWaPct', mktN:'mktWa', svcN:'svcWa', color:'var(--wa)'},
];
let p8Selected = []; // array of country codes; empty = "all countries (global)"
let p8DropdownOpen = false;
let p8ZoomAxis = false; // false = honest 0-100 axis, true = fit axis to the data
let p8SearchTerm = '';
window._optinSort = {col:'total', dir:'desc'};

// Fixed-order categorical palette (validated for small-multiples comparison) —
// assigned to countries in selection order and never reassigned while a
// country stays selected, so removing one country never repaints the others.
const OPTIN_PALETTE = ['#2a78d6','#eb6834','#1baf7a','#eda100','#e87ba4','#008300','#4a3aa7','#e34948'];
const OPTIN_COMPARE_CAP = OPTIN_PALETTE.length; // max countries comparable at once
window._optinColorMap = window._optinColorMap || {};
function optinColorFor(code){
  if(!window._optinColorMap[code]){
    const used = Object.keys(window._optinColorMap).map(function(k){ return window._optinColorMap[k]; });
    const free = OPTIN_PALETTE.filter(function(c){ return used.indexOf(c)===-1; })[0];
    window._optinColorMap[code] = free || OPTIN_PALETTE[OPTIN_PALETTE.length-1];
  }
  return window._optinColorMap[code];
}

function optinFormatM(n){
  if(n===undefined||n===null) return '—';
  if(Math.abs(n) >= 1e6) return (n/1e6).toFixed(2)+'M';
  if(Math.abs(n) >= 1e3) return (n/1e3).toFixed(1)+'k';
  return String(n);
}

// Smooth line through the points that never overshoots them (monotone cubic,
// same idea as the "monotone" curve in common chart libraries).
function optinMonotonePath(pts){
  const n = pts.length;
  if(n < 2) return '';
  const dx = [], m = [];
  for(let i=0;i<n-1;i++){ dx[i] = pts[i+1].x - pts[i].x; m[i] = (pts[i+1].y - pts[i].y) / dx[i]; }
  const t = [m[0]];
  for(let i=1;i<n-1;i++){ t[i] = (m[i-1]*m[i] <= 0) ? 0 : (m[i-1]+m[i])/2; }
  t[n-1] = m[n-2];
  for(let i=0;i<n-1;i++){
    if(m[i] === 0){ t[i] = 0; t[i+1] = 0; continue; }
    const a = t[i]/m[i], b = t[i+1]/m[i], s = a*a + b*b;
    if(s > 9){ const k = 3/Math.sqrt(s); t[i] = k*a*m[i]; t[i+1] = k*b*m[i]; }
  }
  let d = 'M'+pts[0].x.toFixed(1)+','+pts[0].y.toFixed(1);
  for(let i=0;i<n-1;i++){
    const h = dx[i]/3;
    d += ' C'+(pts[i].x+h).toFixed(1)+','+(pts[i].y+t[i]*h).toFixed(1)
       + ' '+(pts[i+1].x-h).toFixed(1)+','+(pts[i+1].y-t[i+1]*h).toFixed(1)
       + ' '+pts[i+1].x.toFixed(1)+','+pts[i+1].y.toFixed(1);
  }
  return d;
}

// "2026-10-07" -> "Oct 7" (short) or "Oct 7, 2026" (long)
function optinFmtDate(iso, long){
  const d = new Date(iso+'T00:00:00');
  if(isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', long ? {month:'short', day:'numeric', year:'numeric'} : {month:'short', day:'numeric'});
}

// Draws ONE line per call in practice (the card shows the active tab only), but
// still accepts several series. No dots, smooth curve, horizontal grid only.
function optinTrendSVG(snapshots, seriesDefs, opts){
  opts = opts || {};
  const w = 760, h = 150, padL=34, padR=12, padT=10, padB=24;
  const n = snapshots.length;
  const plotW = w-padL-padR, plotH = h-padT-padB;

  // Collect every value first, so the axis can be fitted to the data when
  // "Zoom to data range" is on. Default stays 0-100, which is the honest
  // view: these rates barely move day to day, and a tight axis would turn
  // small wobbles into dramatic-looking swings.
  const seriesVals = seriesDefs.map(function(s){
    return snapshots.map(function(snap){ return opts.getValue(snap, s); });
  });
  const flat = [];
  seriesVals.forEach(function(arr){ arr.forEach(function(v){ if(v!==undefined && v!==null && !isNaN(v)) flat.push(v); }); });

  let yMin = 0, yMax = 100, step = 25;
  if(p8ZoomAxis && flat.length){
    const lo = Math.min.apply(null, flat), hi = Math.max.apply(null, flat);
    const pad = Math.max(1, (hi-lo) * 0.15);
    const rawSpan = Math.max(4, (hi + pad) - (lo - pad));
    // Pick a round tick step (1, 2, 5, 10, 20, 25) so gridline labels read
    // as clean numbers instead of values like 39% or 59%.
    const steps = [1,2,5,10,20,25,50];
    step = steps.filter(function(s){ return rawSpan / s <= 5; })[0] || 50;
    yMin = Math.max(0, Math.floor((lo - pad) / step) * step);
    yMax = Math.min(100, Math.ceil((hi + pad) / step) * step);
    if(yMax - yMin < step * 2){ yMax = Math.min(100, yMin + step * 2); }
  }
  const span = (yMax - yMin) || 1;

  const xAt = i => n<=1 ? padL+plotW/2 : padL + (i/(n-1))*plotW;
  const yAt = v => padT + (1-((Math.max(yMin,Math.min(yMax,v||0)) - yMin)/span))*plotH;

  // Gridline ticks: 5 evenly spaced across whatever range is in use.
  const ticks = [];
  for(let v=yMin; v<=yMax+0.0001; v+=step){ ticks.push(v); }

  const chartId = 'optinchart_'+(window._optinChartSeq = (window._optinChartSeq||0)+1);

  let svg = '<svg id="'+chartId+'" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto;overflow:visible;display:block;touch-action:pan-y;">';
  // Horizontal grid only, no axis lines, no tick marks.
  ticks.forEach(function(gv){
    svg += '<line x1="'+padL+'" x2="'+(w-padR)+'" y1="'+yAt(gv).toFixed(1)+'" y2="'+yAt(gv).toFixed(1)+'" stroke="var(--border)" stroke-width="1"/>';
    svg += '<text x="'+(padL-8)+'" y="'+(yAt(gv)+3).toFixed(1)+'" text-anchor="end" font-size="9" fill="var(--hint)">'+(step<1?gv.toFixed(1):String(Math.round(gv)))+'%</text>';
  });

  // Hover guide, hidden until the pointer is over the plot.
  svg += '<line class="optin-guide" x1="0" x2="0" y1="'+padT+'" y2="'+(padT+plotH)+'" stroke="var(--muted)" stroke-width="1" stroke-dasharray="3 3" style="opacity:0;"/>';

  const regSeries = [];
  seriesDefs.forEach(function(s, si){
    const vals = seriesVals[si];
    const pts = vals.map(function(v,i){ return {x:xAt(i), y:yAt(v), v:v}; });
    regSeries.push({key:s.key, color:s.color, vals:vals, ys:pts.map(function(p){ return p.y; })});
    if(n===1){
      svg += '<circle cx="'+pts[0].x+'" cy="'+pts[0].y+'" r="5" style="fill:'+s.color+'"/>';
      svg += '<text x="'+(pts[0].x+10)+'" y="'+(pts[0].y+3)+'" font-size="10" font-weight="700" style="fill:'+s.color+'">'+(pts[0].v||0).toFixed(1)+'%</text>';
    } else {
      // No dots on the line. A single marker appears only while hovering.
      svg += '<path d="'+optinMonotonePath(pts)+'" fill="none" style="stroke:'+s.color+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
      svg += '<circle class="optin-hoverdot" data-series="'+si+'" r="4" style="fill:'+s.color+';stroke:var(--card);stroke-width:1.5;opacity:0;" cx="0" cy="0"/>';
    }
  });

  // X labels: short dates ("Aug 14"), as many as fit with a comfortable gap.
  if(n===1){
    svg += '<text x="'+xAt(0)+'" y="'+(h-6)+'" text-anchor="middle" font-size="9" fill="var(--hint)">'+optinFmtDate(snapshots[0].date)+'</text>';
  } else if(n>1){
    const maxLabels = Math.max(2, Math.min(n, Math.floor(plotW / 90)));
    const idxs = [];
    for(let k=0;k<maxLabels;k++){ idxs.push(Math.round(k*(n-1)/(maxLabels-1))); }
    idxs.filter(function(v,i,a){ return a.indexOf(v)===i; }).forEach(function(i){
      const anchor = i===0 ? 'start' : (i===n-1 ? 'end' : 'middle');
      svg += '<text x="'+xAt(i).toFixed(1)+'" y="'+(h-6)+'" text-anchor="'+anchor+'" font-size="9" fill="var(--hint)">'+optinFmtDate(snapshots[i].date)+'</text>';
    });
  }

  // Transparent capture area for pointer tracking.
  svg += '<rect class="optin-hit" x="0" y="'+padT+'" width="'+w+'" height="'+plotH+'" fill="transparent" style="cursor:crosshair;"/>';
  svg += '</svg>';

  // Register the data so the hover handler can read values without re-deriving them.
  window._optinCharts = window._optinCharts || {};
  window._optinCharts[chartId] = {
    dates: snapshots.map(function(s){ return s.date; }),
    series: regSeries,
    geo: {padL:padL, plotW:plotW, n:n, vbW:w},
  };

  return '<div class="optin-chart-wrap" id="wrap_'+chartId+'"><div class="optin-tip" id="tip_'+chartId+'"></div>'+svg+'</div>';
}

// Attaches hover behaviour to every chart currently on the page. Called after
// the opt-in page writes its HTML, since the SVG is built as a string.
function optinWireCharts(){
  const reg = window._optinCharts || {};
  Object.keys(reg).forEach(function(id){
    const svg = document.getElementById(id);
    if(!svg || svg.dataset.wired) return;
    const data = reg[id];
    if(data.geo.n < 2) return;
    svg.dataset.wired = '1';
    const wrap = document.getElementById('wrap_'+id);
    const tip = document.getElementById('tip_'+id);
    const guide = svg.querySelector('.optin-guide');
    const dots = Array.prototype.slice.call(svg.querySelectorAll('.optin-hoverdot'));
    const hit = svg.querySelector('.optin-hit');
    const last = data.geo.n - 1;

    function hide(){
      if(guide) guide.style.opacity = '0';
      dots.forEach(function(d){ d.style.opacity = '0'; });
      if(tip) tip.style.opacity = '0';
    }

    function move(ev){
      // Map the pointer into viewBox units with the SVG's own transform, so it
      // stays correct whatever the rendered size or any letterboxing.
      const ctm = svg.getScreenCTM();
      if(!ctm) return;
      const pt = svg.createSVGPoint();
      pt.x = ev.clientX; pt.y = ev.clientY;
      const vbX = pt.matrixTransform(ctm.inverse()).x;
      const t = (vbX - data.geo.padL) / data.geo.plotW; // 0..1 across the plot
      let i = Math.round(t * last);
      i = Math.max(0, Math.min(last, i));
      const x = data.geo.padL + (i/last)*data.geo.plotW;

      if(guide){ guide.setAttribute('x1', x); guide.setAttribute('x2', x); guide.style.opacity = '1'; }
      dots.forEach(function(d){
        const si = parseInt(d.getAttribute('data-series'),10);
        if(!data.series[si]) return;
        d.setAttribute('cx', x);
        d.setAttribute('cy', data.series[si].ys[i]);
        d.style.opacity = '1';
      });

      // Floating tooltip next to the guide, flipped to the left near the right edge.
      if(tip && wrap){
        tip.innerHTML = optinTipHTML(data, i);
        const scale = svg.getBoundingClientRect().width / data.geo.vbW;
        const px = x * scale;
        const tw = tip.offsetWidth;
        let left = px + 14;
        if(left + tw > wrap.clientWidth) left = px - tw - 14;
        tip.style.left = Math.max(0, left)+'px';
        tip.style.opacity = '1';
      }
    }

    if(hit){
      hit.addEventListener('pointermove', move);
      hit.addEventListener('pointerdown', move);
      hit.addEventListener('pointerleave', hide);
      hit.addEventListener('pointercancel', hide);
    }
  });
}

// Tooltip content for snapshot i: long date, then one row per drawn series.
function optinTipHTML(data, i){
  const rows = data.series.map(function(s){
    const v = s.vals[i];
    return '<div class="optin-tip-row"><span class="optin-swatch" style="background:'+s.color+'"></span>'
      + '<span>'+esc(s.key)+'</span>'
      + '<span class="optin-tip-val">'+(v===undefined||v===null||isNaN(v) ? 'no data' : v.toFixed(1)+'%')+'</span></div>';
  }).join('');
  return '<div class="optin-tip-date">'+optinFmtDate(data.dates[i], true)+'</div>'+rows;
}

function optinLegend(seriesDefs){
  return '<div class="optin-legend">'+seriesDefs.map(function(s){
    return '<div class="optin-legend-item"><span class="optin-swatch" style="background:'+s.color+'"></span>'+s.key+'</div>';
  }).join('')+'</div>';
}

function optinStatTile(label, value, sub, color){
  return '<div class="optin-stat"><div class="optin-stat-label">'+(color?'<span class="optin-swatch" style="background:'+color+'"></span>':'')+label+'</div>'
    + '<div class="optin-stat-value">'+value+'</div>'
    + (sub?'<div class="optin-stat-sub">'+sub+'</div>':'')
    + '</div>';
}

// Shared trend-card renderer — used both for the single 3-channel chart
// (global / one country) and the per-channel small multiples (comparing
// several countries). seriesDefs need only {key, color}; getValue(snap, s)
// returns the % for that series on that snapshot (undefined if missing).
function optinRenderTrendCard(title, oneDayNote, snaps, seriesDefs, getValue){
  if(snaps.length < 2){
    return '<div class="optin-chart-card"><div class="optin-chart-title">'+title+'</div>'
      + '<div class="optin-chart-note">'+oneDayNote+'</div>'
      + '<div style="display:flex;gap:24px;flex-wrap:wrap;">'
      + seriesDefs.map(function(s){
          const sv = snaps.length ? getValue(snaps[0], s) : undefined;
          return '<div style="font-size:12px;"><span class="optin-swatch" style="background:'+s.color+'"></span> '+esc(s.key)+' — '+(sv||0).toFixed(1)+'%</div>';
        }).join('')
      + '</div></div>';
  }
  // Interactive card: one tab per series (latest value on each tab), and the
  // chart draws only the selected series. The choice is remembered by title,
  // so re-rendering the page (zoom toggle, country change) keeps it.
  window._optinCards = window._optinCards || {};
  window._optinActive = window._optinActive || {};
  const cardId = 'optincard_'+(window._optinCardSeq = (window._optinCardSeq||0)+1);
  let active = window._optinActive[title] || 0;
  if(active >= seriesDefs.length) active = 0;
  window._optinCards[cardId] = {title:title, snaps:snaps, seriesDefs:seriesDefs, getValue:getValue, active:active, chartId:null};
  return '<div class="optin-chart-card" id="'+cardId+'">'+optinCardInner(cardId)+'</div>';
}

function optinCardInner(cardId){
  const c = window._optinCards[cardId];
  const last = c.snaps[c.snaps.length-1];
  // Tabs are a static legend with the latest value. All lines are always drawn.
  const tabs = c.seriesDefs.map(function(s){
    const v = c.getValue(last, s);
    return '<div class="optin-tab" style="box-shadow:inset 0 -2px 0 '+s.color+';">'
      + '<span class="optin-tab-label"><span class="optin-swatch" style="background:'+s.color+'"></span>'+esc(s.key)+'</span>'
      + '<span class="optin-tab-val">'+(v===undefined||v===null||isNaN(v) ? 'no data' : v.toFixed(1)+'%')+'</span></div>';
  }).join('');
  const chart = optinTrendSVG(c.snaps, c.seriesDefs, {getValue:c.getValue});
  return '<div class="optin-card-head"><div class="optin-card-head-text"><div class="optin-chart-title" style="margin-bottom:0;">'+c.title+'</div>'
    + '<div class="optin-chart-note" style="margin-bottom:0;">Latest value per series. Hover the chart for a day.</div></div>'
    + '<div class="optin-tabs">'+tabs+'</div></div>'+chart;
}

window.setP8Zoom = function(on){
  p8ZoomAxis = !!on;
  renderOptin();
};

window.setP8All = function(){
  p8Selected = [];
  renderOptin();
};

window.toggleP8Country = function(code, checked){
  if(checked){
    if(p8Selected.indexOf(code)===-1){
      if(p8Selected.length >= OPTIN_COMPARE_CAP) return; // cap guard — checkbox should already be disabled
      p8Selected.push(code);
      optinColorFor(code); // assign a stable color slot now, on first selection
    }
  } else {
    p8Selected = p8Selected.filter(function(c){ return c!==code; });
  }
  renderOptin();
};

window.filterP8CountryList = function(term){
  p8SearchTerm = term;
  const list = document.getElementById('p8-country-list');
  if(!list) return;
  const t = term.trim().toLowerCase();
  Array.prototype.forEach.call(list.querySelectorAll('.optin-country-row'), function(row){
    const name = (row.getAttribute('data-name')||'');
    row.style.display = (!t || name.indexOf(t)!==-1) ? '' : 'none';
  });
};

window.optinSortBy = function(col){
  if(window._optinSort.col===col){ window._optinSort.dir = window._optinSort.dir==='desc'?'asc':'desc'; }
  else { window._optinSort.col = col; window._optinSort.dir = col==='country'?'asc':'desc'; }
  renderOptin();
};

async function renderOptin(){
  const container = document.getElementById('p8-content');
  container.innerHTML = '<div style="padding:60px;text-align:center;color:var(--muted);font-size:13px;">Loading opt-in data…</div>';

  let data;
  try {
    const res = await fetch('data/optin-daily.json');
    if(!res.ok) throw new Error('fetch failed: '+res.status);
    data = await res.json();
  } catch(e){
    container.innerHTML = '<div class="empty-intent"><div class="empty-intent-title">Could not load opt-in data</div>'
      + '<div class="empty-intent-sub">Check that data/optin-daily.json exists on this branch.</div></div>';
    return;
  }

  const snapshots = (data.snapshots||[]).slice().sort(function(a,b){ return a.date.localeCompare(b.date); });
  if(!snapshots.length){
    container.innerHTML = '<div class="empty-intent"><div class="empty-intent-title">No opt-in captures yet</div>'
      + '<div class="empty-intent-sub">The first daily screenshot will show up here once it\'s captured.</div></div>';
    return;
  }
  const latest = snapshots[snapshots.length-1];
  const ageDays = Math.floor((Date.now() - new Date(latest.date+'T12:00:00').getTime()) / 86400000);
  setStatus('optin', {
    level: ageDays > 3 ? 'warn' : 'ok',
    label: ageDays > 3 ? 'Opt-in data is '+ageDays+' days old' : 'Opt-in data: '+latest.date,
    details: [{lines:[snapshots.length+' day'+(snapshots.length!==1?'s':'')+' captured. Latest: '+latest.date+'.']}]
  });

  // Country options come from whichever snapshot has the fullest country list
  const countryMap = {};
  snapshots.forEach(function(s){ (s.countries||[]).forEach(function(c){ countryMap[c.code] = c.name; }); });
  const countryOpts = Object.keys(countryMap).sort(function(a,b){ return countryMap[a].localeCompare(countryMap[b]); });

  let html = '';

  if(latest.countriesPartial){
    html += '<div class="optin-banner">⚠ The country breakdown for '+latest.date+' is partial'
      + (latest.countriesNote ? ' — '+esc(latest.countriesNote) : '')
      + '. The global figures above are unaffected (they come from the dashboard\'s own header tiles, not the scrollable table).</div>';
  }

  // Toolbar: country selector — a checkbox dropdown ("All countries" + one
  // checkbox per country) so several specific countries can be compared at once.
  const hasSelection = p8Selected.length > 0;
  const atCap = p8Selected.length >= OPTIN_COMPARE_CAP;
  let summaryText;
  if(!hasSelection) summaryText = 'All countries (global)';
  else if(p8Selected.length===1) summaryText = esc(countryMap[p8Selected[0]]||p8Selected[0]);
  else {
    const names = p8Selected.map(function(c){ return countryMap[c]||c; });
    summaryText = p8Selected.length+' selected: '+esc(names.slice(0,3).join(', '))+(names.length>3?' +'+(names.length-3)+' more':'');
  }
  html += '<div class="optin-toolbar"><span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);">Countries:</span>'
    + '<details class="optin-country-dropdown" id="p8-dropdown" '+(p8DropdownOpen?'open':'')+' ontoggle="p8DropdownOpen=this.open;">'
    + '<summary>'+summaryText+'</summary>'
    + '<div class="optin-country-panel">'
    + '<div class="optin-country-alloption" onclick="setP8All()"><input type="checkbox" '+(!hasSelection?'checked':'')+' onclick="event.stopPropagation();setP8All();" readonly> All countries (global)</div>'
    + '<input type="text" placeholder="Search countries…" value="'+esc(p8SearchTerm)+'" oninput="filterP8CountryList(this.value)">'
    + '<div class="optin-country-list" id="p8-country-list">'
    + countryOpts.map(function(code){
        const checked = p8Selected.indexOf(code)!==-1;
        const disable = (!checked && atCap) ? ' disabled' : '';
        const swatch = checked ? '<span class="optin-swatch" style="background:'+optinColorFor(code)+'"></span>' : '';
        return '<label class="optin-country-row" data-name="'+esc(countryMap[code].toLowerCase())+'">'
          + '<input type="checkbox" '+(checked?'checked':'')+disable+' onchange="toggleP8Country(\''+code+'\', this.checked)"> '+swatch+esc(countryMap[code])
          + '</label>';
      }).join('')
    + '</div>'
    + (atCap ? '<div class="optin-country-cap-note">Comparing '+OPTIN_COMPARE_CAP+' countries at once (the max we can show clearly) — deselect one to add another.</div>' : '')
    + '</div></details>'
    + '<label class="optin-zoom"><input type="checkbox" '+(p8ZoomAxis?'checked':'')+' onchange="setP8Zoom(this.checked)" style="cursor:pointer;"> Zoom to data range</label>'
    + '</div>';

  // ── Stat tiles (skipped when comparing 2+ countries — the table below covers it) ──
  let statRow = '';
  if(!hasSelection){
    const g = latest.global||{};
    statRow = '<div class="optin-stat-row">'
      + optinStatTile('Total customers', optinFormatM(g.totalCustomers))
      + optinStatTile('SVC Email', optinFormatM(g.svcEmail), (g.svcEmailPct||0).toFixed(1)+'%', 'var(--em)')
      + optinStatTile('SVC SMS', optinFormatM(g.svcSms), (g.svcSmsPct||0).toFixed(1)+'%', 'var(--sms)')
      + optinStatTile('SVC WhatsApp', optinFormatM(g.svcWa), (g.svcWaPct||0).toFixed(1)+'%', 'var(--wa)')
      + '</div>';
  } else if(p8Selected.length===1){
    const code = p8Selected[0];
    const rows = snapshots.map(function(s){ return {date:s.date, row:(s.countries||[]).find(function(c){ return c.code===code; })}; }).filter(function(r){ return r.row; });
    const lastRow = rows.length ? rows[rows.length-1].row : null;
    if(lastRow){
      statRow = '<div class="optin-stat-row">'
        + optinStatTile('Total customers', optinFormatM(lastRow.total))
        + optinStatTile('SVC Email', optinFormatM(lastRow.svcEmail), (lastRow.svcEmailPct||0).toFixed(1)+'%', 'var(--em)')
        + optinStatTile('SVC SMS', optinFormatM(lastRow.svcSms), (lastRow.svcSmsPct||0).toFixed(1)+'%', 'var(--sms)')
        + optinStatTile('SVC WhatsApp', optinFormatM(lastRow.svcWa), (lastRow.svcWaPct||0).toFixed(1)+'%', 'var(--wa)')
        + '</div>';
    } else {
      statRow = '<div class="optin-banner">No captured data for '+esc(countryMap[code]||code)+' yet.</div>';
    }
  } else {
    statRow = '<div class="optin-compare-legend">' + p8Selected.map(function(code){
        const lastRow = (latest.countries||[]).find(function(c){ return c.code===code; });
        const totalTxt = lastRow ? optinFormatM(lastRow.total) : 'no data '+latest.date;
        return '<span class="optin-legend-item"><span class="optin-swatch" style="background:'+optinColorFor(code)+'"></span>'+esc(countryMap[code]||code)+' — '+totalTxt+'</span>';
      }).join('') + '</div>';
  }
  html += statRow;

  // ── Trend chart(s) (Service opt-in % — Email/SMS/WhatsApp) ──
  if(!hasSelection){
    const getSvc = function(snap,s){ return (snap.global||{})[s.svc]; };
    html += optinRenderTrendCard('Global Service opt-in % — trend', 'Only one day captured so far — the trend line appears once a second day is added.', snapshots, OPTIN_CHANNELS, getSvc);
  } else if(p8Selected.length===1){
    const code = p8Selected[0];
    const rows = snapshots.map(function(s){ return {date:s.date, row:(s.countries||[]).find(function(c){ return c.code===code; })}; }).filter(function(r){ return r.row; });
    const trendSnaps = rows.map(function(r){ return {date:r.date, row:r.row}; });
    const getSvc = function(snap,s){ return (snap.row||{})[s.svc]; };
    html += optinRenderTrendCard((countryMap[code]||code)+' Service opt-in % — trend', 'Only one day captured so far for '+esc(countryMap[code]||code)+' — the trend line appears once a second day is added.', trendSnaps, OPTIN_CHANNELS, getSvc);
  } else {
    // Compare mode: one small-multiple chart per channel, one line per selected country.
    const seriesDefs = p8Selected.map(function(code){ return {key: countryMap[code]||code, color: optinColorFor(code), code: code}; });
    OPTIN_CHANNELS.forEach(function(ch){
      const getValue = function(snap, s){
        const row = (snap.countries||[]).find(function(c){ return c.code===s.code; });
        return row ? row[ch.svc] : undefined;
      };
      html += optinRenderTrendCard(ch.key+' Service opt-in % — trend (by country)', 'Only one day captured so far — the trend line appears once a second day is added.', snapshots, seriesDefs, getValue);
    });
  }

  // ── Country table (latest day, Service columns only) ──
  const sortCol = window._optinSort.col, sortDir = window._optinSort.dir;
  let tableRows = (latest.countries||[]).slice();
  if(hasSelection) tableRows = tableRows.filter(function(c){ return p8Selected.indexOf(c.code)!==-1; });
  tableRows.sort(function(a,b){
    var av,bv;
    if(sortCol==='country'){ av=a.name; bv=b.name; return sortDir==='asc'?av.localeCompare(bv):bv.localeCompare(av); }
    av = a[sortCol]||0; bv = b[sortCol]||0;
    return sortDir==='asc'? av-bv : bv-av;
  });
  const cols = [
    {key:'country', label:'Country'},{key:'total', label:'Total'},
    {key:'svcEmailPct', label:'Email %'},{key:'svcSmsPct', label:'SMS %'},{key:'svcWaPct', label:'WhatsApp %'},
  ];
  html += '<div class="optin-table-wrap"><table class="optin-table"><thead><tr>'
    + cols.map(function(c){
        const arrow = c.key===sortCol ? (sortDir==='desc'?' ↓':' ↑') : '';
        return '<th onclick="optinSortBy(\''+c.key+'\')">'+c.label+arrow+'</th>';
      }).join('')
    + '</tr></thead><tbody>'
    + tableRows.map(function(c){
        const dot = (hasSelection && p8Selected.length>1) ? '<span class="optin-swatch" style="background:'+optinColorFor(c.code)+';margin-right:6px;"></span>' : '';
        return '<tr><td style="font-weight:600;">'+dot+esc(c.name)+'</td>'
          + '<td>'+(c.total||0).toLocaleString('en-US')+'</td>'
          + '<td>'+(c.svcEmailPct||0).toFixed(2)+'%</td>'
          + '<td>'+(c.svcSmsPct||0).toFixed(2)+'%</td>'
          + '<td>'+(c.svcWaPct||0).toFixed(2)+'%</td>'
          + '</tr>';
      }).join('')
    + '</tbody></table></div>';
  if(!tableRows.length){
    const missingNames = hasSelection ? p8Selected.map(function(c){ return countryMap[c]||c; }).join(', ') : '';
    html += '<div class="empty-intent" style="margin-top:14px;"><div class="empty-intent-title">No country-level row for '+esc(missingNames)+' on '+latest.date+'</div></div>';
  }

  container.innerHTML = html;
  optinWireCharts(); // attach hover tooltips now that the SVGs exist in the DOM
  filterP8CountryList(p8SearchTerm); // reapply the search filter on the freshly-rendered checkbox list
}

