// Page: Customer journeys (Iterable)
/* ── DIGITAL JOURNEYS (Iterable-sourced) ── */
// Rendered once per data load; toggling categories/journeys/campaigns after that
// only flips CSS classes on already-existing elements (never re-renders the
// whole tree), so max-height transitions can actually animate smoothly.
let _iterCatState = {};   // categoryName -> bool (open/closed)
let _iterJourneyState = {}; // journeyId -> bool (open/closed)
let _iterExpanded = {};   // journeyId -> campaignId currently expanded inline, or null
let iterSearchQuery = '';

function setIterSearch(val){
  iterSearchQuery = (val||'').trim();
  const clearBtn = document.getElementById('p2-search-clear');
  if(clearBtn) clearBtn.style.display = iterSearchQuery ? 'inline-block' : 'none';
  renderIterableJourneys();
}
function clearIterSearch(){
  iterSearchQuery = '';
  const input = document.getElementById('p2-search');
  if(input) input.value = '';
  const clearBtn = document.getElementById('p2-search-clear');
  if(clearBtn) clearBtn.style.display = 'none';
  renderIterableJourneys();
}
function highlightQ(text, query){
  if(!query) return esc(text);
  const q = query.toLowerCase();
  const src = text || '';
  const lower = src.toLowerCase();
  const idx = lower.indexOf(q);
  if(idx === -1) return esc(text);
  return esc(src.substring(0, idx)) + '<mark>' + esc(src.substring(idx, idx+q.length)) + '</mark>' + esc(src.substring(idx+q.length));
}
function iterMatches(text, query){
  return (text||'').toLowerCase().indexOf(query.toLowerCase()) !== -1;
}

async function renderIterableJourneys(){
  const container = document.getElementById('p2-content');
  const badge = document.getElementById('p2-iter-badge');
  const searchRow = document.getElementById('p2-search-row');
  const pageNote = document.getElementById('p2-page-note');
  container.innerHTML = '<div style="padding:60px;text-align:center;color:var(--muted);font-size:13px;">Loading journeys…</div>';

  let data;
  try {
    const dataFile = activeBrand === 'xe'
      ? 'data/iterable-journeys-xe-prod.json'
      : 'data/iterable-journeys-ria-prod.json';
    const res = await fetch(dataFile);
    if(!res.ok) throw new Error('fetch failed: '+res.status);
    data = await res.json();
  } catch(e) {
    if(badge) badge.style.display = 'none';
    if(searchRow) searchRow.style.display = 'none';
    if(pageNote) pageNote.textContent = 'What messages a customer receives — happy and unhappy paths';
    container.innerHTML = '<div class="empty-intent"><div class="empty-intent-title">Could not load Iterable journey data</div>'
      + '<div class="empty-intent-sub">Expected data/iterable-journeys-'+(activeBrand==='xe'?'xe':'ria')+'-prod.json on this branch.</div></div>';
    return;
  }

  if(badge) badge.style.display = 'inline-block';
  if(searchRow) searchRow.style.display = 'flex';
  if(pageNote){
    if(data.pulledAt){
      const d = new Date(data.pulledAt);
      pageNote.textContent = 'Data last pulled: ' + d.toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'}) + ' at ' + d.toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'});
    } else {
      pageNote.textContent = 'Data last pulled: unknown';
    }
  }
  window._iterableJourneyData = data;
  const journeys = data.journeys || [];
  if(!journeys.length){
    container.innerHTML = '<div class="empty-intent"><div class="empty-intent-title">No journeys yet</div>'
      + '<div class="empty-intent-sub">Run the Iterable pull workflow to populate this.</div></div>';
    return;
  }

  const q = iterSearchQuery;
  const filteredJourneys = journeys.filter(function(j){
    if(!q) return true;
    if(iterMatches(j.name, q)) return true;
    return (j.campaigns||[]).some(function(c){ return iterMatches(c.name, q); });
  });

  const countEl = document.getElementById('p2-search-count');
  if(countEl) countEl.textContent = q ? (filteredJourneys.length + ' journey' + (filteredJourneys.length!==1?'s':'') + ' match') : '';

  if(q && !filteredJourneys.length){
    container.innerHTML = '<div class="empty-intent"><div class="empty-intent-title">No journey matches &ldquo;'+esc(q)+'&rdquo;</div></div>';
    return;
  }

  const byCategory = {};
  filteredJourneys.forEach(function(j){
    const cat = j.category || 'Uncategorized';
    (byCategory[cat] = byCategory[cat] || []).push(j);
  });

  let html = '<div style="width:100%;">';
  Object.keys(byCategory).sort().forEach(function(cat){
    const isOpen = q ? true : (_iterCatState[cat] !== false); // search results always expanded
    html += '<div class="iter-category">';
    html += '<div class="iter-category-hdr" onclick="toggleIterCategory(\''+cat.replace(/'/g,"\\'")+'\')">'
      + '<span>'+esc(cat)+'</span><span class="iter-category-line"></span>'
      + '<span class="iter-chevron" data-cat-chev="'+esc(cat)+'">'+(isOpen?'&#9662;':'&#9656;')+'</span>'
      + '</div>';
    html += '<div class="iter-category-body'+(isOpen?' open':'')+'" data-cat="'+esc(cat)+'">';
    html += '<div class="iter-journey-grid">';

    byCategory[cat].forEach(function(j){
      const jOpen = q ? true : !!_iterJourneyState[j.id]; // search results always expanded
      const byChannel = {};
      (j.campaigns||[]).forEach(function(c){ (byChannel[c.channel] = byChannel[c.channel] || []).push(c); });
      const chSummary = Object.keys(byChannel).map(function(ch){
        const n = byChannel[ch].length;
        return n+' '+ch;
      }).join(' · ');

      html += '<div class="iter-journey-tile">';
      html += '<div class="iter-journey-hdr" onclick="toggleIterJourney('+j.id+')">';
      html += '<div><div style="display:flex;align-items:center;gap:8px;"><span style="font-size:14px;font-weight:700;color:var(--text);">'+highlightQ(j.name, q)+'</span>'+journeyStatusBadge(j)
        + '<a href="https://app.iterable.com/workflows/'+j.id+'/edit?workflowType=Published&mode=beta" target="_blank" rel="noopener" onclick="event.stopPropagation()" class="iter-open-btn">Open in Iterable &#8594;</a></div>'
        + '<div style="font-size:11px;color:var(--muted);margin-top:3px;">Triggered by: '+esc((j.triggerEventNames||[]).join(', '))+'</div>'
        + '<div style="font-size:11px;color:var(--muted);margin-top:2px;">'+esc(chSummary)+'</div></div>';
      html += '<span class="iter-chevron" id="iter-j-chev-'+j.id+'">'+(jOpen?'&#9662;':'&#9656;')+'</span>';
      html += '</div>';

      html += '<div class="iter-thumbs-row'+(jOpen?' open':'')+'" id="iter-thumbs-'+j.id+'">';
      (j.campaigns||[]).forEach(function(c){
        const isExpanded = _iterExpanded[j.id] === c.id;
        const campMatches = q && iterMatches(c.name, q);
        html += '<div class="iter-thumb'+(isExpanded?' iter-thumb-active':'')+(campMatches?' iter-thumb-match':'')+'" data-journey="'+j.id+'" data-camp="'+c.id+'" onclick="toggleIterableCampaign('+c.id+','+j.id+')" title="'+esc(c.name)+'">'
          + campaignStatusBadge(c.campaignState)
          + '<div class="iter-thumb-inner" id="iter-thumb-'+c.id+'"></div>'
          + '<div class="iter-thumb-label">'+highlightQ(c.name, q)+'</div>'
          + '</div>';
      });
      html += '</div>'; // thumbs-row

      const expandedCamp = (j.campaigns||[]).find(function(c){ return c.id === _iterExpanded[j.id]; });
      html += '<div class="iter-expanded-panel'+(expandedCamp?' open':'')+'" id="iter-expand-panel-'+j.id+'">';
      if(expandedCamp){
        html += '<div class="iter-expanded-hdr"><span>'+esc(expandedCamp.name)+'</span>'
          + '<button onclick="toggleIterableCampaign('+expandedCamp.id+','+j.id+')" class="iter-expand-close">Collapse</button></div>'
          + '<div class="iter-expanded-body" id="iter-expand-body-'+j.id+'"></div>';
      }
      html += '</div>'; // expanded-panel

      html += '</div>'; // journey-tile
    });

    html += '</div>'; // journey-grid
    html += '</div>'; // category-body
    html += '</div>'; // category
  });
  html += '</div>';
  container.innerHTML = html;

  filteredJourneys.forEach(function(j){
    const isOpenNow = q ? true : !!_iterJourneyState[j.id];
    if(!isOpenNow) return;
    (j.campaigns||[]).forEach(function(c){ mountThumbnail(c); });
    const row = document.getElementById('iter-thumbs-'+j.id);
    if(row) row.dataset.mounted = '1';
    if(_iterExpanded[j.id]){
      const expandedCamp = (j.campaigns||[]).find(function(c){ return c.id === _iterExpanded[j.id]; });
      if(expandedCamp) mountExpandedInline(expandedCamp, j.id);
    }
  });
}

