// URL state and deep links
/* ── URL DEEP LINKS ──
   Every view has its own link, for example index.html?page=iterable-migration&brand=xe&aud=digital
   The code uses page ids (p0, p1...), the link uses a readable name (slug). Old links with ?tab=p11 still work.
   Moving to another page adds a history entry, so the browser Back and Forward buttons work.
   Filters (intent, flow map event and country) change the link without adding a history entry. */
const PAGE_META = {
  p0:  {slug:'flow-map',                 title:'Message flow map'},
  p1:  {slug:'messages-library',         title:'Messages Library'},
  p2:  {slug:'customer-journeys',        title:'Customer journeys'},
  p3:  {slug:'sms-costs',                title:'SMS Costs'},
  p5:  {slug:'twilio-sms-calculator',    title:'Twilio SMS calculator'},
  p4:  {slug:'global-deployment-cost',   title:'Global deployment cost'},
  p6:  {slug:'global-deployment-twilio', title:'Global deployment Twilio'},
  p7:  {slug:'methodology',              title:'How we calculate this'},
  p8:  {slug:'opt-in-rates',             title:'Opt-in rates'},
  p9:  {slug:'full-opt-in-impact',       title:'Full Opt-in Impact'},
  p10: {slug:'opt-in-by-journey',        title:'Opt-in cost impact (by journey)'},
  p11: {slug:'iterable-migration',       title:'Iterable Migration'},
  p12: {slug:'fx-client-activations',    title:'FX Client Activations'},
  p13: {slug:'activation-map',           title:'SMS activation map'},
  p14: {slug:'activation-roadmap',       title:'Activation roadmap'},
  p15: {slug:'cost-calculator',          title:'Cost calculator'}
};

// 'iterable-migration' or the old 'p11' gives 'p11'. Unknown names give null.
function pageIdFromLink(name){
  if(!name) return null;
  if(PAGE_META[name]) return name;
  const ids = Object.keys(PAGE_META);
  for(let i = 0; i < ids.length; i++){ if(PAGE_META[ids[i]].slug === name) return ids[i]; }
  return null;
}

// The link for a view. pageOnly = true leaves out the filters (used for the menu links).
function buildViewURL(tabId, pageOnly){
  const id = tabId || activeTab;
  const params = new URLSearchParams();
  if(id !== 'p0') params.set('page', PAGE_META[id] ? PAGE_META[id].slug : id);
  if(activeBrand !== 'ria') params.set('brand', activeBrand);
  if(activeAudience !== 'bm') params.set('aud', activeAudience);
  if(!pageOnly){
    if(activeIntent !== 'all') params.set('intent', activeIntent);
    if(id === 'p0' && window._flowState){
      if(window._flowState.event !== 'all') params.set('event', window._flowState.event);
      const defaultCountry = activeAudience === 'digital' ? 'Digital \u2014 Global' : 'United States';
      if(window._flowState.country !== defaultCountry) params.set('country', window._flowState.country);   // the default country stays out of the link
    }
    if(window._pendingMsg) params.set('msg', window._pendingMsg);   // a shared message link, kept until the message is shown
  }
  const qs = params.toString();
  return window.location.pathname + (qs ? '?'+qs : '');
}

// how = 'push' adds a history entry (moving to another page), anything else replaces the current one (filters)
function updateURLState(how){
  const url = buildViewURL();
  if(url !== window.location.pathname + window.location.search){
    history[how === 'push' ? 'pushState' : 'replaceState'](null, '', url);
  }
  const meta = PAGE_META[activeTab];
  document.title = (meta ? meta.title : 'Messaging Hub') + ' | Messaging Hub';
}

