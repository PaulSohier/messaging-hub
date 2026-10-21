// Page: SMS activation map
/* World map shapes for the Activation page: simplified, 960x500 viewBox, with bounding boxes */
/* data/act-geo.json is loaded on first use (see loadActGeo) */

/* ── ACTIVATION MAP (B&M, Ria, FX Client only) ── */
async function loadActGeo(){
  if(window._actGeo) return window._actGeo;
  const res = await fetch('data/act-geo.json');
  if(!res.ok) throw new Error('act-geo.json '+res.status);
  window._actGeo = await res.json();
  return window._actGeo;
}

async function renderActivation(){
  let ACT_GEO;
  try { ACT_GEO = await loadActGeo(); }
  catch(e){ document.getElementById('p13-content').innerHTML = '<div class="rm-note">The world map data could not be loaded (data/act-geo.json). Reload the page.</div>'; return; }
  if(!window._imData) renderIterableMigration();   // shared rate, order and live-event data
  const D = window._imData, EV = D.US_EVENTS;
  const ALIAS = {'Antigua & Barbuda':'Antigua and Barb.','Bosnia Herzegovina':'Bosnia and Herz.','British Virgin Islands':'British Virgin Is.','Cape Verde':'Cabo Verde','Cayman Islands':'Cayman Is.','Congo Brazaville':'Congo','Congo DRC':'Dem. Rep. Congo','Cook Islands':'Cook Is.','Czech Republic':'Czechia','Dominican Republic':'Dominican Rep.','Guinea Bissau':'Guinea-Bissau','Ivory Coast':"Côte d'Ivoire",'Korea South':'South Korea','Macau':'Macao','North Macedonia':'Macedonia','Solomon Islands':'Solomon Is.','South Sudan':'S. Sudan','Trinidad & Tobago':'Trinidad and Tobago','Turks & Caicos':'Turks and Caicos Is.','United States':'United States of America'};
  const REF = (D.LIVE_EVENTS['United States'] || []).length || EV.length;   // the US is the reference
  const geoNames = {}; ACT_GEO.forEach(function(g){ geoNames[g.n] = true; });

  const DATA = {};
  const all = {}; Object.keys(D.ORDERS).forEach(function(c){ all[c] = 1; }); Object.keys(D.LIVE_EVENTS).forEach(function(c){ all[c] = 1; });
  Object.keys(all).forEach(function(c){
    const atlas = ALIAS[c] || c;
    if(!geoNames[atlas]) return;
    const orders = D.ORDERS[c] || 0, live = D.LIVE_EVENTS[c] || [];
    if(!orders && !live.length) return;
    DATA[atlas] = {atlas:atlas, name:c, orders:orders, rate:D.CLICKATELL[c], live:new Set(live), isUS:c === 'United States'};
  });

  const A = window._act = {selected:null, filter:'live', vb:[0,0,960,500], anim:0, drag:null, moved:false};
  const fmt = function(n){ return n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e3 ? Math.round(n/1e3)+'k' : Math.round(n)+''; };
  const money = function(n){ return '$'+(n >= 1000 ? Math.round(n).toLocaleString('en-US') : n.toFixed(n < 10 ? 2 : 0)); };
  const value = function(d){ return Math.min(1, d.live.size / REF); };
  const color = function(v){ if(v <= 0) return 'var(--act-none)'; return 'hsl(187 60% '+(92 - Math.min(1,v)*58)+'%)'; };
  // today = what the market really sends (Ria BI 2026, or the European average). extra = full coverage minus today.
  function evMetrics(d, e, i){
    if(!d.orders || d.rate === undefined) return null;
    const t = obsTodayRate(D, d.name, i), f = obsFullRate(D, d.name, i);
    const live = obsIsLive(D, d.name, i);
    const todayVol = (t/100) * d.orders;
    const extraVol = live ? 0 : Math.max(0, (f - t)/100) * d.orders;
    return {live:live, todayVol:todayVol, todayCost:todayVol*e.s*d.rate, vol:extraVol, cost:extraVol*e.s*d.rate, measured:!!OBS.markets[d.name]};
  }

  document.getElementById('p13-content').innerHTML =
    '<div class="act-wrap">'
    + '<div class="act-intro"><b>What is activated today.</b> Only B&amp;M SMS events that are live in FX Client, for Ria. Each market is compared with the United States ('+REF+' events live). Volumes and costs are real 2026 figures for the 9 measured markets (US, Canada, Australia, France, Spain, Germany, Italy, UK, Belgium) and estimates, from the European average, for the others. Click a market to see what it sends today and what would happen if an event is activated.</div>'
    + '<div class="act-main">'
    + '<section class="act-card act-mapcard">'
    + '<svg id="act-map" viewBox="0 0 960 500" role="img" aria-label="World map of live FX Client SMS events by market"></svg>'
    + '<button class="act-reset" id="act-reset">&larr; World view</button>'
    + '<div class="act-zoomctl"><button id="act-zin" aria-label="Zoom in">+</button><button id="act-zout" aria-label="Zoom out">&minus;</button><button id="act-zfit" aria-label="Fit world">&#x2922;</button></div>'
    + '<div class="act-hint">Scroll to zoom, drag to move</div>'
    + '<div class="act-legend">Events live in FX Client vs United States<div class="act-bar"></div><div class="act-ticks"><span>0%</span><span>50%</span><span>100%</span></div><div class="act-nodata"><span class="act-sw"></span>Nothing live</div></div>'
    + '</section>'
    + '<aside class="act-card act-side" id="act-side"></aside>'
    + '</div><div id="act-tip"></div></div>';

  const svg = document.getElementById('act-map'), tip = document.getElementById('act-tip');
  const paths = {};
  ACT_GEO.forEach(function(g){
    const p = document.createElementNS('http://www.w3.org/2000/svg','path');
    p.setAttribute('d', g.d); p.dataset.n = g.n; paths[g.n] = p; g.p = p;
    const d = DATA[g.n];
    if(d){
      p.classList.add('has'); p.setAttribute('tabindex','0'); p.setAttribute('aria-label', d.name);
      p.addEventListener('click', function(){ select(g.n); });
      p.addEventListener('keydown', function(e){ if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); select(g.n); } });
    }
    p.addEventListener('mousemove', function(e){ showTip(e, g.n); });
    p.addEventListener('mouseleave', function(){ tip.style.opacity = 0; });
    svg.appendChild(p);
  });
  function showTip(e, n){
    const d = DATA[n]; let html;
    if(!d) html = '<b>'+esc(n)+'</b><br>Not a Ria sending market';
    else html = '<b>'+esc(d.name)+'</b><br>'+(d.live.size ? d.live.size+' of '+REF+' events live ('+Math.round(value(d)*100)+'%)' : 'Nothing live')+'<br><span style="opacity:.7">Click to zoom</span>';
    tip.innerHTML = html; tip.style.opacity = 1;
    tip.style.left = Math.min(innerWidth-250, e.clientX+14)+'px'; tip.style.top = (e.clientY+14)+'px';
  }
  function paint(){
    Object.keys(paths).forEach(function(n){ const p = paths[n], d = DATA[n]; p.style.fill = d ? color(value(d)) : 'var(--act-none)'; p.classList.toggle('sel', n === A.selected); });
    if(A.selected) svg.appendChild(paths[A.selected]);
  }

  // zoom by animating the viewBox
  function setVB(v){ A.vb = v; svg.setAttribute('viewBox', v.map(function(x){ return x.toFixed(2); }).join(' ')); document.getElementById('act-reset').classList.toggle('show', !!A.selected || v[2] < 959); }
  function zoomTo(t){
    cancelAnimationFrame(A.anim);
    const from = A.vb.slice(), t0 = performance.now(), dur = 650;
    const ease = function(x){ return x < .5 ? 2*x*x : 1 - Math.pow(-2*x+2,2)/2; };
    (function step(now){
      const k = Math.min(1,(now-t0)/dur), e = ease(k);
      setVB(from.map(function(v,i){ return v + (t[i]-v)*e; }));
      if(k < 1) A.anim = requestAnimationFrame(step);
    })(t0);
  }
  function clampVB(v){
    const w = Math.min(960, Math.max(10, v[2])), h = w*500/960;
    return [Math.min(Math.max(v[0],0),960-w), Math.min(Math.max(v[1],0),500-h), w, h];
  }
  function zoomAt(cx, cy, factor){
    cancelAnimationFrame(A.anim);
    const r = svg.getBoundingClientRect(), fx = (cx-r.left)/r.width, fy = (cy-r.top)/r.height;
    const w = Math.min(960, Math.max(10, A.vb[2]*factor)), h = w*500/960;
    const px = A.vb[0]+fx*A.vb[2], py = A.vb[1]+fy*A.vb[3];
    setVB(clampVB([px-fx*w, py-fy*h, w, h]));
  }
  function boxFor(n){
    const g = ACT_GEO.filter(function(x){ return x.n === n; })[0], b = g.b;
    let w = b[2]-b[0], h = b[3]-b[1]; const cx = (b[0]+b[2])/2, cy = (b[1]+b[3])/2;
    w = Math.max(w*1.5, 70); h = Math.max(h*1.5, 70*500/960);
    const ar = 960/500; if(w/h < ar) w = h*ar; else h = w/ar;
    return [cx-w/2, cy-h/2, w, h];
  }

  // side panel
  function renderWorld(){
    const list = Object.keys(DATA).map(function(k){ return DATA[k]; }).filter(function(d){ return !d.isUS; })
      .sort(function(a,b){ return (b.live.size - a.live.size) || (b.orders - a.orders); });
    const live = list.filter(function(d){ return d.live.size > 0; }).length;
    document.getElementById('act-side').innerHTML =
      '<h2>World view</h2>'
      + '<div class="act-sub">Reference: the United States has '+REF+' events live. Each market is compared with it.</div>'
      + '<div class="act-big">'+live+'<span style="font-size:16px;font-weight:500;color:var(--muted)"> of '+list.length+'</span></div>'
      + '<div class="act-sub">Markets with at least one event live in FX Client</div>'
      + '<ul class="act-rank">'+list.map(function(d){
          return '<li><button data-n="'+esc(d.atlas)+'"><span>'+esc(d.name)+'</span><span class="act-track"><i style="width:'+(Math.min(1,d.live.size/REF)*100).toFixed(1)+'%;background:var(--act-fx)"></i></span><span class="act-pc">'+Math.round(value(d)*100)+'%</span></button></li>';
        }).join('')+'</ul>'
      + '<p class="act-note">Click a market on the map, or in this list, to zoom and see its events.</p>';
    document.querySelectorAll('#act-side .act-rank button').forEach(function(b){ b.onclick = function(){ select(b.dataset.n); }; });
  }
  function renderCountry(){
    const d = DATA[A.selected], n = d.live.size;
    const rows = EV.map(function(e,i){ const m = evMetrics(d,e,i); return {e:e, on:m ? m.live : d.live.has(i), m:m}; });
    const liveRows = rows.filter(function(r){ return r.on; }), offRows = rows.filter(function(r){ return !r.on; });
    const hasCost = d.orders > 0 && d.rate !== undefined;
    const sum = function(arr, k){ return arr.reduce(function(s,r){ return s + (r.m ? r.m[k] : 0); }, 0); };
    const sent = sum(rows,'todayVol'), cost = sum(rows,'todayCost'), missVol = sum(rows,'vol'), missCost = sum(rows,'cost');
    const measured = !!OBS.markets[d.name];
    const shown = rows.filter(function(r){ return A.filter === 'all' || (A.filter === 'live' ? r.on : !r.on); });
    document.getElementById('act-side').innerHTML =
      '<button class="act-back" id="act-back">&larr; World view</button>'
      + '<h2>'+esc(d.name)+'</h2>'
      + '<div class="act-big">'+Math.round(value(d)*100)+'%</div>'
      + '<div class="act-sub">'+n+' of '+REF+' US events live in FX Client</div>'
      + '<div class="act-stack"><i style="width:'+(value(d)*100)+'%;background:var(--act-fx)"></i></div>'
      + (hasCost
        ? '<div class="act-kpis">'
          + '<div class="act-kpi"><b>'+fmt(d.orders)+'</b><span>Orders per year'+(measured ? ' (2026)' : ' (2025)')+'</span></div>'
          + '<div class="act-kpi"><b>'+n+'</b><span>Events live</span></div>'
          + '<div class="act-kpi"><b>'+fmt(sent)+'</b><span>SMS / year as of today'+(measured ? '' : ' (est.)')+'</span></div>'
          + '<div class="act-kpi"><b>'+money(cost)+'</b><span>SMS cost / year as of today'+(measured ? '' : ' (est.)')+'</span></div></div>'
        : '<div class="act-callout">No order volume or Clickatell rate on file for this market, so no volume or cost estimate.</div>')
      + (hasCost && offRows.length
        ? '<div class="act-callout"><b>'+offRows.length+' events not at full coverage.</b> Turning them all on would add about <b>'+fmt(missVol)+'</b> SMS and <b>'+money(missCost)+'</b> per year on top of today (Clickatell rate $'+d.rate.toFixed(4)+' per SMS segment).</div>'
        : (!offRows.length ? '<div class="act-callout" style="background:#eaf7f0;border-color:#bfe3cf">All reference events are live in this market.</div>' : ''))
      + '<div class="act-chips" role="group" aria-label="Filter events">'
      + [['live','Live '+liveRows.length],['off','Not live '+offRows.length]].map(function(x){ return '<button class="act-chip '+(A.filter===x[0]?'on':'')+'" data-f="'+x[0]+'">'+x[1]+'</button>'; }).join('')
      + '</div>'
      + '<div class="act-events">'+(shown.map(function(r){
          return '<div class="act-ev '+(r.on?'':'off')+'"><span class="nm">'+esc(r.e.name || r.e.n)+'</span>'
            + '<span class="meta">'+(r.m ? (r.on ? 'Today: '+fmt(r.m.todayVol)+' SMS / year, '+money(r.m.todayCost) : (r.m.todayVol > 0 ? 'Today: '+fmt(r.m.todayVol)+' SMS, '+money(r.m.todayCost)+'. If fully activated: +' : 'Today: none. If activated: +')+fmt(r.m.vol)+' SMS, +'+money(r.m.cost)+' / year') : 'No estimate')+' &middot; '+r.e.s+' segment'+(r.e.s>1?'s':'')+'</span>'
            + '<span class="right">'+(r.on ? '<span class="act-pill fx">FX Client</span>' : '<span class="act-pill off">'+(r.m && r.m.todayVol > 0 ? 'Partial' : 'Not live')+'</span>')+'</span></div>';
        }).join('') || '<p class="act-sub" style="padding:10px 0">Nothing here.</p>')+'</div>'
      + '<p class="act-note">'+(measured ? 'Measured: real 2026 SMS per event from Ria BI (1 Jan to 13 Oct 2026), annualised.' : 'Estimate: no 2026 data for this market, so the European average is used for the live events.')+' If activated = full coverage (US 2026 rate) minus today. SMS only.</p>';
    document.getElementById('act-back').onclick = function(){ select(null); };
    document.querySelectorAll('#act-side .act-chip').forEach(function(b){ b.onclick = function(){ A.filter = b.dataset.f; renderCountry(); }; });
  }
  function select(n){
    A.selected = n; A.filter = 'live';
    tip.style.opacity = 0;
    if(document.activeElement && document.activeElement.blur && svg.contains(document.activeElement)) document.activeElement.blur();
    zoomTo(n ? boxFor(n) : [0,0,960,500]);
    paint(); n ? renderCountry() : renderWorld();
    document.getElementById('act-side').scrollTop = 0;
  }

  document.getElementById('act-reset').onclick = function(){ select(null); };
  svg.addEventListener('click', function(e){ if(e.target === svg && A.selected) select(null); });
  svg.addEventListener('wheel', function(e){ e.preventDefault(); zoomAt(e.clientX, e.clientY, Math.exp(e.deltaY*0.0018)); }, {passive:false});
  function centerZoom(f){ const r = svg.getBoundingClientRect(); zoomAt(r.left+r.width/2, r.top+r.height/2, f); }
  document.getElementById('act-zin').onclick = function(){ centerZoom(1/1.6); };
  document.getElementById('act-zout').onclick = function(){ centerZoom(1.6); };
  document.getElementById('act-zfit').onclick = function(){ zoomTo([0,0,960,500]); };
  svg.addEventListener('dblclick', function(e){ e.preventDefault(); zoomAt(e.clientX, e.clientY, .5); });
  svg.addEventListener('pointerdown', function(e){ if(e.button !== 0) return; A.drag = {x:e.clientX, y:e.clientY, vb:A.vb.slice()}; A.moved = false; });
  svg.addEventListener('click', function(e){ if(A.moved){ e.stopPropagation(); e.preventDefault(); } }, true);

  // window listeners are added once, and always read the current map state
  if(!window._actBound){
    window._actBound = true;
    window.addEventListener('pointermove', function(e){
      const S = window._act; if(!S || !S.drag) return;
      const sv = document.getElementById('act-map'); if(!sv) return;
      const dx = e.clientX - S.drag.x, dy = e.clientY - S.drag.y;
      if(!S.moved && Math.hypot(dx,dy) > 4){ S.moved = true; sv.classList.add('drag'); const t = document.getElementById('act-tip'); if(t) t.style.opacity = 0; cancelAnimationFrame(S.anim); }
      if(S.moved){
        const r = sv.getBoundingClientRect(), v = S.drag.vb;
        const w = Math.min(960, Math.max(10, v[2])), h = w*500/960;
        const nv = [Math.min(Math.max(v[0]-dx/r.width*v[2],0),960-w), Math.min(Math.max(v[1]-dy/r.height*v[3],0),500-h), w, h];
        S.vb = nv; sv.setAttribute('viewBox', nv.map(function(x){ return x.toFixed(2); }).join(' '));
        const rs = document.getElementById('act-reset'); if(rs) rs.classList.toggle('show', !!S.selected || nv[2] < 959);
      }
    });
    window.addEventListener('pointerup', function(){
      const S = window._act; if(!S) return; S.drag = null;
      const sv = document.getElementById('act-map'); if(sv) sv.classList.remove('drag');
      setTimeout(function(){ S.moved = false; }, 0);
    });
    window.addEventListener('keydown', function(e){ const S = window._act; if(e.key === 'Escape' && S && S.selected && document.getElementById('p13').classList.contains('active')) S.selectFn(null); });
  }
  A.selectFn = select;
  paint(); renderWorld();
}

