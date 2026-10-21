// Intent bar, brand and audience switch, sidebar nav, tab switching
/* ── INTENT BAR ── */
function buildIntentBar(){
  const bar = document.getElementById('intent-bar');

  let html = `<div class="intent-pill ${activeIntent==='all'?'active':''}" onclick="setIntent('all',this)">All intents</div>`;
  INTENTS.forEach(intent=>{
    const total = intent.data.length;
    const live  = intent.data.filter(d=>d.live).length;
    const empty = total===0;
    html += `<div class="intent-pill ${activeIntent===intent.key?'active':''} ${empty?'empty':''}" onclick="setIntent('${intent.key}',this)" title="${empty?'No data yet':''}">
      ${intent.label}
    </div>`;
  });
  bar.innerHTML = html;
}

/* ── BRAND / STRUCTURAL AUDIENCE ── */
// Ria's nav differs by audience: B&M keeps everything that exists today, Digital
// is Explore-only for now (no cost data, no methodology content for Digital yet).
const NAV_CONFIG = {
  bm: [
    {section:'Explore', items:[
      {id:'p0', icon:'', label:'Message flow map'},
      {id:'p1', icon:'', label:'Messages Library', badge:'b1'},
      {id:'p2', icon:'', label:'Customer journeys'},
    ]},
    {section:'Opt-in', items:[
      {id:'p8', icon:'', label:'Opt-in rates'},
    ]},
  ],
  digital: [
    {section:'Explore', items:[
      {id:'p0', icon:'', label:'Message flow map'},
      {id:'p1', icon:'', label:'Messages Library', badge:'b1'},
      {id:'p2', icon:'', label:'Customer journeys'},
    ]},
    {section:'Opt-in', items:[
      {id:'p8', icon:'', label:'Opt-in rates'},
    ]},
  ],
};

// Costs. The calculators are not in the menu for now: a section with hidden:true is not shown, but its pages
// still belong to this mode and still open by link (for example ?page=iterable-migration).
const TOOLS_NAV = [
  {section:'Calculator', items:[
    {id:'p15', icon:'', label:'Cost calculator'},
  ]},
  {section:'Methodology', items:[
    {id:'p7', icon:'', label:'How we calculate this'},
  ]},
  {section:'Hidden pages', hidden:true, items:[
    {id:'p9',  icon:'', label:'Full Opt-in Impact'},
    {id:'p11', icon:'', label:'Iterable Migration'},
    {id:'p3',  icon:'', label:'SMS Costs'},
    {id:'p5',  icon:'', label:'Twilio SMS calculator'},
    {id:'p4',  icon:'', label:'Global deployment cost'},
    {id:'p6',  icon:'', label:'Global deployment Twilio'},
    {id:'p10', icon:'', label:'Opt-in cost impact (by journey)'},
  ]},
];
// Xe currently has live Iterable journey data only — no sheet-fed library of
// its own yet, so its nav shows what actually exists rather than empty pages.
const XE_NAV = [
  {section:'Explore', items:[
    {id:'p2', icon:'', label:'Customer journeys'},
  ]},
];
// Activation: what is actually live today and what we plan to turn on. Ria B&M only, FX Client only for now.
const ACTIVATION_NAV = [
  {section:'Activation', items:[
    {id:'p13', icon:'', label:'SMS activation map'},
    {id:'p14', icon:'', label:'Activation roadmap'},
    {id:'p12', icon:'', label:'FX Client Activations'},
  ]},
];
// All page ids of a menu (hidden ones too) and the first page that is shown in the menu
function navPageIds(sections){ return sections.flatMap(function(s){ return s.items.map(function(i){ return i.id; }); }); }
function navFirstVisible(sections){
  const shown = sections.filter(function(s){ return !s.hidden; });
  return navPageIds(shown)[0] || navPageIds(sections)[0];
}
const TOOLS_PAGE_IDS = navPageIds(TOOLS_NAV);
const ACTIVATION_PAGE_IDS = navPageIds(ACTIVATION_NAV);
let hubMode = 'home'; // 'home', 'explore', 'tools' or 'activation' — derived from the deep-linked tab at init, see INIT block

