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

// Messages Library status. kind 'cost' also reports the live events that have no cost line yet.
function libStatus(kind){
  if(!LIB.tried) return {level:'loading', label:'Syncing with Messages Library'};
  if(!LIB.synced){
    return {level:'error', label:'Messages Library offline', details:[{lines:[
      'The Messages Library did not return any live SMS messages. The sheet could not be reached, or it is empty.',
      'Live events and billing units come from the built-in snapshot, so the numbers can be out of date.',
      'Reload the page to try again.'
    ]}]};
  }
  const t = LIB.at ? LIB.at.toTimeString().slice(0,5) : '';
  const details = [{lines:[
    'Synced at '+t+': '+LIB.rows+' live SMS messages in '+LIB.markets+' markets.',
    'Live events come from the library, and billing units from the real length of the live US messages.'
  ]}];
  if(LIB.changes.length) details.push({title:'Changed since the built-in snapshot ('+LIB.changes.length+')', lines:LIB.changes});
  const nc = kind === 'cost' ? LIB.notCosted : [];
  if(nc.length){
    details.push({title:'Not costed yet ('+nc.length+')', lines:['These events are live in the library but not in the cost model, so the totals leave them out.'].concat(nc)});
    return {level:'warn', label:'Synced with Messages Library, '+nc.length+' event'+(nc.length>1?'s':'')+' not costed', details:details};
  }
  return {level:'ok', label:'Synced with Messages Library', details:details};
}

function refreshLibraryStatus(){
  setStatus('library', libStatus('library'));
  setStatus('cost', libStatus('cost'));
}
