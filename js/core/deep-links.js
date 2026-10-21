// URL state and deep links
/* ── URL DEEP LINKS ── */
function updateURLState(){
  const params = new URLSearchParams();
  if(activeBrand !== 'ria') params.set('brand', activeBrand);
  if(activeTab !== 'p0') params.set('tab', activeTab);
  if(activeIntent !== 'all') params.set('intent', activeIntent);
  if(activeAudience !== 'bm') params.set('aud', activeAudience);
  if(activeTab === 'p0' && window._flowState){
    if(window._flowState.event !== 'all') params.set('event', window._flowState.event);
    if(window._flowState.country !== 'all') params.set('country', window._flowState.country);
  }
  const qs = params.toString();
  const newUrl = window.location.pathname + (qs ? '?'+qs : '');
  history.replaceState(null, '', newUrl);
}

function applyURLState(){
  const params = new URLSearchParams(window.location.search);
  if(params.has('brand')) activeBrand = params.get('brand');
  if(params.has('tab')) activeTab = params.get('tab');
  if(params.has('intent')) activeIntent = params.get('intent');
  if(params.has('aud')) activeAudience = params.get('aud');
  if(params.has('event') || params.has('country')){
    window._flowState = window._flowState || {event:'all', country:'United States'};
    if(params.has('event')) window._flowState.event = params.get('event');
    if(params.has('country')) window._flowState.country = params.get('country');
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
  updateURLState();
}

function tag(text,cls){
  if(!text||!text.trim()||text==='nan') return '';
  return `<span class="tag t-${cls}">${text.trim()}</span>`;
}

function chCls(ch){ return CH_CLS[ch]||'sms'; }

function shortMsg(m){ return m.length>180?m.substring(0,177)+'…':m; }

