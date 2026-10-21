// Start up: first render and sheet load
/* ── INIT ── */
applyURLState();
if(!document.getElementById(activeTab)) activeTab = 'p0';
hubMode = TOOLS_PAGE_IDS.indexOf(activeTab) !== -1 ? 'tools' : (ACTIVATION_PAGE_IDS.indexOf(activeTab) !== -1 ? 'activation' : 'explore'); // deep link into a Tools or Activation page opens straight into that mode
document.body.classList.toggle('brand-xe', activeBrand === 'xe');
document.querySelectorAll('#hub-mode-toggle .brand-toggle-opt').forEach(function(b){ b.classList.toggle('active', b.dataset.mode===hubMode); });
const initialHubToggle = document.getElementById('hub-mode-toggle');
if(initialHubToggle) initialHubToggle.classList.toggle('tools-active', hubMode === 'tools');
if(initialHubToggle) initialHubToggle.classList.toggle('activation-active', hubMode === 'activation');
const initialAudSwitcherEl = document.getElementById('audience-switcher');
if(initialAudSwitcherEl) initialAudSwitcherEl.style.display = hubMode === 'explore' ? 'flex' : 'none';
document.querySelectorAll('#brand-toggle .brand-toggle-opt').forEach(function(b){ b.classList.toggle('active', b.dataset.brand===activeBrand); });
const initialBrandToggle = document.getElementById('brand-toggle');
if(initialBrandToggle) initialBrandToggle.classList.toggle('xe-active', activeBrand === 'xe');
document.querySelectorAll('.aud-toggle-opt').forEach(function(b){ b.classList.toggle('active', b.dataset.aud===activeAudience); });
const initialAudSwitcher = document.getElementById('audience-switcher');
if(initialAudSwitcher){
  initialAudSwitcher.classList.toggle('disabled', activeBrand === 'xe');
  initialAudSwitcher.classList.toggle('digital-active', activeAudience === 'digital');
}
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

// Load sheet data after initial render
refreshLibraryStatus();   // shows "Syncing" until the sheet answers
loadSheetData();
