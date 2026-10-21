// Page: Activation roadmap
/* ── ACTIVATION ROADMAP (B&M, Ria, FX Client) ──
   Reads data/activation-roadmap.json at run time: edit that file on GitHub to move a
   box, add a week or change a status (planned, confirmed, live). No code change needed. */
async function renderActivationRoadmap(){
  const box = document.getElementById('p14-content');
  box.innerHTML = '<div style="padding:60px;text-align:center;color:var(--muted);font-size:13px;">Loading roadmap…</div>';
  let data;
  try{
    const res = await fetch('data/activation-roadmap.json');
    if(!res.ok) throw new Error('fetch failed: '+res.status);
    data = await res.json();
  } catch(e){
    box.innerHTML = '<div class="empty-intent"><div class="empty-intent-title">Could not load the roadmap</div>'
      + '<div class="empty-intent-sub">Check that data/activation-roadmap.json exists on this branch.</div></div>';
    return;
  }
  const esc = function(t){ return String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
  const weeks = data.weeks || [], rows = data.rows || [], items = data.items || [];
  const STATUS = {planned:'Planned', confirmed:'Confirmed', live:'Live'};
  let h = '<div class="rm-intro"><b>Activation roadmap.</b> '+esc(data.subtitle || '')+' Each week we decide which events to turn on and in which markets. Weeks without a box are still open.</div>'
    + '<div class="rm-legend"><span><i class="rm-sw planned"></i>Planned</span><span><i class="rm-sw confirmed"></i>Confirmed</span><span><i class="rm-sw live"></i>Live</span></div>'
    + '<div class="rm-wrap"><div class="rm-grid" style="grid-template-columns:170px repeat('+weeks.length+',minmax(170px,1fr));">';
  h += '<div class="rm-h"></div>';
  weeks.forEach(function(w){ h += '<div class="rm-h"><b>'+esc(w.label)+'</b><span>'+esc(w.date)+'</span></div>'; });
  rows.forEach(function(r){
    h += '<div class="rm-rowlabel" style="--c:'+esc(r.color || '#999')+';"><b>'+esc(r.label)+'</b><span>'+esc(r.sub || '')+'</span></div>';
    weeks.forEach(function(w, wi){
      const cell = items.filter(function(it){ return it.row === r.id && it.week === wi + 1; });
      h += '<div class="rm-cell" style="--bgc:'+(cell.length ? '#fff' : '#fafbfc')+';">'
        + cell.map(function(it){
            const st = STATUS[it.status] ? it.status : 'planned';
            return '<div class="rm-box '+st+'">'
              + (it.events || []).map(function(e){ return '<span class="ev">'+esc(e)+'</span>'; }).join('')
              + (it.markets ? '<span class="mk">'+esc(it.markets)+'</span>' : '')
              + '<span class="st">'+STATUS[st]+(it.ticket ? ' · '+esc(it.ticket) : '')+'</span></div>';
          }).join('')
        + '</div>';
    });
  });
  h += '</div></div><div class="rm-note">To change the roadmap, edit <code>data/activation-roadmap.json</code> on GitHub. A box has a week, a row, a list of events, the markets and a status.</div>';
  box.innerHTML = h;
}