function toggleIterCategory(cat){
  const currentlyOpen = _iterCatState[cat] !== false;
  _iterCatState[cat] = !currentlyOpen;
  const body = document.querySelector('.iter-category-body[data-cat="'+CSS.escape(cat)+'"]');
  const chev = document.querySelector('.iter-chevron[data-cat-chev="'+CSS.escape(cat)+'"]');
  if(body) body.classList.toggle('open', !currentlyOpen);
  if(chev) chev.innerHTML = !currentlyOpen ? '&#9662;' : '&#9656;';
}

function toggleIterJourney(journeyId){
  const willOpen = !_iterJourneyState[journeyId];
  _iterJourneyState[journeyId] = willOpen;
  const row = document.getElementById('iter-thumbs-'+journeyId);
  const chev = document.getElementById('iter-j-chev-'+journeyId);
  if(row) row.classList.toggle('open', willOpen);
  if(chev) chev.innerHTML = willOpen ? '&#9662;' : '&#9656;';

  if(!willOpen){
    // Collapsing the journey should also close any campaign expanded inside it —
    // otherwise the expanded email/push stayed visible even after collapse.
    _iterExpanded[journeyId] = null;
    const panel = document.getElementById('iter-expand-panel-'+journeyId);
    if(panel){ panel.classList.remove('open'); panel.innerHTML = ''; }
    document.querySelectorAll('.iter-thumb[data-journey="'+journeyId+'"]').forEach(function(el){
      el.classList.remove('iter-thumb-active');
    });
  }

  if(willOpen && row && !row.dataset.mounted){
    const data = window._iterableJourneyData;
    let journey = null;
    (data.journeys||[]).forEach(function(j){ if(j.id===journeyId) journey = j; });
    if(journey){
      (journey.campaigns||[]).forEach(function(c){ mountThumbnail(c); });
      row.dataset.mounted = '1';
    }
  }
}

// Renders a small iOS-style push notification banner (title bold, body below),
// since push messages have no HTML/visual layout of their own — this mirrors
// how Iterable's own preview shows push content.
function journeyStatusBadge(journey){
  let label, bg, color;
  if(journey.isArchived){ label='Archived'; bg='#EFEFEC'; color='#6E7178'; }
  else if(journey.enabled){ label='Enabled'; bg='#E9F6EC'; color='#1E7A3C'; }
  else { label='Disabled'; bg='#FCEAEA'; color='#B23A3A'; }
  return '<span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:2px 8px;border-radius:20px;background:'+bg+';color:'+color+';">'+label+'</span>';
}

