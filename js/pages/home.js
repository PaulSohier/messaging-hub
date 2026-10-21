// Page: Home (start page)
/* The start page. It shows four key numbers, a search box (pages, countries, messages) and buttons for the
   questions people ask. It adds no data of its own: the numbers come from the same model and files as the pages.
   Click "Messaging Hub" (top left) to come back here. */

const HOME_PAGES = {   // words people may type to find a page (the title is searched too)
  p0:'flow map country sends today events', p1:'library text translation language message', p2:'journeys iterable customer digital xe',
  p3:'older 2025 calculator', p5:'older 2025 calculator twilio', p4:'older 2025 global deployment', p6:'older 2025 global deployment twilio',
  p7:'methodology how calculate numbers data', p8:'opt-in optin rates customers accept', p9:'older 2025 full opt-in impact everyone',
  p10:'older 2025 opt-in impact journey', p11:'iterable migration profiles fee', p12:'fx client activations activate more cost',
  p13:'activation map live sms', p14:'activation roadmap weeks plan planned', p15:'cost calculator pay today twilio clickatell carrier opt-in'
};
const HOME_QUESTIONS = [
  {q:'What does a country send today?',        s:'Message flow map',                         id:'p0'},
  {q:'What is the text of a message?',         s:'Messages Library',                         id:'p1'},
  {q:'What do we pay for SMS today?',          s:'Cost calculator, "What we pay today"',     id:'p15', x:'preset=today'},
  {q:'What would Twilio cost instead?',        s:'Cost calculator, "Switch to Twilio"',      id:'p15', x:'preset=twilio'},
  {q:'What if more customers opt in?',         s:'Cost calculator, "If everyone opted in"',  id:'p15', x:'preset=optin'},
  {q:'What does activating more cost?',        s:'FX Client Activations',                    id:'p12'},
  {q:'What is live and what is planned?',      s:'SMS activation map',                       id:'p13'},
  {q:'How are the numbers calculated?',        s:'Methodology',                              id:'p7'}
];
const HOME_OLDER = ['p3','p5','p4','p6','p9','p10','p11'];

