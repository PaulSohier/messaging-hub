// Pages: Message flow map data helpers and Messages Library
/* ─── PAGE 1: WHAT FIRES WHEN ─── */
function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

// SMS billing units are 160 characters each. A message over that length is
// charged as 2+ SMS. The character count is always shown on SMS messages, so
// you can see how close a message sits to the 160 boundary, not only whether
// it already crossed it:
//   over 160     -> red flag with billing units (as before)
//   141 to 160   -> amber tag, little headroom left
//   140 or less  -> neutral grey tag
// Character count is on the text passed in. In the Messages Library this is the
// filled text when the placeholder switch is on, otherwise the raw template text
// (including merge fields like <Customer First Name>).
const SMS_UNIT_CHARS = 160;
const SMS_NEAR_LIMIT_CHARS = 140;
function smsOversizeTag(channel, rawMsg){
  if(channel !== 'SMS' || !rawMsg) return '';
  const len = rawMsg.length;
  if(len > SMS_UNIT_CHARS){
    const units = Math.ceil(len / SMS_UNIT_CHARS);
    return '<span class="tag t-oversize" title="'+len+' characters, billed as '+units+' SMS units at 160 chars each">&#128681; '+len+' ch. ('+units+' SMS)</span>';
  }
  const left = SMS_UNIT_CHARS - len;
  const cls = len > SMS_NEAR_LIMIT_CHARS ? 't-chars-near' : 't-chars';
  return '<span class="tag '+cls+'" title="'+len+' characters, 1 SMS unit, '+left+' characters left before the 160 limit">'+len+' ch.</span>';
}

let expandedCard = null;

/* ── MESSAGE-LEVEL DEEP LINKS ── */
// The sheet's MessageID column is currently blank on every row, so we build a
// deterministic key from the fields that actually distinguish one message from
// another. A small number of rows are genuine exact duplicates in the sheet —
// linking to either one shows the same content, so this is fine in practice.
function msgShareKey(m){
  var parts = [m.title, (m.r1||m.region||''), m.channel, m.event, m.sendTo, m.agent, m.entry];
  var raw = parts.map(function(p){ return (p||'').toString().trim().toLowerCase(); }).join('||');
  var hash = 0;
  for(var i=0;i<raw.length;i++){ hash = ((hash<<5)-hash+raw.charCodeAt(i))|0; }
  return (hash>>>0).toString(36);
}

function shareMessage(ev, key){
  ev.stopPropagation();
  const params = new URLSearchParams();
  params.set('page','messages-library');
  params.set('msg', key);
  const url = window.location.origin + window.location.pathname + '?' + params.toString();
  const btn = ev.currentTarget;
  function showCopied(){
    if(!btn) return;
    const old = btn.textContent;
    btn.textContent = 'Copied';
    setTimeout(function(){ btn.textContent = old; }, 1200);
  }
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(url).then(showCopied).catch(function(){ window.prompt('Copy this link:', url); });
  } else {
    window.prompt('Copy this link:', url);
  }
}

function jumpToSharedMessage(){
  const key = window._pendingMsg;   // read from the link at start up
  window._pendingMsg = null;
  if(!key) return;
  if(activeTab !== 'p1'){
    activeTab = 'p1';
    activateNavTabFor('p1');
  }
  activeIntent = 'all';
  renderPage('p1');
  updateURLState('replace');   // the message is shown, so it leaves the link
  requestAnimationFrame(function(){
    const target = document.querySelector('.msg-item[data-msgkey="'+key+'"]');
    if(!target) return;
    // The card lives inside a collapsed "trigger event" accordion — open that
    // ancestor first, or scrollIntoView has nothing visible to scroll to.
    const eventBlock = target.closest('.event-block');
    if(eventBlock) eventBlock.classList.add('open');
    document.querySelectorAll('.msg-item.expanded').forEach(function(el){ el.classList.remove('expanded'); });
    target.classList.add('expanded');
    expandedCard = target;
    requestAnimationFrame(function(){
      target.scrollIntoView({behavior:'smooth', block:'center'});
      target.classList.add('jump-highlight');
      setTimeout(function(){ target.classList.remove('jump-highlight'); }, 2000);
    });
  });
}