function renderNavSections(sections){
  const nav = document.getElementById('sb-nav');
  let html = '';
  window._navOpen = window._navOpen || {};
  sections.forEach(function(sec){
    if(sec.hidden) return;   // not shown in the menu
    if(sec.collapsed){
      const hasActive = sec.items.some(function(i){ return i.id === activeTab; });
      const open = !!window._navOpen[sec.section] || hasActive;
      html += '<div class="sb-section"><div class="sb-section-label sb-collapsible" onclick="toggleNavGroup(this)" style="cursor:pointer;" data-group="'+sec.section+'">'
        + sec.section+' <span class="sb-caret">'+(open ? '\u25BE' : '\u25B8')+'</span></div>'
        + '<div class="sb-group-items'+(open ? ' open' : '')+'">';
    } else {
      html += '<div class="sb-section"><div class="sb-section-label">'+sec.section+'</div>';
    }
    sec.items.forEach(function(item){
      html += '<a class="nav-tab" data-tab="'+item.id+'" href="'+buildViewURL(item.id, true)+'" onclick="return navLinkClick(event,\''+item.id+'\',this)">'+item.label
        + (item.badge ? ' <span class="nbadge" id="'+item.badge+'"></span>' : '') + '</a>';
    });
    html += sec.collapsed ? '</div></div>' : '</div>';
  });
  nav.innerHTML = html;
  const validIds = navPageIds(sections);   // hidden pages stay valid, so their links keep working
  if(validIds.indexOf(activeTab) === -1){
    activeTab = navFirstVisible(sections) || 'p0';
  }
}

// A menu item is a real link, so "open in new tab" and "copy link" work. A normal click stays in the page.
function navLinkClick(e, id, el){
  if(e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button === 1) return true;
  e.preventDefault();
  switchTab(id, el);
  return false;
}

function toggleNavGroup(el){
  const items = el.nextElementSibling;
  const open = !items.classList.contains('open');
  items.classList.toggle('open', open);
  window._navOpen = window._navOpen || {};
  window._navOpen[el.dataset.group] = open;
  const caret = el.querySelector('.sb-caret'); if(caret) caret.textContent = open ? '\u25BE' : '\u25B8';
}

function renderSidebarNav(){
  const nav = document.getElementById('sb-nav');
  if(hubMode === 'home'){ nav.innerHTML = ''; return; }   // the Home page has no menu, its search and buttons lead to the pages
  // Tools are Ria-specific for now, so Xe shows the same "not built yet" note
  // in Tools mode as it does in Explore — check brand before mode.
  if(activeBrand === 'xe'){
    // Xe has live Iterable journey data (Digital/Production). The Flow Map and
    // Messages Library are sheet-fed and that sheet is Ria-only, so Xe shows
    // just what it actually has rather than empty pages.
    if(hubMode === 'tools' || hubMode === 'activation'){
      nav.innerHTML = '<div style="padding:16px 12px;font-size:12px;color:rgba(255,255,255,.45);line-height:1.5;">'+(hubMode === 'activation' ? 'The activation map is' : 'Cost modeling is')+' Ria B&amp;M only for now. Switch to Ria to use it.</div>';
      return;
    }
    renderNavSections(XE_NAV);
    return;
  }
  if(hubMode === 'tools'){
    renderNavSections(TOOLS_NAV);
    return;
  }
  if(hubMode === 'activation'){
    renderNavSections(ACTIVATION_NAV);
    return;
  }
  const sections = NAV_CONFIG[activeAudience] || NAV_CONFIG.bm;
  renderNavSections(sections);
}