async function loadSheetData() {
  const indicator = document.getElementById('sheet-indicator');
  if(indicator) indicator.textContent = '⟳ Syncing...';

  const [bmRows, digitalRows] = await Promise.all([
    fetchSheetFeed('Hub feed B&M', 'B&M'),
    fetchSheetFeed('Hub feed Digital', 'Digital'),
  ]);

  let added = 0;

  function mergeRows(rows, audience) {
    rows.forEach(row => {
      if(!row['Event that triggers the message send']) return;
      if((row['Live'] || '').trim().toLowerCase() !== 'yes') return;
      const t = sheetRowToTemplate(row, audience);
      if(!t.event || !t.channel) return;
      const intentKey = t.intent;
      let target = INTENTS.find(i => i.key === intentKey);
      if(!target) {
        target = { key: intentKey, label: intentKey.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()), icon: '', data: [] };
        INTENTS.push(target);
      }
      target.data.push(t);
      added++;
    });
  }

  mergeRows(bmRows, 'bm');
  mergeRows(digitalRows, 'digital');

  // Live title lookup for the Customer Journeys tab (rows are already Live='Yes'-only
  // thanks to the server-side filter in fetchSheetTab).
  window._liveTitleSet = new Set(
    [...bmRows, ...digitalRows].map(r => (r['Message template title'] || '').trim().toLowerCase())
  );

  if(indicator) indicator.textContent = added > 0 ? `${added} loaded` : 'Sheet in sync';

  libSync(bmRows);   // live events and billing units for every cost page and the Activation map
  LIB.tried = true;
  refreshLibraryStatus();

  populateP1CountryOptions();

  if(added > 0) {
    buildIntentBar();
    renderPage(activeTab);
  }

  jumpToSharedMessage();
}