function toggleMsg(el){
  if(expandedCard && expandedCard !== el) expandedCard.classList.remove('expanded');
  el.classList.toggle('expanded');
  expandedCard = el.classList.contains('expanded') ? el : null;
}

function renderP1(){
  const p1FilterRow = document.getElementById('p1-filter-row');
  if(p1FilterRow) p1FilterRow.style.display = activeAudience === 'bm' ? 'flex' : 'none';
  const fillBox = document.getElementById('p1-fill-placeholders');
  if(fillBox) fillBox.checked = p1FillPlaceholders;
  const intentsToRender = activeIntent==='all' ? INTENTS : [INTENTS.find(i=>i.key===activeIntent)||{label:'',data:[],icon:'',key:''}];
  let totalLive = 0;
  let totalMatched = 0;
  let html = '';
  let intentIdx = 0;
  const q = searchQuery.toLowerCase();

  intentsToRender.forEach(function(intent){
    var marginTop = intentIdx > 0 ? '24px' : '0';
    intentIdx++;

    if(activeIntent==='all'){
      html += '<div style="font-size:12px;font-weight:700;color:var(--purple);margin:' + marginTop + ' 0 10px;display:flex;align-items:center;gap:8px;">' + esc(intent.label) + '</div>';
    }

    var filteredData = intent.data.filter(function(d){
      var isBmChannel = ['SMS','WhatsApp'].indexOf(d.channel) !== -1;
      var isDigitalChannel = ['Email','Push','InApp','In-App','In-app'].indexOf(d.channel) !== -1;
      if(activeAudience==='bm' && !isBmChannel) return false;
      if(activeAudience==='digital' && !isDigitalChannel) return false;
      if(p1CountryFilter !== 'all' && (d.r1||'').trim() !== p1CountryFilter) return false;
      if(p1ChannelFilter !== 'all' && d.channel !== p1ChannelFilter) return false;
      if(q){
        var titleMatch = (d.title||'').toLowerCase().indexOf(q) !== -1;
        var msgMatch = (d.msg||'').toLowerCase().indexOf(q) !== -1;
        if(!titleMatch && !msgMatch) return false;
      }
      return true;
    });

    if(!filteredData || filteredData.length === 0){
      if(q) return; // no match for this intent under current search — just skip it silently
      html += '<div class="empty-intent" style="margin-bottom:16px">'
            + ''
            + '<div class="empty-intent-title">No templates for this filter</div>'
            + '<div class="empty-intent-sub">Try switching to "All" to see all messages for this intent.</div>'
            + '</div>';
      return;
    }

    var events = [];
    filteredData.forEach(function(d){ if(events.indexOf(d.event)===-1) events.push(d.event); });

    events.forEach(function(ev){
      var evData = filteredData.filter(function(d){
        return d.event===ev && d.live;
      });
      if(!evData.length) return;

      var liveN = evData.length;
      totalLive += liveN;

      html += '<div class="event-block" style="margin-bottom:10px">';
      html += '<div class="event-trigger" onclick="this.closest(\'\.event-block\').classList.toggle(\'open\')">';
      html += '<div><div class="ev-lbl">Event</div><div class="ev-name">' + esc(ev) + '</div></div>';
      html += '<div class="ev-counts"><div class="evc"><div class="evc-n live">' + liveN + '</div><div class="evc-l">live</div></div><div class="chevron">&#9662;</div></div>';
      html += '</div>';
      var chList = activeAudience === 'digital' ? ['Email','Push','InApp'] : ['SMS','WhatsApp'];
      html += '<div class="event-body"><div class="channels-wrap" style="grid-template-columns:repeat(' + chList.length + ',1fr);">';

      chList.forEach(function(ch){
        var msgs = evData.filter(function(d){ return d.channel===ch; });
        var cls = ch==='SMS'?'sms':ch==='WhatsApp'?'wa':ch==='Push'?'push':ch==='InApp'?'inapp':'em';
        var chLabel = ch==='InApp' ? 'In-app' : ch;
        html += '<div class="ch-col">';
        html += '<div class="ch-col-hdr ' + cls + '"><span class="ch-col-name">' + chLabel + '</span><span class="ch-col-cnt">' + msgs.length + '</span></div>';
        if(!msgs.length){
          html += '<div class="empty-ch">No live messages</div>';
        } else {
          html += '<div class="msg-list">';
          msgs.forEach(function(m){
            var region = [m.r1,m.r2,m.r3].filter(function(v){ return v&&v!=='nan'; }).join(', ') || m.region || '';
            var agent = (m.agent&&m.agent!=='nan') ? m.agent : (m.group&&m.group!=='nan') ? m.group : '';
            // Fill before measuring, so the SMS oversize tag reflects the
            // real sent length rather than the shorter template text.
            var rawMsg = p1FillPlaceholders ? fillPlaceholders(m.msg || '') : (m.msg || '');
            var isLong = rawMsg.length > 120;
            // if searching and the match sits outside the short preview, expand the card so the match is visible
            var forceExpand = false;
            if(q && isLong){
              var matchIdx = rawMsg.toLowerCase().indexOf(q);
              if(matchIdx !== -1 && matchIdx >= 117) forceExpand = true;
            }
            var msgShort = highlight(isLong ? rawMsg.substring(0,117)+'…' : rawMsg, esc);
            var msgFull  = highlight(rawMsg, esc);

            var tagsHtml = '';
            tagsHtml += smsOversizeTag(m.channel, rawMsg);
            if(region) tagsHtml += '<span class="tag t-region">' + esc(region) + '</span>';
            if(m.entry && m.entry!=='nan') tagsHtml += '<span class="tag t-entry">' + esc(m.entry) + '</span>';
            if(m.sendTo && m.sendTo!=='nan') tagsHtml += '<span class="tag t-sendto">' + esc(m.sendTo) + '</span>';
            if(agent) tagsHtml += '<span class="tag t-agent">' + esc(agent) + '</span>';
            if(m.lang && m.lang!=='nan') tagsHtml += '<span class="tag t-lang">' + esc(m.lang) + '</span>';

            var msgHtml = '';
            if(rawMsg){
              msgHtml += '<div class="msg-preview-text">&ldquo;' + msgShort + '&rdquo;</div>';
              msgHtml += '<div class="msg-full">&ldquo;' + msgFull + '&rdquo;</div>';
              if(isLong) msgHtml += '<div class="msg-expand-hint">&#9662; click to read full message</div>';
            }

            totalMatched++;
            html += '<div class="msg-item live-card' + (forceExpand?' expanded':'') + '" data-msgkey="' + msgShareKey(m) + '" onclick="toggleMsg(this)">';
            html += '<button class="msg-share-btn" title="Copy link to this message" onclick="shareMessage(event, \'' + msgShareKey(m) + '\')">Link</button>';
            html += '<div class="msg-status"><span class="dot-live"></span><span style="color:var(--live);font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.08em">Live</span>';
            if(m.audience==='digital') html += '<span class="audience-badge audience-digital" style="margin-left:8px;">Digital</span>';
            html += '</div>';
            html += '<div class="msg-title">' + highlight(m.title, esc) + '</div>';
            if(tagsHtml) html += '<div class="msg-tags" style="margin-bottom:6px">' + tagsHtml + '</div>';
            html += msgHtml;
            html += '</div>';
          });
          html += '</div>';
        }
        html += '</div>';
      });

      html += '</div></div></div>';
    });
  });

  if(q && totalMatched === 0){
    html = '<div class="empty-intent">'
         + '<div class="empty-intent-title">No message matches &ldquo;' + esc(searchQuery) + '&rdquo;</div>'
         + '<div class="empty-intent-sub">Try a shorter word, or clear the search to see everything.</div></div>';
  }

  document.getElementById('p1-content').innerHTML = html || '<div class="empty-intent"><div class="empty-intent-title">No data</div></div>';
  const b1El = document.getElementById('b1');
  if(b1El) b1El.textContent = totalLive;
  var countEl = document.getElementById('p1-search-count');
  if(countEl) countEl.textContent = q ? (totalMatched + (totalMatched===1?' match':' matches')) : '';
}

