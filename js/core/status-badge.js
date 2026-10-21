// Status badge at the top right of a page: one small coloured box, details open downward on hover
/* A page header has an empty slot: <div class="status-slot" data-status="KEY">. setStatus(KEY, status) fills it.
   status = { level: 'ok' | 'warn' | 'error' | 'loading', label: 'short text', details: [ { title?: 'text', lines: ['text'] } ] }
   Green = all good, orange = works but has a problem, red = offline or not loaded, grey = loading.
   The details open below the box on hover, on keyboard focus and on tap. */
const HUB_STATUS = {};
let hubStatusCount = 0;

function setStatus(key, status){
  if(status) HUB_STATUS[key] = status; else delete HUB_STATUS[key];
  paintStatus(key);
}

function paintStatus(key){
  const s = HUB_STATUS[key];
  document.querySelectorAll('.status-slot[data-status="'+key+'"]').forEach(function(slot){
    slot.innerHTML = s ? statusHtml(s) : '';
  });
}

function statusHtml(s){
  let tip = '';
  (s.details || []).forEach(function(sec){
    if(sec.title) tip += '<div class="hub-status-h">'+esc(sec.title)+'</div>';
    (sec.lines || []).forEach(function(l){ tip += '<div class="hub-status-l">'+esc(l)+'</div>'; });
  });
  const id = 'hub-status-tip-'+(++hubStatusCount);
  return '<div class="hub-status hub-status--'+s.level+'">'
    + '<button type="button" class="hub-status-pill"'+(tip ? ' aria-describedby="'+id+'"' : '')+'><span class="hub-status-dot" aria-hidden="true"></span>'+esc(s.label)+'</button>'
    + (tip ? '<div class="hub-status-tip" role="tooltip" id="'+id+'">'+tip+'</div>' : '')
    + '</div>';
}

// Messages Library status: green when synced, red when offline, grey while syncing. No details, no hover.
function libStatus(){
  if(!LIB.tried) return {level:'loading', label:'Syncing with Messages Library'};
  if(!LIB.synced) return {level:'error', label:'Messages Library offline'};
  return {level:'ok', label:'Synced with Messages Library'};
}

function refreshLibraryStatus(){
  setStatus('library', libStatus());
  setStatus('cost', libStatus());
}
