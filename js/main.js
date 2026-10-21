// Start up: first render and sheet load
/* ── INIT ── */
restoreFromURL();   // shows the view the address asks for
updateURLState('replace');   // turns an old link (?tab=p11) into the readable one and sets the page title
window.addEventListener('popstate', function(){ restoreFromURL(); updateURLState('replace'); });   // browser Back and Forward

// Load sheet data after initial render
refreshLibraryStatus();   // shows "Syncing" until the sheet answers
loadSheetData();