const CAMPAIGN_STATUS_COLORS = {
  Running:   {bg:'#E9F6EC', color:'#1E7A3C'},
  Recurring: {bg:'#E9F6EC', color:'#1E7A3C'},
  Draft:     {bg:'#FFF0E6', color:'#B25A0A'},
  Ready:     {bg:'#FFF0E6', color:'#B25A0A'},
  Scheduled: {bg:'#FFF0E6', color:'#B25A0A'},
  Starting:  {bg:'#FFF0E6', color:'#B25A0A'},
  Archived:  {bg:'#EFEFEC', color:'#6E7178'},
  Finished:  {bg:'#EFEFEC', color:'#6E7178'},
  Aborted:   {bg:'#FCEAEA', color:'#B23A3A'},
};
// Placeholder metrics for design/UX purposes only — no real Iterable metrics
// endpoint is wired up yet. Numbers are seeded per campaign so they at least
// stay stable across re-renders instead of jumping around randomly.
function seededRandom(seed){
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}
function mockMetricsHtml(campaignId, campaign){
  const m = (campaign && campaign.metrics) || null;
  if(m){
    // Real metrics from the Iterable pull. Rates are computed against
    // delivered where we have it, since that's the real denominator for
    // opens and clicks; anything Iterable returned as null stays blank
    // rather than being shown as a zero.
    const pct = function(num, den){
      if(num === null || num === undefined || !den) return null;
      return (num/den*100);
    };
    const openR  = pct(m.opens, m.delivered);
    const clickR = pct(m.clicks, m.delivered);
    const unsubR = pct(m.unsubscribes, m.delivered);
    function rstat(value, label){
      return '<div style="flex:1;text-align:center;padding:10px 6px;">'
        + '<div style="font-size:18px;font-weight:700;color:var(--text);">'+value+'</div>'
        + '<div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-top:2px;">'+label+'</div>'
        + '</div>';
    }
    const fmt = function(v){ return v === null ? '—' : v.toFixed(1)+'%'; };
    return '<div style="display:flex;border-bottom:1px solid var(--border);background:var(--bg);position:relative;">'
      + '<span style="position:absolute;top:4px;right:8px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--hint);">Live from Iterable</span>'
      + rstat((m.sent||0).toLocaleString('en-US'), 'Sent')
      + rstat((m.delivered||0).toLocaleString('en-US'), 'Delivered')
      + rstat(fmt(openR), 'Open rate')
      + rstat(fmt(clickR), 'Click rate')
      + rstat(fmt(unsubR), 'Unsubscribe rate')
      + '</div>';
  }
  const sent = Math.floor(500 + seededRandom(campaignId) * 15000);
  const openRate = Math.round(15 + seededRandom(campaignId + 1) * 45);
  const clickRate = Math.round(2 + seededRandom(campaignId + 2) * 18);
  const unsubRate = (seededRandom(campaignId + 3) * 1.2).toFixed(2);
  function stat(value, label){
    return '<div style="flex:1;text-align:center;padding:10px 6px;">'
      + '<div style="font-size:18px;font-weight:700;color:var(--text);">'+value+'</div>'
      + '<div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-top:2px;">'+label+'</div>'
      + '</div>';
  }
  return '<div style="display:flex;border-bottom:1px solid var(--border);background:var(--bg);position:relative;">'
    + '<span style="position:absolute;top:4px;right:8px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--hint);">Mock data — not connected to real metrics</span>'
    + stat(sent.toLocaleString(), 'Sent')
    + stat(openRate+'%', 'Open rate')
    + stat(clickRate+'%', 'Click rate')
    + stat(unsubRate+'%', 'Unsubscribe rate')
    + '</div>';
}

function campaignStatusBadge(state){
  if(!state) return '';
  const c = CAMPAIGN_STATUS_COLORS[state] || {bg:'#EFEFEC', color:'#6E7178'};
  return '<span style="position:absolute;top:3px;left:3px;font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:.02em;padding:1px 5px;border-radius:8px;background:'+c.bg+';color:'+c.color+';z-index:2;">'+esc(state)+'</span>';
}

function pushNotificationHtml(title, message){
  return '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#EDEDF2;padding:8px;">'
    + '<div style="width:100%;background:rgba(255,255,255,.92);backdrop-filter:blur(6px);border-radius:13px;padding:10px 12px;box-shadow:0 1px 3px rgba(0,0,0,.15);font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;">'
    + '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">'
    + '<div style="width:16px;height:16px;border-radius:4px;background:var(--purple);flex-shrink:0;"></div>'
    + '<span style="font-size:10px;font-weight:600;color:#6b6b70;text-transform:uppercase;letter-spacing:.02em;">Ria</span>'
    + '<span style="font-size:10px;color:#8a8a8e;margin-left:auto;">now</span>'
    + '</div>'
    + '<div style="font-size:13px;font-weight:700;color:#000;line-height:1.3;">'+esc(title||'')+'</div>'
    + '<div style="font-size:13px;color:#000;line-height:1.3;margin-top:1px;">'+esc(message||'')+'</div>'
    + '</div></div>';
}