// Shows the mode in the three-way switch and the audience switch
function setHubModeLook(){
  document.querySelectorAll('#hub-mode-toggle .brand-toggle-opt').forEach(function(b){ b.classList.toggle('active', b.dataset.mode === hubMode); });
  const t = document.getElementById('hub-mode-toggle');
  if(t){ t.classList.toggle('tools-active', hubMode === 'tools'); t.classList.toggle('activation-active', hubMode === 'activation'); t.classList.toggle('home-active', hubMode === 'home'); }
  const a = document.getElementById('audience-switcher'); if(a) a.style.display = hubMode === 'explore' ? 'flex' : 'none';
}

window.setHubMode = function(mode){
  if(hubMode === mode) return;
  hubMode = mode;
  document.querySelectorAll('#hub-mode-toggle .brand-toggle-opt').forEach(function(b){ b.classList.toggle('active', b.dataset.mode===mode); });
  const hubToggle = document.getElementById('hub-mode-toggle');
  if(hubToggle) hubToggle.classList.toggle('tools-active', mode === 'tools');
  if(hubToggle) hubToggle.classList.toggle('home-active', mode === 'home');
  if(hubToggle) hubToggle.classList.toggle('activation-active', mode === 'activation');

  // Audience (B&M/Digital) doesn't apply to Tools — hide it there. The Ria/Xe
  // switch DOES still apply in Tools mode: Tools are Ria-specific for now, so
  // switching to Xe there shows the same "not built yet" placeholder as Explore.
  const audToggle = document.getElementById('audience-switcher');
  if(audToggle) audToggle.style.display = mode === 'explore' ? 'flex' : 'none';

  renderSidebarNav();
  if(activeBrand === 'xe'){
    if(mode !== 'explore'){
      renderXeToolsNotice();
    } else {
      activeTab = 'p2';
      activateNavTabFor('p2');
      renderPage('p2');
    }
  } else {
    if(mode === 'explore' && navPageIds(NAV_CONFIG[activeAudience] || NAV_CONFIG.bm).indexOf(activeTab) === -1) activeTab = navFirstVisible(NAV_CONFIG[activeAudience] || NAV_CONFIG.bm);
    if(mode === 'tools' && TOOLS_PAGE_IDS.indexOf(activeTab) === -1) activeTab = navFirstVisible(TOOLS_NAV);
    if(mode === 'activation' && ACTIVATION_PAGE_IDS.indexOf(activeTab) === -1) activeTab = navFirstVisible(ACTIVATION_NAV);
    activateNavTabFor(activeTab);
    renderPage(activeTab);
  }
  updateURLState('push');
};

function setStructuralAudience(aud){
  if(activeBrand !== 'ria') return;
  activeAudience = aud;
  document.querySelectorAll('.aud-toggle-opt').forEach(function(b){ b.classList.toggle('active', b.dataset.aud===aud); });
  const audToggle = document.getElementById('audience-switcher');
  if(audToggle) audToggle.classList.toggle('digital-active', aud === 'digital');
  renderSidebarNav();
  // Country lists differ by audience (real countries for B&M vs Digital's two regions),
  // so reset the Flow Map default rather than carry over a filter that won't match anything.
  window._flowState = {event:'all', country: aud==='digital' ? 'Digital — Global' : 'United States'};
  activateNavTabFor(activeTab);
  renderPage(activeTab);
  updateURLState('push');
}

function setBrand(brand){
  activeBrand = brand;
  if(brand === 'xe' && hubMode === 'home'){ hubMode = 'explore'; setHubModeLook(); }   // Xe has no Home page
  document.body.classList.toggle('brand-xe', brand === 'xe');
  document.querySelectorAll('#brand-toggle .brand-toggle-opt').forEach(function(b){ b.classList.toggle('active', b.dataset.brand===brand); });
  const toggle = document.getElementById('brand-toggle');
  if(toggle) toggle.classList.toggle('xe-active', brand === 'xe');
  const audSwitcher = document.getElementById('audience-switcher');
  if(audSwitcher) audSwitcher.classList.toggle('disabled', brand === 'xe');
  updateAudienceLabels(brand);

  if(brand === 'ria'){
    activeAudience = document.querySelector('.aud-toggle-opt.active') ? document.querySelector('.aud-toggle-opt.active').dataset.aud : 'bm';
    renderSidebarNav();
    activateNavTabFor(activeTab);
    renderPage(activeTab);
  } else {
    renderSidebarNav();
    if(hubMode !== 'explore'){
      renderXeToolsNotice();
    } else {
      activeTab = 'p2';
      activateNavTabFor('p2');
      renderPage('p2');
    }
  }
  updateURLState('push');
}