// Open a page by its link (so Back works), then show it
function openPage(id, extra){
  let url = buildViewURL(id, true);
  if(extra) url += (url.indexOf('?') === -1 ? '?' : '&') + extra;
  history.pushState(null, '', url);
  restoreFromURL();
  updateURLState('replace');
  window.scrollTo(0, 0);
}
function homeLinkClick(e, id, extra){
  if(e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button === 1) return true;
  e.preventDefault(); openPage(id, extra); return false;
}
// "Messaging Hub" at the top left
function goHome(e){
  if(e && (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button === 1)) return true;
  if(e) e.preventDefault();
  history.pushState(null, '', window.location.pathname);
  restoreFromURL();
  updateURLState('replace');
  window.scrollTo(0, 0);
  return false;
}
function homeEsc(t){ return String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function homeHref(id, extra){ return buildViewURL(id, true) + (extra ? (buildViewURL(id, true).indexOf('?') === -1 ? '?' : '&') + extra : ''); }

function renderHome(){
  const box = document.getElementById('p16-content'); if(!box) return;
  const kpi = function(id, title){
    return '<div class="home-kpi"><div class="t">'+title+'</div><div class="v" id="'+id+'">&hellip;</div><div class="n" id="'+id+'-n">&nbsp;</div></div>';
  };
  box.innerHTML = '<div class="home-wrap">'
    + '<div class="home-search"><span>&#128269;</span><input id="home-q" type="text" autocomplete="off" placeholder="Search a page, a country or a message, for example Spain, Transaction Paid, Twilio" oninput="homeSearch(this.value)" onkeydown="homeSearchKey(event)"></div>'
    + '<div id="home-results" class="home-results" style="display:none;"></div>'
    + '<div class="home-kpis">'
    + kpi('home-k-cost','SMS cost per year') + kpi('home-k-mk','Markets sending SMS') + kpi('home-k-optin','Service SMS opt-in') + kpi('home-k-next','Next activation')
    + '</div>'
    + '<div class="home-h">What do you want to know?</div><div class="home-qs">'
    + HOME_QUESTIONS.map(function(x){
        return '<a class="home-q" href="'+homeHref(x.id, x.x)+'" onclick="return homeLinkClick(event,\''+x.id+'\','+(x.x ? '\''+x.x+'\'' : 'null')+')"><div>'+homeEsc(x.q)+'<span>'+homeEsc(x.s)+'</span></div><i>&rsaquo;</i></a>';
      }).join('')
    + '</div>'
    + '<div class="home-older">Older 2025 calculators: '
    + HOME_OLDER.map(function(id){ return '<a href="'+homeHref(id)+'" onclick="return homeLinkClick(event,\''+id+'\',null)">'+homeEsc(PAGE_META[id].title)+'</a>'; }).join(' &middot; ')
    + '</div></div>';
  refreshHome();
}

// Fills the four numbers. Called again when the Messages Library has synced.
function refreshHome(){
  if(!document.getElementById('home-k-cost') || window._homeBusy) return;   // busy: building the model calls this again through the library sync
  window._homeBusy = true;
  try{ homeFill(); } finally { window._homeBusy = false; }
}
function homeFill(){
  const set = function(id, v, n){ const a = document.getElementById(id), b = document.getElementById(id+'-n'); if(a) a.textContent = v; if(b) b.textContent = n; };
  const money = function(n){ return '$'+Math.round(n).toLocaleString('en-US'); };
  try{
    if(!window._imData) renderIterableMigration();   // shared rate, order and live-event data
    const D = window._imData, tot = obsModelTotal(D).all;
    const live = Object.keys(D.ORDERS).filter(function(c){ return obsLiveIdx(D,c).length > 0; }).length;
    set('home-k-cost', money(tot), 'What is live today, 2026 model');
    set('home-k-mk', String(live), 'of '+Object.keys(D.ORDERS).length+' markets');
    fetch('data/clickatell-baseline.json').then(function(r){ return r.json(); }).then(function(B){
      const n = document.getElementById('home-k-cost-n');
      if(n && B && B.smsYearly) n.textContent = 'Model. Real invoices: '+money(B.smsYearly)+' ('+(B.usagePeriod||'last year')+')';
    }).catch(function(){});
  } catch(e){ set('home-k-cost', 'n/a', 'Could not read the model'); set('home-k-mk', 'n/a', ' '); }
  fetch('data/optin-daily.json').then(function(r){ return r.json(); }).then(function(d){
    const s = (d.snapshots || []).slice().sort(function(a,b){ return a.date.localeCompare(b.date); }).pop();
    if(s && s.global && s.global.svcSmsPct != null) set('home-k-optin', s.global.svcSmsPct.toFixed(1)+'%', 'Customers who accept service SMS, captured '+s.date);
    else set('home-k-optin', 'n/a', ' ');
  }).catch(function(){ set('home-k-optin', 'n/a', 'Could not load the opt-in data'); });
  fetch('data/activation-roadmap.json').then(function(r){ return r.json(); }).then(function(d){
    const today = new Date().toISOString().slice(0,10);
    const w = (d.weeks || []).filter(function(x){ return x.goLive >= today; })[0];
    if(w) set('home-k-next', w.label, w.date+', from the roadmap'); else set('home-k-next', 'None planned', 'No week left in the roadmap');
  }).catch(function(){ set('home-k-next', 'n/a', 'Could not load the roadmap'); });
}

/* ── Search: pages, countries, messages ── */
function homeIndex(){
  const items = [];
  Object.keys(PAGE_META).forEach(function(id){
    if(id === 'p16') return;
    items.push({kind:'Page', label:PAGE_META[id].title, hay:(PAGE_META[id].title+' '+(HOME_PAGES[id]||'')).toLowerCase(), go:function(){ openPage(id); }});
  });
  try{
    const all = getData().filter(function(d){ return d.live && d.r1; });
    Array.from(new Set(all.filter(function(d){ return !d.r1.includes('Digital') && !d.r1.includes('Wallet'); }).map(function(d){ return d.r1; }))).sort().forEach(function(c){
      items.push({kind:'Country', label:c, hay:c.toLowerCase()+' country sends today', go:function(){ openPage('p0', 'country='+encodeURIComponent(c)); }});
    });
    Array.from(new Set(all.map(function(d){ return d.event; }).filter(Boolean))).sort().forEach(function(ev){
      items.push({kind:'Message', label:ev, hay:ev.toLowerCase(), go:function(){
        openPage('p1');
        const el = document.getElementById('p1-search'); if(el) el.value = ev;
        setSearch(ev);
      }});
    });
  } catch(e){}
  return items;
}
function homeMatches(q){
  const words = String(q||'').toLowerCase().split(/\s+/).filter(Boolean);
  if(!words.length) return [];
  const order = {Page:0, Country:1, Message:2};
  return homeIndex().filter(function(it){ return words.every(function(w){ return it.hay.indexOf(w) !== -1; }); })
    .sort(function(a,b){ return (it(a) - it(b)) || a.label.localeCompare(b.label); }).slice(0, 8);
  function it(x){ return order[x.kind]; }
}
function homeSearch(q){
  const box = document.getElementById('home-results'); if(!box) return;
  const m = homeMatches(q);
  window._homeMatches = m;
  if(!String(q||'').trim()){ box.style.display = 'none'; box.innerHTML = ''; return; }
  box.style.display = 'block';
  box.innerHTML = m.length ? m.map(function(x,i){
    return '<div class="home-res" onclick="homePick('+i+')"><span class="k">'+x.kind+'</span>'+homeEsc(x.label)+'</div>';
  }).join('') : '<div class="home-res none">Nothing found. Try a country, a message name or a page name.</div>';
}
function homePick(i){ const x = (window._homeMatches || [])[i]; if(x) x.go(); }
function homeSearchKey(e){
  if(e.key === 'Enter'){ e.preventDefault(); homePick(0); }
  else if(e.key === 'Escape'){ e.target.value = ''; homeSearch(''); }
}