function mountThumbnail(campaign){
  const el = document.getElementById('iter-thumb-'+campaign.id);
  if(!el || el.dataset.mounted) return;
  el.dataset.mounted = '1';
  const content = campaign.content || {};

  if(campaign.channel === 'Push'){
    if(!content.title && !content.message){
      el.innerHTML = '<div style="font-size:9px;color:var(--hint);padding:6px;text-align:center;">No preview</div>';
      return;
    }
    el.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden;">'
      + '<div style="width:300px;flex-shrink:0;transform:scale(0.32);transform-origin:center;">'+pushNotificationHtml(content.title, content.message)+'</div>'
      + '</div>';
    return;
  }

  const htmlContent = content.html;
  if(!htmlContent){
    el.innerHTML = '<div style="font-size:9px;color:var(--hint);padding:6px;text-align:center;">No preview</div>';
    return;
  }
  const iframe = document.createElement('iframe');
  iframe.setAttribute('sandbox', ''); // fully isolated — thumbnails don't need measurement
  iframe.style.cssText = 'width:375px;height:500px;border:none;transform:scale(0.256);transform-origin:top left;pointer-events:none;';
  iframe.srcdoc = htmlContent;
  el.appendChild(iframe);
}

function toggleIterableCampaign(campId, journeyId){
  const panel = document.getElementById('iter-expand-panel-'+journeyId);
  if(!panel) return;
  const wasExpanded = _iterExpanded[journeyId] === campId;
  _iterExpanded[journeyId] = wasExpanded ? null : campId;

  document.querySelectorAll('.iter-thumb[data-journey="'+journeyId+'"]').forEach(function(el){
    el.classList.toggle('iter-thumb-active', !wasExpanded && parseInt(el.dataset.camp,10)===campId);
  });

  if(wasExpanded){
    panel.classList.remove('open');
    return;
  }

  const data = window._iterableJourneyData;
  let target = null;
  (data.journeys||[]).forEach(function(j){ (j.campaigns||[]).forEach(function(c){ if(c.id===campId) target = c; }); });
  if(!target) return;

  panel.innerHTML = '<div class="iter-expanded-hdr"><span>'+esc(target.name)+'</span>'
    + '<button onclick="toggleIterableCampaign('+target.id+','+journeyId+')" class="iter-expand-close">Collapse</button></div>'
    + mockMetricsHtml(target.id, target)
    + '<div class="iter-expanded-body" id="iter-expand-body-'+journeyId+'"></div>';
  panel.classList.add('open');
  mountExpandedInline(target, journeyId);
}

function mountExpandedInline(campaign, journeyId){
  const body = document.getElementById('iter-expand-body-'+journeyId);
  if(!body) return;
  const content = campaign.content || {};

  if(campaign.channel === 'Push'){
    if(!content.title && !content.message){
      body.innerHTML = '<div style="padding:24px;color:var(--muted);font-size:13px;">No renderable content for this campaign.</div>';
      return;
    }
    body.style.width = '100%';
    body.style.height = 'auto';
    body.innerHTML = '<div style="width:340px;">'+pushNotificationHtml(content.title, content.message)+'</div>';
    return;
  }

  const htmlContent = content.html;
  if(!htmlContent){
    body.innerHTML = '<div style="padding:24px;color:var(--muted);font-size:13px;">No renderable content for this campaign.</div>';
    return;
  }
  const REF_WIDTH = 600;
  const iframe = document.createElement('iframe');
  // "allow-same-origin" (no "allow-scripts") lets this page measure the
  // rendered content's real height so it can be scaled cleanly in place —
  // the email's own scripts, if any, still never run.
  iframe.setAttribute('sandbox', 'allow-same-origin');
  iframe.setAttribute('scrolling', 'no');
  iframe.style.cssText = 'border:none;width:'+REF_WIDTH+'px;height:400px;transform-origin:top center;display:block;margin:0 auto;overflow:hidden;';
  iframe.srcdoc = htmlContent;

  let sized = false;
  function applySize(){
    if(sized) return;
    try{
      const doc = iframe.contentDocument;
      const naturalH = Math.max(doc.documentElement.scrollHeight, doc.body ? doc.body.scrollHeight : 0) || 600;
      if(!naturalH) return; // not actually loaded yet — let the next attempt handle it
      sized = true;
      iframe.style.height = naturalH + 'px';
      const availH = window.innerHeight * 0.7;
      const MIN_READABLE_SCALE = 0.55; // never shrink further than this — scroll instead
      // Prefer shrinking to fit entirely on screen (the nice, no-scroll case for
      // normal-length messages), but never go below a readable size — past that
      // point it's better to scroll than to squash the content illegibly small.
      // (Width is not a factor here — the panel is always comfortably wider
      // than REF_WIDTH by design, so height is the only real constraint.)
      const fitScale = Math.min(availH / naturalH, 1);
      const neededFlooring = fitScale < MIN_READABLE_SCALE;
      const scale = Math.max(fitScale, MIN_READABLE_SCALE);
      iframe.style.transform = 'scale('+scale+')';
      body.style.width = '100%';
      body.style.height = (naturalH*scale) + 'px';
      // Only show a scrollbar if the content genuinely didn't fit. Both axes
      // must be set together — mixing overflow-x:hidden with overflow-y:visible
      // makes browsers silently convert "visible" to "auto" per the CSS spec,
      // which was the actual cause of the scrollbar always appearing before.
      if(neededFlooring){ body.style.overflowY = 'auto'; body.style.overflowX = 'hidden'; }
      else { body.style.overflow = 'visible'; }
    } catch(err){
      sized = true;
      iframe.style.height = '600px';
      body.style.overflowY = 'auto';
    }
  }
  iframe.onload = applySize;
  // Fallback in case "load" doesn't fire reliably for this srcdoc iframe —
  // try again shortly after insertion regardless.
  setTimeout(applySize, 150);
  setTimeout(applySize, 500);
  setTimeout(applySize, 150);
  setTimeout(applySize, 500);
  body.appendChild(iframe);
}