// Reads the address and sets the state. Anything missing in the link gets its default, so Back works too.
function applyURLState(){
  const params = new URLSearchParams(window.location.search);
  activeBrand = params.get('brand') === 'xe' ? 'xe' : 'ria';
  activeAudience = params.get('aud') === 'digital' ? 'digital' : 'bm';
  activeIntent = params.get('intent') || 'all';
  activeTab = pageIdFromLink(params.get('page') || params.get('tab')) || 'p0';
  window._pendingMsg = params.get('msg') || null;
  if(params.has('event') || params.has('country')){
    window._flowState = window._flowState || {event:'all', country:'United States'};
    window._flowState.event = params.get('event') || 'all';
    if(params.has('country')) window._flowState.country = params.get('country');
  } else if(window._flowState){
    window._flowState = {event:'all', country: activeAudience === 'digital' ? 'Digital \u2014 Global' : 'United States'};
  }
}

// Shows the view the address asks for. Used at start up and when Back or Forward is pressed.
function restoreFromURL(){
  applyURLState();
  if(!document.getElementById(activeTab)) activeTab = 'p0';
  hubMode = TOOLS_PAGE_IDS.indexOf(activeTab) !== -1 ? 'tools' : (ACTIVATION_PAGE_IDS.indexOf(activeTab) !== -1 ? 'activation' : 'explore'); // a link into a cost or activation page opens straight into that mode
  document.body.classList.toggle('brand-xe', activeBrand === 'xe');
  document.querySelectorAll('#hub-mode-toggle .brand-toggle-opt').forEach(function(b){ b.classList.toggle('active', b.dataset.mode === hubMode); });
  const hubToggle = document.getElementById('hub-mode-toggle');
  if(hubToggle){
    hubToggle.classList.toggle('tools-active', hubMode === 'tools');
    hubToggle.classList.toggle('activation-active', hubMode === 'activation');
  }
  const audSwitcher = document.getElementById('audience-switcher');
  if(audSwitcher){
    audSwitcher.style.display = hubMode === 'explore' ? 'flex' : 'none';
    audSwitcher.classList.toggle('disabled', activeBrand === 'xe');
    audSwitcher.classList.toggle('digital-active', activeAudience === 'digital');
  }
  document.querySelectorAll('#brand-toggle .brand-toggle-opt').forEach(function(b){ b.classList.toggle('active', b.dataset.brand === activeBrand); });
  const brandToggle = document.getElementById('brand-toggle');
  if(brandToggle) brandToggle.classList.toggle('xe-active', activeBrand === 'xe');
  document.querySelectorAll('.aud-toggle-opt').forEach(function(b){ b.classList.toggle('active', b.dataset.aud === activeAudience); });
  updateAudienceLabels(activeBrand);
  renderSidebarNav();
  buildIntentBar();
  if(activeBrand === 'xe'){
    if(hubMode !== 'explore'){
      renderXeToolsNotice();
    } else {
      activeTab = 'p2';
      activateNavTabFor('p2');
      renderPage('p2');
    }
  } else {
    activateNavTabFor(activeTab);
    renderPage(activeTab);
  }
}

function activateNavTabFor(id){
  document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
  const match = document.querySelector('.nav-tab[data-tab="'+id+'"]');
  if(match) match.classList.add('active');
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const page = document.getElementById(id);
  if(page) page.classList.add('active');
  const intentBar = document.getElementById('intent-bar');
  const audienceBar = document.getElementById('audience-bar');
  const showBars = ['p0','p1'].indexOf(id) !== -1;
  if(intentBar) intentBar.style.display = showBars ? 'flex' : 'none';
  if(audienceBar) audienceBar.style.display = showBars ? 'flex' : 'none';
}

function setFlowFilter(key, val){
  window._flowState[key] = val;
  renderFlow();
  updateURLState('replace');
}

function tag(text,cls){
  if(!text||!text.trim()||text==='nan') return '';
  return `<span class="tag t-${cls}">${text.trim()}</span>`;
}

function chCls(ch){ return CH_CLS[ch]||'sms'; }

function shortMsg(m){ return m.length>180?m.substring(0,177)+'…':m; }

