// Start up: loads the JSON data files, then runs the script files in order.
// The data goes into window.HUB_DATA before any script runs, so the scripts can read it right away.
(function(){
  var self = document.currentScript;
  var q = (self && self.src.indexOf('?v=') > -1) ? '?v=' + self.src.split('?v=')[1] : '';

  // Data files: HUB_DATA.<key> is read from data/<file>.json
  var DATA = {
    shared: 'data/shared-rates.json',
    observedRates: 'data/observed-2026-rates.json',
    journeys: 'data/bm-journeys.json'
  };

  // Script files. The order matters: a file can use what the files above it define.
  var SCRIPTS = [
    'js/core/shared-data.js',
    'js/core/state.js',
    'js/core/placeholders.js',
    'js/core/helpers.js',
    'js/core/status-badge.js',
    'js/core/deep-links.js',
    'js/core/navigation.js',
    'js/pages/activation-roadmap.js',
    'js/pages/global-cost.js',
    'js/pages/journeys.js',
    'js/pages/library.js',
    'js/pages/sms-calculators.js',
    'js/core/sheet-sync.js',
    'js/pages/optin-impact.js',
    'js/core/observed-rates.js',
    'js/pages/iterable-migration.js',
    'js/pages/fx-activations.js',
    'js/pages/activation-map.js',
    'js/pages/optin-rates.js',
    'js/main.js'
  ];

  function fail(message){
    var box = document.createElement('div');
    box.style.cssText = 'margin:16px;padding:16px;border:1px solid #c00;color:#c00;font:14px sans-serif;background:#fff';
    box.textContent = 'The Hub could not start: ' + message + '. If you opened index.html as a local file, serve the folder instead, for example with: python -m http.server';
    document.body.insertBefore(box, document.body.firstChild);
  }

  var keys = Object.keys(DATA);
  Promise.all(keys.map(function(k){
    return fetch(DATA[k] + q).then(function(r){
      if(!r.ok) throw new Error(DATA[k] + ' (HTTP ' + r.status + ')');
      return r.json();
    });
  })).then(function(values){
    window.HUB_DATA = {};
    keys.forEach(function(k, i){ window.HUB_DATA[k] = values[i]; });
    // Added with async=false: the files download in parallel but run in this order.
    SCRIPTS.forEach(function(src){
      var s = document.createElement('script');
      s.async = false;
      s.src = src + q;
      s.onerror = function(){ fail('cannot load ' + src); };
      document.body.appendChild(s);
    });
  }).catch(function(e){ fail(e.message); });
})();