function renderJourneys(){
  // Xe's only journey data is its live Iterable pull, so it always uses that
  // renderer regardless of audience. Ria uses it for Digital only; Ria B&M
  // falls through to the hardcoded journey map below.
  if(activeBrand === 'xe' || activeAudience === 'digital'){
    renderIterableJourneys();
    return;
  }
  const p2Badge = document.getElementById('p2-iter-badge');
  if(p2Badge) p2Badge.style.display = 'none';
  const p2SearchRow = document.getElementById('p2-search-row');
  if(p2SearchRow) p2SearchRow.style.display = 'none';
  const p2PageNote = document.getElementById('p2-page-note');
  if(p2PageNote) p2PageNote.textContent = 'What messages a customer receives — happy and unhappy paths';
  const JOURNEYS = HUB_DATA.journeys;

  // Only show messages that are marked Live in the sheet — matched by title,
  // same standard as Messages Library and Flow Map. Falls back to showing everything
  // if the sheet hasn't loaded yet (e.g. very first paint).
  if(window._liveTitleSet){
    JOURNEYS.forEach(function(j){
      j.steps.forEach(function(step){
        if(!step.messaging) return;
        Object.keys(step.messaging).forEach(function(ch){
          step.messaging[ch] = step.messaging[ch].filter(function(m){
            return window._liveTitleSet.has((m.title||'').trim().toLowerCase());
          });
          if(step.messaging[ch].length === 0) delete step.messaging[ch];
        });
      });
    });
  }

  // Country dropdown — B&M only. Each B&M SMS message already carries the single
  // country it applies to (m.r1); collect every country that shows up anywhere
  // in these journeys (before filtering, so the dropdown always lists all of them),
  // then — if a specific country is chosen — keep only messages for that country.
  // Digital messages (m.audience !== 'bm') are left untouched either way, since
  // this request was specifically about the B&M journeys.
  const p2CountrySet = {};
  JOURNEYS.forEach(function(j){
    if(j.audience !== 'bm') return;
    j.steps.forEach(function(step){
      if(!step.messaging) return;
      Object.keys(step.messaging).forEach(function(ch){
        step.messaging[ch].forEach(function(m){
          var c = (m.r1||'').trim();
          if(c) p2CountrySet[c] = true;
        });
      });
    });
  });
  const p2CountryOpts = Object.keys(p2CountrySet).sort();

  if(p2CountryFilter !== 'all'){
    JOURNEYS.forEach(function(j){
      j.steps.forEach(function(step){
        if(!step.messaging) return;
        Object.keys(step.messaging).forEach(function(ch){
          step.messaging[ch] = step.messaging[ch].filter(function(m){
            if(m.audience !== 'bm') return true; // country filter only scopes B&M
            return (m.r1||'').trim() === p2CountryFilter;
          });
          if(step.messaging[ch].length === 0){
            step._hadMsgBeforeCountryFilter = true; // had messaging before this country filter removed it
            delete step.messaging[ch];
          }
        });
      });
    });
  }

  const CH_COLOR = {SMS:'#0C447C',WhatsApp:'#085041',Email:'#633806',Push:'#6B21A8'};
  const CH_ICON  = {SMS:'',WhatsApp:'',Email:'',Push:''};
  const CH_BG    = {SMS:'#E6F1FB',WhatsApp:'#E1F5EE',Email:'#FAEEDA',Push:'#F3E8FF'};
  const CH_BORDER= {SMS:'#90CAF9',WhatsApp:'#A5D6A7',Email:'#FFCC80',Push:'#CE93D8'};

  // Close any open panel
  function closeAllPanels(){
    document.querySelectorAll('.jstep-active').forEach(function(el){el.classList.remove('jstep-active');});
    document.querySelectorAll('.jstep-panel').forEach(function(el){el.style.display='none';});
  }

  window.toggleJourneyStep = function(stepId){
    var panel = document.getElementById('panel-'+stepId);
    var btn   = document.getElementById('step-'+stepId);
    if(!panel) return;
    var isOpen = panel.style.display !== 'none';
    closeAllPanels();
    if(!isOpen){
      panel.style.display = 'block';
      if(btn) btn.classList.add('jstep-active');
    }
  };

  let html = '';
  if(activeAudience === 'bm'){
    html += '<div class="optin-toolbar" style="margin-bottom:20px;"><span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);">Country:</span>'
      + '<select id="p2-country-select" class="p1-filter-select" onchange="setP2CountryFilter(this.value)">'
      + '<option value="all"'+(p2CountryFilter==='all'?' selected':'')+'>All countries</option>'
      + p2CountryOpts.map(function(c){ return '<option value="'+esc(c)+'"'+(p2CountryFilter===c?' selected':'')+'>'+esc(c)+'</option>'; }).join('')
      + '</select>'
      + (p2CountryFilter!=='all' ? '<span style="font-size:11px;color:var(--muted);">Showing only steps with a message for '+esc(p2CountryFilter)+'</span>' : '')
      + '</div>';
  }
  html += '<div style="max-width:1600px;width:100%;">';

  JOURNEYS.forEach(function(journey){
    if(activeBrand === 'ria' && journey.audience !== activeAudience) return;
    var color  = journey.color;
    var bg     = journey.bg;

    html += '<div style="margin-bottom:36px;">';

    // Journey header
    html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">';
    html += '<div>';
    html += '<div style="font-size:15px;font-weight:700;color:' + color + ';">' + journey.title + '</div>';
    html += '<div style="font-size:11px;color:var(--muted);margin-top:1px;">' + journey.subtitle + '</div>';
    html += '</div>';
    html += '</div>';

    // Steps row
    html += '<div style="display:flex;align-items:flex-start;flex-wrap:wrap;gap:0;">';

    journey.steps.forEach(function(step, idx){
      var isLast  = idx === journey.steps.length - 1;
      var isStart = step.type === 'start';
      var isEnd   = step.type === 'end';
      var hasMsg  = step.messaging && Object.keys(step.messaging).length > 0;
      var stepId  = journey.id + '_' + idx;

      // Step + connector wrapper
      html += '<div style="display:flex;align-items:flex-start;">';

      // Step node
      var clickable = hasMsg;
      var nodeStyle = 'display:flex;flex-direction:column;align-items:center;width:130px;cursor:' + (clickable?'pointer':'default') + ';';
      html += '<div id="step-' + stepId + '" class="jstep-node" style="' + nodeStyle + '"' + (clickable ? ' onclick="toggleJourneyStep(\'' + stepId + '\')"' : '') + '>';

      // Circle
      var circleColor = (isStart || isEnd) ? color : (hasMsg ? color : 'var(--border-mid)');
      var circleBg    = (isStart || isEnd) ? bg     : (hasMsg ? bg    : 'var(--card)');
      html += '<div style="width:40px;height:40px;border-radius:50%;border:2.5px solid ' + circleColor + ';background:' + circleBg + ';display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:' + circleColor + ';transition:all .15s;">';
      if(isStart)    html += '<span style="font-size:11px;"></span>';
      else if(isEnd) html += '<span style="font-size:11px;"></span>';
      else           html += (idx + '');
      html += '</div>';

      // Label
      html += '<div style="text-align:center;margin-top:8px;padding:0 4px;">';
      html += '<div style="font-size:11px;font-weight:' + (hasMsg||isStart||isEnd?'600':'400') + ';color:' + (hasMsg||isStart||isEnd?'var(--text)':'var(--muted)') + ';line-height:1.35;">' + step.label + '</div>';

      // Channel pills (compact)
      if(hasMsg){
        html += '<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:2px;margin-top:5px;">';
        Object.keys(step.messaging).forEach(function(ch){
          var count = step.messaging[ch].length;
          html += '<span style="background:' + CH_BG[ch] + ';color:' + CH_COLOR[ch] + ';padding:1px 5px;border-radius:3px;font-size:9px;font-weight:700;">' + ch + '</span>';
        });
        html += '</div>';
        html += '<div style="font-size:9px;color:' + color + ';margin-top:3px;font-weight:600;">click to view →</div>';
      } else if(!isStart && !isEnd) {
        var noMsgLabel = (p2CountryFilter!=='all' && step._hadMsgBeforeCountryFilter) ? ('no message for '+esc(p2CountryFilter)) : 'no message';
        html += '<div style="margin-top:5px;font-size:9px;color:var(--hint);border:1px dashed var(--border-mid);padding:1px 5px;border-radius:3px;display:inline-block;">'+noMsgLabel+'</div>';
      }

      html += '</div>'; // label
      html += '</div>'; // step node

      // Connector arrow
      if(!isLast){
        html += '<div style="display:flex;align-items:center;margin-top:18px;flex-shrink:0;">';
        html += '<div style="width:20px;height:2px;background:' + color + '44;"></div>';
        html += '<div style="border-top:5px solid transparent;border-bottom:5px solid transparent;border-left:7px solid ' + color + '44;"></div>';
        html += '</div>';
      }

      html += '</div>'; // step + connector
    });

    html += '</div>'; // steps row

    // Message panels (one per step, hidden by default)
    journey.steps.forEach(function(step, idx){
      var stepId = journey.id + '_' + idx;
      var hasMsg = step.messaging && Object.keys(step.messaging).length > 0;
      if(!hasMsg) return;

      html += '<div id="panel-' + stepId + '" class="jstep-panel" style="display:none;margin-top:12px;border:1px solid ' + color + '44;border-radius:8px;overflow:hidden;">';
      html += '<div style="background:' + bg + ';padding:10px 16px;border-bottom:1px solid ' + color + '33;display:flex;justify-content:space-between;align-items:center;">';
      html += '<div style="font-size:12px;font-weight:700;color:' + color + ';">' + step.label + ' — messages</div>';
      html += '<button onclick="toggleJourneyStep(\'' + stepId + '\')" style="background:none;border:none;cursor:pointer;font-size:16px;color:' + color + ';padding:0 4px;">&times;</button>';
      html += '</div>';

      // Columns per channel
      html += '<div style="display:flex;gap:0;flex-wrap:wrap;background:var(--card);">';
      var journeyAudience = journey.audience;
      Object.keys(step.messaging).forEach(function(ch){
        if(journeyAudience === 'bm' && ch !== 'SMS') return;
        var messages = step.messaging[ch];
        html += '<div style="flex:1;min-width:200px;border-right:1px solid var(--border);padding:12px 14px;">';
        html += '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:' + CH_COLOR[ch] + ';margin-bottom:10px;">' + ch + '</div>';
        messages.forEach(function(m){
          var rawMsg = (m.msg||'');
          var isLong = rawMsg.length > 120;
          var msgShort = isLong ? rawMsg.substring(0,120)+'…' : rawMsg;
          // Tags — exact same as renderP1
          var tagsHtml = '';
          tagsHtml += smsOversizeTag(m.channel, rawMsg);
          if(m.r1)                              tagsHtml += '<span class="tag t-region">'  + esc(m.r1)     + '</span>';
          if(m.entry  && m.entry  !== 'nan')    tagsHtml += '<span class="tag t-entry">'   + esc(m.entry)  + '</span>';
          if(m.sendTo && m.sendTo !== 'nan')    tagsHtml += '<span class="tag t-sendto">'  + esc(m.sendTo) + '</span>';
          if(m.agent  && m.agent  !== 'nan')    tagsHtml += '<span class="tag t-agent">'   + esc(m.agent)  + '</span>';
          html += '<div class="msg-item live-card" onclick="toggleMsg(this)" style="margin-bottom:8px;">';
          html += '<div class="msg-status"><span class="dot-live"></span><span style="color:var(--live);font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">Live</span>';
          if(m.audience==='digital') html += '<span class="audience-badge audience-digital" style="margin-left:8px;">Digital</span>';
          html += '</div>';
          html += '<div class="msg-title">' + esc(m.title||m.msg.substring(0,60)) + '</div>';
          if(tagsHtml) html += '<div class="msg-tags" style="margin-bottom:6px;">' + tagsHtml + '</div>';
          if(rawMsg){
            html += '<div class="msg-preview-text">&ldquo;' + esc(msgShort) + '&rdquo;</div>';
            html += '<div class="msg-full">&ldquo;' + esc(rawMsg) + '&rdquo;</div>';
            if(isLong) html += '<div class="msg-expand-hint">&#9662; click to read full message</div>';
          }
          html += '</div>';
        });
        html += '</div>';
      });
      html += '</div>'; // channel columns
      html += '</div>'; // panel
    });

    // Divider
    html += '<div style="height:1px;background:var(--border);margin-top:24px;"></div>';
    html += '</div>'; // journey
  });

  html += '</div>';
  document.getElementById('p2-content').innerHTML = html;
}