function updateAudienceLabels(brand){
  const bmOpt = document.getElementById('aud-opt-bm');
  const digitalOpt = document.getElementById('aud-opt-digital');
  if(brand === 'xe'){
    if(bmOpt) bmOpt.textContent = 'Consumer';
    if(digitalOpt) digitalOpt.textContent = 'Corporate';
  } else {
    if(bmOpt) bmOpt.textContent = 'B&M';
    if(digitalOpt) digitalOpt.textContent = 'Digital';
  }
}

function renderXePlaceholder(){
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
  const intentBar = document.getElementById('intent-bar');
  if(intentBar) intentBar.style.display = 'none';
  let holder = document.getElementById('xe-placeholder');
  if(!holder){
    holder = document.createElement('div');
    holder.id = 'xe-placeholder';
    holder.className = 'page';
    document.querySelector('.main-content').appendChild(holder);
  }
  holder.classList.add('active');
  const actMode = hubMode === 'activation';
  holder.innerHTML = '<div class="page-head"><h1 class="page-title">Xe</h1></div>'
    + '<div style="max-width:480px;padding:60px 0;text-align:center;margin:0 auto;">'
    + '<div style="font-size:15px;font-weight:700;margin-bottom:8px;color:var(--text);">'+(actMode ? 'The activation map is Ria B&amp;M only' : 'Cost modeling is Ria B&amp;M only')+'</div>'
    + '<div style="font-size:13px;color:var(--muted);line-height:1.6;">'+(actMode ? 'The activation map shows the live FX Client SMS events for Ria B&amp;M.' : 'The cost calculators are built on Ria B&amp;M SMS data.')+' Xe\'s live customer journeys are available under Messaging.</div>'
    + '<button class="btn-primary" style="margin-top:20px;" onclick="setHubMode(\'explore\')">View Xe journeys</button>'
    + '</div>';
}
// Kept under the old name too, since several call sites referenced it.
function renderXeToolsNotice(){ renderXePlaceholder(); }

function setIntent(key, el){
  activeIntent = key;
  document.querySelectorAll('.intent-pill').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
  renderPage(activeTab);
  updateURLState('replace');
}

/* ── TAB SWITCHING ── */
function switchTab(id, el){
  activeTab = id;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  el.classList.add('active');
  // hide intent bar on tabs that don't need it
  const intentBar = document.getElementById('intent-bar');
  const audienceBar = document.getElementById('audience-bar');
  const showBars = ['p0','p1'].indexOf(id) !== -1;
  if(intentBar) intentBar.style.display = showBars ? 'flex' : 'none';
  if(audienceBar) audienceBar.style.display = showBars ? 'flex' : 'none';
  renderPage(id);
  updateURLState('push');
}

function renderPage(id){
  if(id==='p0') renderFlow();
  if(id==='p1') renderP1();
  if(id==='p2') renderJourneys();
  if(id==='p3') renderCalc();
  if(id==='p5') renderCalcTwilio();
  if(id==='p4') renderGlobalCost();
  if(id==='p6') renderGlobalCostTwilio();
  if(id==='p8') renderOptin();
  if(id==='p9') renderOptInImpact();
  if(id==='p10') renderOptInImpactByJourney();
  if(id==='p11') renderIterableMigration();
  if(id==='p12') renderFxScenario();
  if(id==='p13') renderActivation();
  if(id==='p14') renderActivationRoadmap();
  if(id==='p15') renderCostCalculator();
  if(id==='p16') renderHome();
}