function renderFlow(){
  const container = document.getElementById('p0-content');

  const allData = getData().filter(d=>d.live&&d.r1);
  const events   = [...new Set(allData.map(d=>d.event))].sort();
  const countries = [...new Set(
    allData.filter(d=>d.r1&&!d.r1.includes('Digital')&&!d.r1.includes('Wallet')).map(d=>d.r1)
  )].sort();

  if(!window._flowState) window._flowState = {event:'all', country:'United States'};
  if(window._flowState.event !== 'all' && !events.includes(window._flowState.event)){
    window._flowState.event = 'all';
  }

  // ── Controls ─────────────────────────────────────────────────────────────
  let ctrlHtml = '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap;">';

  // Event dropdown
  ctrlHtml += '<div style="display:flex;align-items:center;gap:6px;">'
    + '<span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);">Event</span>'
    + '<select id="flow-event-sel" onchange="setFlowFilter(\'event\',this.value)" style="padding:6px 10px;border-radius:7px;border:1px solid var(--border-mid);background:var(--card);font-size:12px;color:var(--text);cursor:pointer;max-width:280px;">'
    + '<option value="all">All events</option>';
  events.forEach(function(ev){
    ctrlHtml += '<option value="'+ev.replace(/"/g,'&quot;')+'"'+(window._flowState.event===ev?' selected':'')+'>'+ev+'</option>';
  });
  ctrlHtml += '</select></div>';

  // Country dropdown
  ctrlHtml += '<div style="display:flex;align-items:center;gap:6px;">'
    + '<span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);">Country</span>'
    + '<select id="flow-country-sel" onchange="setFlowFilter(\'country\',this.value)" style="padding:6px 10px;border-radius:7px;border:1px solid var(--border-mid);background:var(--card);font-size:12px;color:var(--text);cursor:pointer;">'
    + '<option value="all">All countries</option>';
  countries.forEach(function(c){
    ctrlHtml += '<option value="'+c+'"'+(window._flowState.country===c?' selected':'')+'>'+c+'</option>';
  });
  ctrlHtml += '</select></div>';

  ctrlHtml += '</div>';

  // ── Filter data ───────────────────────────────────────────────────────────
  var filteredData = allData.filter(function(d){
    if(window._flowState.event !== 'all' && d.event !== window._flowState.event) return false;
    if(window._flowState.country !== 'all' && d.r1 !== window._flowState.country) return false;
    return true;
  });

  if(filteredData.length === 0){
    container.innerHTML = ctrlHtml
      + '<div class="empty-intent">'
      + '<div class="empty-intent-title">No routes found</div>'
      + '<div class="empty-intent-sub">No live messages match this combination.</div></div>';
    var es=document.getElementById('flow-event-sel'); if(es) es.value=window._flowState.event;
    var cs=document.getElementById('flow-country-sel'); if(cs) cs.value=window._flowState.country;
    return;
  }

  // ── Build map ─────────────────────────────────────────────────────────────
  const evNodes={}, regNodes={}, chNodes={};
  const mapEvents  = [...new Set(filteredData.map(d=>d.event))];
  const regions    = [...new Set(filteredData.map(d=>d.r1).filter(Boolean))].sort();
  const channels   = ['SMS','WhatsApp','Email','Push'].filter(ch=>filteredData.some(d=>d.channel===ch));

  // Columns are now sized via CSS flex-basis (see .flow-col-N / .flow-spacer) so the
  // diagram fills the available width instead of sitting pinned at a fixed pixel size.
  const COL_CLASSES = ['flow-col-0','flow-spacer','flow-col-2','flow-spacer','flow-col-4','flow-spacer','flow-col-6','flow-spacer','flow-col-8'];
  const COL_N = ['Message library','','Event','','Country','','Channel','','Who gets it'];
  const ROW_G = 9;
  const labelsHTML = COL_N.map((n,i)=>'<div class="flow-col-lbl '+COL_CLASSES[i]+'">'+n+'</div>').join('');

  const wrap = document.createElement('div');
  const isFullView = window._flowState.event==='all' && window._flowState.country==='all';
  wrap.innerHTML = ctrlHtml
    + '<div class="flow-notice">Showing <strong>'+filteredData.length+' live route'+(filteredData.length!==1?'s':'')+'</strong>'
    + (window._flowState.event!=='all'?' for <strong>'+window._flowState.event+'</strong>':'')
    + (window._flowState.country!=='all'?' in <strong>'+window._flowState.country+'</strong>':'')
    + '. Blue = SMS · Green = WhatsApp · Amber = Email · Purple = Push'
    + (isFullView ? ' · <span style="color:var(--muted);">Showing all '+allData.length.toLocaleString('en-US')+' routes at once — rendered progressively as you scroll. Pick a country or event above to narrow it down.</span>' : '')
    + '</div>'
    + '<div class="flow-outer"><div class="flow-col-labels">'+labelsHTML+'</div>'
    + '<div class="flow-canvas" id="fcanvas"><svg class="flow-svg" id="fsvg" width="100%" height="4"></svg>'
    + '<div class="flow-cols" id="fcols"></div></div></div>';

  container.innerHTML = '';
  container.appendChild(wrap);

  var es=wrap.querySelector('#flow-event-sel');   if(es) es.value=window._flowState.event;
  var cs=wrap.querySelector('#flow-country-sel'); if(cs) cs.value=window._flowState.country;

  const fcols = wrap.querySelector('#fcols');
  function col(cls,pt){var d=document.createElement('div');d.className='flow-col '+cls;if(pt)d.style.paddingTop=pt+'px';return d;}
  function spacer(){var d=document.createElement('div');d.className='flow-spacer';fcols.appendChild(d);}
  function node(t,cls){var d=document.createElement('div');d.className='fnode '+cls;d.textContent=t;return d;}
  function ep(label,agent,ch){
    var d=document.createElement('div');d.className='fep fep-'+chCls(ch);
    d.textContent=label;
    if(agent&&agent!=='nan'){var s=document.createElement('div');s.className='fep-sub';s.textContent=agent;d.appendChild(s);}
    return d;
  }

  // Col 0 — library box
  const c0=col('flow-col-0'); c0.style.justifyContent='center'; c0.style.minHeight='200px';
  const lb=document.createElement('div'); lb.className='lib-box';
  lb.innerHTML='<div class="lib-box-title">Message library</div><div class="lib-box-sub">'+filteredData.length+' live routes</div>';
  c0.appendChild(lb); fcols.appendChild(c0); spacer();

  // Col 1 — events
  const c2=col('flow-col-2',8); c2.style.gap=ROW_G+'px';
  mapEvents.forEach(function(ev){var n=node(ev.length>32?ev.substring(0,30)+'…':ev,'fnode-ev');c2.appendChild(n);evNodes[ev]=n;});
  fcols.appendChild(c2); spacer();

  // Col 2 — regions
  const c4=col('flow-col-4',8); c4.style.gap=ROW_G+'px';
  regions.forEach(function(r){var n=node(r,'fnode-reg');c4.appendChild(n);regNodes[r]=n;});
  fcols.appendChild(c4); spacer();

  // Col 3 — channels
  const c6=col('flow-col-6',8); c6.style.gap=ROW_G+'px';
  channels.forEach(function(ch){
    var cls=ch==='SMS'?'fnode-sms':ch==='WhatsApp'?'fnode-wa':ch==='Push'?'fnode-push':'fnode-em';
    var n=node(ch,cls); c6.appendChild(n); chNodes[ch]=n;
  });
  fcols.appendChild(c6); spacer();

  // Col 4 — endpoints (virtualized: rendered in batches as the user scrolls,
  // instead of building all N nodes + N curve-sets upfront)
  const c8=col('flow-col-8',8); c8.style.gap=ROW_G+'px';
  fcols.appendChild(c8);

  const svg = wrap.querySelector('#fsvg');
  const canvas = wrap.querySelector('#fcanvas');
  const epEls = [];
  const BATCH = 80;
  let renderedCount = 0;
  let sentinel = null;
  let observer = null;

  function drawCurvesFor(startIdx, endIdx){
    var cr = canvas.getBoundingClientRect();
    function mid(el){var r=el.getBoundingClientRect();return{x:r.left-cr.left,y:r.top-cr.top+r.height/2,rx:r.right-cr.left};}
    var libM = mid(lb);
    var paths = '';
    for(var i=startIdx;i<endIdx;i++){
      var d = filteredData[i];
      if(!evNodes[d.event]||!regNodes[d.r1]||!chNodes[d.channel]) continue;
      var color = CH_COLOR[d.channel]||'#888';
      var pE=mid(evNodes[d.event]),pR=mid(regNodes[d.r1]),pC=mid(chNodes[d.channel]);
      var curve=function(x1,y1,x2,y2){var cx=(x1+x2)/2;return '<path d="M'+x1+','+y1+' C'+cx+','+y1+' '+cx+','+y2+' '+x2+','+y2+'" fill="none" stroke="'+color+'" stroke-width="1.2" opacity="0.3" stroke-linecap="round"/>';};
      paths += curve(pE.rx,pE.y,pR.x,pR.y);
      paths += curve(pR.rx,pR.y,pC.x,pC.y);
    }
    svg.insertAdjacentHTML('beforeend', paths);
    svg.setAttribute('height', canvas.offsetHeight+20);
  }

  function renderNextBatch(){
    if(sentinel){ if(observer) observer.unobserve(sentinel); sentinel.remove(); sentinel=null; }
    var start = renderedCount;
    var end = Math.min(filteredData.length, start+BATCH);
    for(var i=start;i<end;i++){
      var d = filteredData[i];
      var agent=(d.agent&&d.agent!=='nan')?d.agent:'';
      var entryLabel=(d.entry&&d.entry!=='nan')?d.entry:'';
      var e = ep(entryLabel, agent, d.channel);
      c8.appendChild(e);
      epEls[i]=e;
    }
    renderedCount = end;
    requestAnimationFrame(function(){requestAnimationFrame(function(){
      drawCurvesFor(start, end);
      if(renderedCount < filteredData.length){
        sentinel = document.createElement('div');
        sentinel.style.height='1px';
        c6.appendChild(sentinel);
        observer.observe(sentinel);
      }
    })});
  }

  observer = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){ if(entry.isIntersecting) renderNextBatch(); });
  }, {root:null, rootMargin:'500px'});

  renderNextBatch();
}


