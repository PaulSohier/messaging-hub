// Page: FX Client activations and spend, exports
/* ── FX CLIENT SCENARIO (Clickatell only, no Iterable) ── */
var FXS_KEY = 'riaMessagingHub_fxScenario';
window._fxs = window._fxs || {combos:{}, scenario:'current', optin:64, units:{}};

/* ── SPEND WITH THE WEEKLY ACTIVATIONS (FX Client Activations page) ──
   Real baseline: Clickatell invoices (data/clickatell-baseline.json).
   Plan: data/activation-roadmap.json (weeks, go-live dates, events, markets).
   Each planned event x market is costed with the Hub model, then scaled to the real invoices.
   Two limits, because the invoices are not split by country:
     high = real SMS baseline / model baseline (same error everywhere)
     low  = (real - model US) / (model baseline - model US) (the US part of the model is right) */
function fxsFillToday(D, B){
  const box = document.getElementById('fxs-today'); if(!box) return;
  const money = function(n){ return '$'+Math.round(n).toLocaleString('en-US'); };
  const num = function(n){ return Math.round(n).toLocaleString('en-US'); };
  const rows = [];
  Object.keys(D.ORDERS).forEach(function(c){ const r = obsToday(D,c); if(r && r.cost > 0) rows.push({c:c, r:r, orders:D.ORDERS[c]}); });
  rows.sort(function(a,b){ return b.r.cost - a.r.cost; });
  const total = rows.reduce(function(s,x){ return s + x.r.cost; }, 0);
  const totalSms = rows.reduce(function(s,x){ return s + x.r.sms; }, 0);
  const real = B && B.smsYearly ? B.smsYearly : 0;
  const top = rows.slice(0,12), rest = rows.slice(12);
  const restCost = rest.reduce(function(s,x){ return s + x.r.cost; }, 0), restSms = rest.reduce(function(s,x){ return s + x.r.sms; }, 0);
  const th = 'padding:6px 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);';
  const td = 'padding:7px 10px;font-size:12px;';
  const card = 'background:var(--card);border:1px solid var(--border);border-radius:var(--radius);';
  box.innerHTML = '<details style="'+card+'padding:14px 22px;margin-bottom:20px;">'
    + '<summary style="cursor:pointer;list-style:none;display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;"><span style="font-size:15px;font-weight:700;">What we send today</span>'
    + '<span style="font-size:13px;color:var(--muted);">Estimated '+money(total)+' per year'+(real ? ', '+Math.round(total/real*100)+'% of the real invoices' : '')+'. Click to see it by market.</span></summary>'
    + '<div style="margin-top:12px;">'
    + '<div style="font-size:12px;color:var(--muted);line-height:1.6;margin-bottom:12px;">Real 2026 SMS per event from Ria BI ('+esc(OBS.period)+') for the 9 measured markets, yearly. Other markets use the European average for the events live in the Messages Library. Clickatell rates.</div>'
    + '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:14px;">'
    + '<div style="flex:1;min-width:190px;background:var(--bg);border-radius:8px;padding:12px 16px;"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);">Estimated SMS cost today</div><div style="font-size:22px;font-weight:700;">'+money(total)+'</div><div style="font-size:11px;color:var(--muted);">per year, '+num(totalSms)+' SMS segments</div></div>'
    + (real ? '<div style="flex:1;min-width:190px;background:var(--bg);border-radius:8px;padding:12px 16px;"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);">Real Clickatell SMS invoices</div><div style="font-size:22px;font-weight:700;">'+money(real)+'</div><div style="font-size:11px;color:var(--muted);">'+esc(B.usagePeriod)+'. The estimate explains '+Math.round(total/real*100)+'% of it.</div></div>' : '')
    + '</div>'
    + '<table style="width:100%;border-collapse:collapse;"><tbody>'
    + '<tr><td style="'+th+'">Market</td><td style="'+th+'">Data</td><td style="'+th+'text-align:right;">SMS per year</td><td style="'+th+'text-align:right;">SMS per 100 orders</td><td style="'+th+'text-align:right;">Cost per year</td></tr>'
    + top.map(function(x){
        return '<tr style="border-top:1px solid var(--border);"><td style="'+td+'font-weight:600;">'+esc(x.c)+'</td>'
          + '<td style="'+td+'color:'+(x.r.measured?'var(--live)':'var(--muted)')+';">'+(x.r.measured?'Measured 2026':'Estimate')+'</td>'
          + '<td style="'+td+'text-align:right;">'+num(x.r.sms)+'</td>'
          + '<td style="'+td+'text-align:right;">'+(x.orders ? (x.r.sms/x.orders*100).toFixed(1) : '')+'</td>'
          + '<td style="'+td+'text-align:right;font-weight:600;">'+money(x.r.cost)+'</td></tr>';
      }).join('')
    + (rest.length ? '<tr style="border-top:1px solid var(--border);"><td style="'+td+'">'+rest.length+' other markets</td><td style="'+td+'color:var(--muted);">Estimate</td><td style="'+td+'text-align:right;">'+num(restSms)+'</td><td style="'+td+'"></td><td style="'+td+'text-align:right;font-weight:600;">'+money(restCost)+'</td></tr>' : '')
    + '</tbody></table></div></details>';
}

async function renderFxSpend(){
  const box = document.getElementById('fxs-spend'); if(!box) return;
  const D = window._imData;
  let B, R;
  try{
    const rs = await Promise.all([fetch('data/clickatell-baseline.json'), fetch('data/activation-roadmap.json')]);
    if(!rs[0].ok || !rs[1].ok) throw new Error('fetch failed');
    B = await rs[0].json(); R = await rs[1].json();
  } catch(e){
    box.innerHTML = '<div class="rm-intro" style="margin-bottom:20px;">Spend with the weekly activations could not be loaded. Check that data/clickatell-baseline.json and data/activation-roadmap.json exist on this branch.</div>';
    return;
  }
  const money = function(n){ return '$'+Math.round(n).toLocaleString('en-US'); };
  const range = function(a,b){ return Math.round(a) === Math.round(b) ? money(a) : money(a)+' to '+money(b); };
  const esc2 = function(t){ return String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
  const cal = B.calibration;
  // The model is built on 2026 observed rates, so it is close to the invoices. Low = the model is right. High = the US part is right and the whole gap sits in the other markets.
  const fLow = 1;
  const fHigh = Math.max(1, (B.smsYearly - cal.modelLiveBaselineUS) / (cal.modelLiveBaseline - cal.modelLiveBaselineUS));
  fxsFillToday(D, B);
  const year = new Date().getFullYear();
  const evIndex = {}; D.US_EVENTS.forEach(function(e,i){ evIndex[e.n.toLowerCase()] = i; });
  const share = function(goLive){
    const g = Date.UTC.apply(null, goLive.split('-').map(function(x,i){ return i===1 ? +x-1 : +x; }));
    const start = Date.UTC(year,0,1), end = Date.UTC(year,11,31);
    if(g > end) return 0; if(g < start) return 1;
    return ((end - g)/86400000 + 1) / 365;
  };

  let cumLow = 0, cumHigh = 0, sumLow = 0, sumHigh = 0, y26Low = 0, y26High = 0, liveLow = 0, liveHigh = 0;
  const warn = [], outRows = [];
  const trs = (R.weeks||[]).map(function(w, wi){
    const items = (R.items||[]).filter(function(it){ return it.week === wi+1; });
    let raw = 0, evs = {}, mks = {}, status = null, uncosted = false, allEv = {};
    items.forEach(function(it){
      (it.events||[]).forEach(function(en){ allEv[en] = 1; });
      const ml = it.marketList || [];
      if(!ml.length) uncosted = true;
      (it.events||[]).forEach(function(en){
        const i = evIndex[String(en).toLowerCase()];
        ml.forEach(function(m){
          if(i === undefined || D.ORDERS[m] === undefined || D.CLICKATELL[m] === undefined){ warn.push(en+' in '+m+' is not costed (no event rate, orders or rate on file).'); return; }
          const e = D.US_EVENTS[i];
          const extraRate = obsIsLive(D,m,i) ? 0 : Math.max(0, obsFullRate(D,m,i) - obsTodayRate(D,m,i));
          if(extraRate === 0) warn.push(en+' in '+m+' already runs at full coverage today, so it adds nothing.');
          raw += (extraRate/100) * D.ORDERS[m] * fxsUnits(i) * D.CLICKATELL[m];
          evs[en] = 1; mks[m] = 1;
        });
      });
    });
    const sts = items.map(function(it){ return it.status; });
    status = sts.length && sts.every(function(x){ return x === 'live'; }) ? 'live' : (sts.indexOf('confirmed') !== -1 || sts.indexOf('live') !== -1 ? 'confirmed' : 'planned');
    if(!items.length || (raw === 0 && !uncosted)){
      outRows.push({label:w.label, date:w.date, status:'', what:(items.length ? 'Nothing to cost' : 'Not decided yet'), note:''});
      return '<tr><td><b>'+esc2(w.label)+'</b></td><td>'+esc2(w.date)+'</td><td colspan="5" style="color:var(--muted);">'+(items.length ? 'Nothing to cost' : 'Not decided yet')+'</td></tr>';
    }
    if(raw === 0){
      outRows.push({label:w.label, date:w.date, status:status, what:Object.keys(allEv).join(', ')+' (markets still to be defined)', note:'Not costed yet'});
      const pc = {planned:'#B26A00', confirmed:'#1B5FA0', live:'var(--live)'}[status] || '#B26A00';
      return '<tr><td><b>'+esc2(w.label)+'</b></td><td>'+esc2(w.date)+'</td>'
        + '<td><span style="color:'+pc+';font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.05em;">'+esc2(status)+'</span></td>'
        + '<td style="max-width:300px;">'+esc2(Object.keys(allEv).join(', '))+' (markets still to be defined)</td>'
        + '<td colspan="3" style="color:var(--muted);">Not costed yet</td></tr>';
    }
    const lo = raw * fLow, hi = raw * fHigh, sh = share(w.goLive);
    if(!uncosted || raw > 0){
      cumLow += lo; cumHigh += hi; sumLow += lo; sumHigh += hi; y26Low += lo*sh; y26High += hi*sh;
      if(status === 'live'){ liveLow += lo; liveHigh += hi; }
    }
    const st = status || 'planned';
    const what = Object.keys(evs).join(', ') + (Object.keys(mks).length ? ' in '+Object.keys(mks).join(', ') : '') + (uncosted ? ' (some markets still to be defined)' : '');
    outRows.push({label:w.label, date:w.date, status:st, what:what, lo:lo, hi:hi, y26lo:lo*sh, y26hi:hi*sh, runLo:B.smsYearly+cumLow, runHi:B.smsYearly+cumHigh});
    const pill = {planned:'#B26A00', confirmed:'#1B5FA0', live:'var(--live)'}[st] || '#B26A00';
    return '<tr><td><b>'+esc2(w.label)+'</b></td><td>'+esc2(w.date)+'</td>'
      + '<td><span style="color:'+pill+';font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.05em;">'+esc2(st)+'</span></td>'
      + '<td style="max-width:300px;">'+esc2(what)+'</td>'
      + '<td>'+range(lo,hi)+'</td><td>'+range(lo*sh,hi*sh)+'</td><td><b>'+range(B.smsYearly+cumLow, B.smsYearly+cumHigh)+'</b></td></tr>';
  }).join('');

  const card = 'background:var(--card);border:1px solid var(--border);border-radius:var(--radius);';
  const lbl = 'font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)';
  const kpi = function(label, value, note){
    return '<div style="flex:1;min-width:210px;'+card+'padding:16px 18px;"><div style="'+lbl+';margin-bottom:4px;">'+label+'</div>'
      + '<div style="font-size:22px;font-weight:700;line-height:1.25;">'+value+'</div>'
      + '<div style="font-size:11px;color:var(--muted);margin-top:4px;line-height:1.5;">'+note+'</div></div>';
  };
  const warnHtml = warn.length ? '<div style="font-size:12px;color:#B26A00;margin-top:10px;line-height:1.6;">'+Array.from(new Set(warn)).map(esc2).join('<br>')+'</div>' : '';
  const notIn = (B.notInSmsBaseline||[]).map(function(x){ return esc2(x.label)+' '+money(x.amount); }).join(' and ');

  window._fxSpendData = {B:B, year:year, rows:outRows, sumLow:sumLow, sumHigh:sumHigh, y26Low:y26Low, y26High:y26High, fLow:fLow, fHigh:fHigh};
  box.innerHTML = '<div style="margin-bottom:24px;">'
    + '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:4px;"><div style="font-size:15px;font-weight:700;">Spend with the weekly activations</div>'
    + '<button onclick="fxSpendExportPng()" class="intent-pill" style="border:none;background:var(--purple);color:#fff;">Export picture (PNG)</button>'
    + '<button onclick="fxSpendExportCsv()" class="intent-pill" style="border:none;">Export CSV</button></div>'
    + '<div id="fxspend-preview" style="margin:10px 0;display:none;"></div>'
    + '<div style="font-size:12px;color:var(--muted);line-height:1.6;margin-bottom:12px;">What we really pay for SMS with Clickatell, plus what each activation week adds. Weeks come from the Activation roadmap. Figures after the baseline are estimates, shown as a range.</div>'
    + '<div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:14px;">'
    + kpi('Real baseline per year', money(B.smsYearly), 'Clickatell SMS invoices, usage '+esc2(B.usagePeriod)+'.')
    + kpi('Added by the planned weeks', range(sumLow, sumHigh), 'Per year, once all planned weeks are live'+(liveHigh ? '. Already live: '+range(liveLow, liveHigh)+'.' : '.'))
    + kpi('Yearly run rate after all weeks', range(B.smsYearly+sumLow, B.smsYearly+sumHigh), 'Baseline plus the planned weeks.')
    + kpi('Expected SMS spend in '+year, range(B.smsYearly+y26Low, B.smsYearly+y26High), 'Baseline for the full year, plus each week counted only from its go-live date.')
    + '</div>'
    + '<div style="'+card+'overflow:auto;"><table class="fxs-spend-t" style="width:100%;border-collapse:collapse;font-size:12px;">'
    + '<thead><tr><th>Week</th><th>Go-live</th><th>Status</th><th>What</th><th>Extra per year</th><th>Extra in '+year+'</th><th>Yearly run rate after this week</th></tr></thead>'
    + '<tbody>'+trs+'</tbody></table></div>'
    + warnHtml
    + '<details style="margin-top:10px;font-size:12px;color:var(--muted);line-height:1.7;"><summary style="cursor:pointer;font-weight:600;color:var(--text);">How these numbers are built</summary>'
    + '<div style="padding:8px 2px;">The baseline is the SMS part of the Clickatell invoices for '+esc2(B.usagePeriod)+' ('+esc2((B.smsLines||[]).map(function(x){ return x.label+' '+money(x.amount); }).join(' and '))+'). '
    + 'It is the last invoiced year, so it is used as the baseline for '+year+' too. Not included: '+notIn+'.<br>'
    + 'Segments per message are the ones set in the calculator below (default: the Hub model value), so changing them there updates this table.<br>'
    + 'Each planned event in each market is costed with the Hub model: the extra SMS is full coverage (the US 2026 rate) minus what the market already sends today (real Ria BI 2026 data, or the European average where the market is not measured), times the market orders and the Clickatell rate. The model alone gives '+money(cal.modelLiveBaseline)+' for what is live on '+esc2(cal.date)+', against '+money(B.smsYearly)+' really invoiced. '
    + 'The invoices are not split by country, so two limits are used: x'+fLow.toFixed(2)+' if the model is right, and x'+fHigh.toFixed(2)+' if the US part of the model is right and the whole gap is in the other markets. '
    + 'The range will narrow when Clickatell gives a usage report by country.</div></details>'
    + '</div>';
}


/* ── Export of the spend table (weekly report) ── */
function fxSpendBuildCanvas(){
  const X = window._fxSpendData; if(!X) return null;
  const money = function(n){ return '$'+Math.round(n).toLocaleString('en-US'); };
  const range = function(a,b){ return Math.round(a) === Math.round(b) ? money(a) : money(a)+' to '+money(b); };
  const B = X.B;
  const css = getComputedStyle(document.documentElement);
  const accent = (css.getPropertyValue('--purple') || '').trim() || '#FF6100';
  const W = 1300, PAD = 40, SC = 2, LH = 18;
  const font = function(w, s){ return w+' '+s+'px -apple-system, "Segoe UI", Helvetica, Arial, sans-serif'; };
  const tmp = document.createElement('canvas').getContext('2d'); tmp.font = font('400', 12);
  function wrap(text, maxW){
    const words = String(text).split(' '), lines = []; let cur = '';
    words.forEach(function(w){ const t = cur ? cur+' '+w : w; if(tmp.measureText(t).width > maxW && cur){ lines.push(cur); cur = w; } else cur = t; });
    if(cur) lines.push(cur); return lines;
  }
  const whatW = 400;
  const layout = X.rows.map(function(r){ const lines = wrap(r.what, whatW); return {r:r, lines:lines, h:Math.max(40, lines.length*LH+20)}; });
  const headH = 190, tableHead = 34, footH = 100;
  const H = headH + tableHead + layout.reduce(function(a,l){ return a+l.h; },0) + footH + 40;
  const cv = document.createElement('canvas'); cv.width = W*SC; cv.height = H*SC;
  const g = cv.getContext('2d'); g.scale(SC,SC);
  g.fillStyle = '#FFFFFF'; g.fillRect(0,0,W,H); g.fillStyle = accent; g.fillRect(0,0,W,8);
  g.fillStyle = '#1A1A1A'; g.font = font('700', 26); g.textBaseline = 'alphabetic';
  g.fillText('FX Client weekly activations: SMS spend', PAD, 55);
  g.fillStyle = '#6B6B6B'; g.font = font('400', 13);
  g.fillText('Ria B&M, SMS sent with Clickatell · baseline is the real invoices · '+new Date().toISOString().slice(0,10), PAD, 78);
  const boxes = [
    {t:'REAL BASELINE PER YEAR', v:money(B.smsYearly), n:'Usage '+B.usagePeriod},
    {t:'ADDED BY THE PLANNED WEEKS', v:range(X.sumLow,X.sumHigh), n:'Per year'},
    {t:'RUN RATE AFTER ALL WEEKS', v:range(B.smsYearly+X.sumLow,B.smsYearly+X.sumHigh), n:'Per year'},
    {t:'EXPECTED SMS SPEND IN '+X.year, v:range(B.smsYearly+X.y26Low,B.smsYearly+X.y26High), n:'Weeks counted from go-live'}
  ];
  const bw = (W-2*PAD-3*16)/4;
  boxes.forEach(function(b,k){
    const x = PAD + k*(bw+16), y = 98;
    g.fillStyle = k===3 ? accent : '#F5F5F5'; g.fillRect(x,y,bw,78);
    g.fillStyle = k===3 ? '#FFFFFF' : '#6B6B6B'; g.font = font('700', 10); g.fillText(b.t, x+14, y+22);
    g.fillStyle = k===3 ? '#FFFFFF' : '#1A1A1A'; g.font = font('700', b.v.length > 22 ? 17 : 22); g.fillText(b.v, x+14, y+50);
    g.fillStyle = k===3 ? '#FFFFFF' : '#6B6B6B'; g.font = font('400', 10); g.fillText(b.n, x+14, y+67);
  });
  let y = headH;
  g.font = font('700', 10); g.fillStyle = '#6B6B6B';
  g.fillText('WEEK', PAD, y+20); g.fillText('GO-LIVE', PAD+80, y+20); g.fillText('STATUS', PAD+230, y+20); g.fillText('WHAT', PAD+320, y+20);
  g.textAlign = 'right'; g.fillText('EXTRA PER YEAR', 920, y+20); g.fillText('EXTRA IN '+X.year, 1090, y+20); g.fillText('RUN RATE AFTER THIS WEEK', W-PAD, y+20); g.textAlign = 'left';
  y += tableHead; g.strokeStyle = '#DDDDDD'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(PAD, y-6); g.lineTo(W-PAD, y-6); g.stroke();
  const colr = {planned:'#B26A00', confirmed:'#1B5FA0', live:'#0F7A5C'};
  layout.forEach(function(l){
    const r = l.r;
    g.fillStyle = '#1A1A1A'; g.font = font('700', 13); g.fillText(r.label, PAD, y+20);
    g.font = font('400', 12); g.fillText(r.date.replace(/^[A-Za-z]+ /,''), PAD+80, y+20);
    if(r.status){ g.fillStyle = colr[r.status] || '#B26A00'; g.font = font('700', 10); g.fillText(r.status.toUpperCase(), PAD+230, y+20); }
    g.fillStyle = r.lo === undefined ? '#6B6B6B' : '#333333'; g.font = font('400', 12);
    l.lines.forEach(function(t,k){ g.fillText(t, PAD+320, y+20+k*LH); });
    g.textAlign = 'right';
    if(r.lo !== undefined){
      g.fillStyle = '#1A1A1A'; g.font = font('400', 12);
      g.fillText(range(r.lo,r.hi), 920, y+20); g.fillText(range(r.y26lo,r.y26hi), 1090, y+20);
      g.font = font('700', 12); g.fillText(range(r.runLo,r.runHi), W-PAD, y+20);
    } else if(r.note){ g.fillStyle = '#6B6B6B'; g.font = font('400', 12); g.fillText(r.note, 920, y+20); }
    g.textAlign = 'left'; y += l.h;
    g.beginPath(); g.moveTo(PAD, y-6); g.lineTo(W-PAD, y-6); g.stroke();
  });
  g.fillStyle = '#6B6B6B'; g.font = font('400', 11);
  const foot = [
    'Baseline: real Clickatell SMS invoices, usage '+B.usagePeriod+' (WhatsApp licence and commit payment not included). It is also used for '+X.year+'.',
    'Each week is an estimate, shown as a range: the Hub model scaled to the real invoices (x'+X.fLow.toFixed(2)+' to x'+X.fHigh.toFixed(2)+'). The invoices are not split by country.',
    'Weeks with no markets yet are not costed. This view does not include any Iterable cost.'
  ];
  foot.forEach(function(t,k){ g.fillText(t, PAD, y+26+k*16); });
  g.fillStyle = '#AAAAAA'; g.fillText('Ria B&M Messaging Hub', PAD, y+26+3*16+6);
  return cv;
}
function fxSpendExportPng(){
  const cv = fxSpendBuildCanvas(); if(!cv) return;
  const url = cv.toDataURL('image/png');
  const box = document.getElementById('fxspend-preview');
  box.style.display = 'block';
  box.innerHTML = '<div style="display:flex;gap:12px;align-items:center;margin-bottom:8px;">'
    + '<a href="'+url+'" download="fx-client-weekly-spend.png" class="intent-pill" style="border:none;text-decoration:none;background:var(--purple);color:#fff;">Download PNG</a>'
    + '<span style="font-size:11px;color:var(--muted);">Preview of the picture</span></div>'
    + '<img src="'+url+'" style="max-width:100%;border:1px solid var(--border);border-radius:8px;">';
  const a = document.createElement('a'); a.href = url; a.download = 'fx-client-weekly-spend.png';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
function fxSpendExportCsv(){
  const X = window._fxSpendData; if(!X) return;
  const q = function(s){ return '"'+String(s).replace(/"/g,'""')+'"'; };
  const n = function(v){ return v === undefined ? '' : Math.round(v); };
  const lines = ['Week,Go-live,Status,What,Extra per year low (USD),Extra per year high (USD),Extra in '+X.year+' low (USD),Extra in '+X.year+' high (USD),Run rate after this week low (USD),Run rate after this week high (USD)'];
  lines.push([q('Baseline'), q('Clickatell invoices'), q('real'), q('SMS usage '+X.B.usagePeriod), '', '', '', '', n(X.B.smsYearly), n(X.B.smsYearly)].join(','));
  X.rows.forEach(function(r){
    lines.push([q(r.label), q(r.date), q(r.status), q(r.what), n(r.lo), n(r.hi), n(r.y26lo), n(r.y26hi), n(r.runLo), n(r.runHi)].join(','));
  });
  lines.push([q('Total'), '', '', q('Expected SMS spend in '+X.year+' (baseline plus weeks from go-live)'), n(X.sumLow), n(X.sumHigh), n(X.y26Low), n(X.y26High), n(X.B.smsYearly+X.sumLow), n(X.B.smsYearly+X.sumHigh)].join(','));
  const blob = new Blob([lines.join('\n')], {type:'text/csv'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'fx-client-weekly-spend.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function renderFxScenario(){
  if(!window._imData) renderIterableMigration();   // loads the shared rate and event data
  const D = window._imData;
  const S = window._fxs;
  try{
    const raw = localStorage.getItem(FXS_KEY);
    const p = raw ? JSON.parse(raw) : null;
    if(p && p.version === 1){ S.combos = p.combos || {}; S.scenario = p.scenario || 'current'; S.optin = p.optin || 64; S.units = p.units || {}; }
  }catch(e){}

  const countries = Object.keys(D.ORDERS).filter(function(c){ return D.CLICKATELL[c] !== undefined && D.ORDERS[c] > 0; }).sort();
  const noRate = Object.keys(D.ORDERS).length - countries.length;
  S.countries = countries;

  const ccHtml = countries.map(function(c){
    const live = (D.LIVE_EVENTS[c]||[]).length;
    return '<label class="fxs-cc-row" data-name="'+esc(c.toLowerCase())+'" style="display:flex;align-items:center;gap:6px;font-size:11px;padding:3px 6px;cursor:pointer;white-space:nowrap;">'
      + '<input type="checkbox" class="fxs-cc" value="'+esc(c)+'" style="cursor:pointer;">'
      + esc(c)+(live?'<span style="color:var(--hint);font-size:10px;"> ('+live+' live)</span>':'')+'</label>';
  }).join('');

  const evHtml = D.US_EVENTS.map(function(e,i){
    return '<label style="display:flex;align-items:center;gap:7px;font-size:11px;padding:3px 5px;cursor:pointer;">'
      + '<input type="checkbox" class="fxs-ev" value="'+i+'" style="cursor:pointer;">'
      + '<span style="flex:1;">'+esc(e.n)+'</span>'
      + '<span style="color:var(--hint);font-size:10px;white-space:nowrap;display:flex;align-items:center;gap:4px;">'+e.p.toFixed(3)+'% of orders &middot; '
      + '<input type="number" min="1" max="10" step="1" value="'+((S.units && S.units[i]) || e.s)+'" title="Billing units (SMS segments) for this message" onclick="event.stopPropagation()" onchange="fxsSetUnit('+i+',this.value)" style="width:40px;padding:1px 3px;font-size:10px;border:1px solid var(--border-mid);border-radius:4px;background:var(--card);color:var(--text);"> seg</span></label>';
  }).join('');

  const card = 'background:var(--card);border:1px solid var(--border);border-radius:var(--radius);';
  const lbl = 'font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)';
  const inp = 'padding:8px 12px;border-radius:7px;border:1px solid var(--border-mid);background:var(--card);font-size:13px;color:var(--text);';

  const html = '<div class="calc-wrap">'
    + '<div id="fxs-today"></div>'
    + '<div id="fxs-spend"></div>'
    + '<div style="background:var(--purple-bg);border:1px solid var(--purple);border-radius:var(--radius);padding:16px 20px;margin-bottom:20px;font-size:13px;color:var(--text);line-height:1.75;">'
    + '<div style="font-weight:700;margin-bottom:6px;">What this page answers</div>'
    + 'First, what we send and pay <strong>today</strong>. Then pick any markets and any messages, add them to the list, and see <strong>how much extra SMS would cost per year</strong> if we turn them on in FX Client, sending with Clickatell. Nothing here involves Iterable. You can add different events for different markets, change the billing units of a message to test a shorter text, then export the result as a picture.'
    + '</div>'

    + '<div id="fxs-headline" style="font-size:19px;font-weight:700;color:var(--text);line-height:1.5;margin-bottom:18px;">&nbsp;</div>'

    + '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:18px;">'
    + '<div style="flex:1;min-width:200px;'+card+'padding:18px 20px;"><div style="'+lbl+';margin-bottom:4px;">Extra SMS cost per year</div><div id="fxs-k-cost" style="font-size:26px;font-weight:700;">&mdash;</div><div id="fxs-k-cost-note" style="font-size:11px;color:var(--muted);margin-top:4px;">Clickatell rates</div></div>'
    + '<div style="flex:1;min-width:200px;'+card+'padding:18px 20px;"><div style="'+lbl+';margin-bottom:4px;">Extra SMS per year</div><div id="fxs-k-sms" style="font-size:26px;font-weight:700;">&mdash;</div><div style="font-size:11px;color:var(--muted);margin-top:4px;">Billing segments</div></div>'
    + '<div style="flex:1;min-width:200px;'+card+'padding:18px 20px;"><div style="'+lbl+';margin-bottom:4px;">Activations</div><div id="fxs-k-act" style="font-size:26px;font-weight:700;">&mdash;</div><div id="fxs-k-act-note" style="font-size:11px;color:var(--muted);margin-top:4px;">Market + event combinations</div></div>'
    + '</div>'

    // Selection list
    + '<div style="'+card+'padding:18px 24px;margin-bottom:20px;">'
    + '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:10px;">'
    + '<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);">Your list</div>'
    + '<button onclick="fxsClear()" class="intent-pill" style="border:none;">Clear list</button>'
    + '<button onclick="fxsExportPng()" class="intent-pill" style="border:none;background:var(--purple);color:#fff;">Export picture (PNG)</button>'
    + '<button onclick="fxsExportCsv()" class="intent-pill" style="border:none;">Export CSV</button></div>'
    + '<div id="fxs-list"></div>'
    + '<div id="fxs-preview" style="margin-top:14px;display:none;"></div></div>'

    + '<div id="fxs-banner" style="display:none;background:#FFF7ED;border:1px solid var(--orange);border-radius:var(--radius);padding:10px 16px;margin-bottom:18px;font-size:11px;color:#7A3300;line-height:1.6;"></div>'
    + '<div id="fxs-note" style="display:none;background:#FFF7ED;border:1px solid var(--orange);border-radius:var(--radius);padding:10px 16px;margin-bottom:18px;font-size:11px;color:#7A3300;line-height:1.6;"></div>'

    // Pickers
    + '<div style="display:flex;gap:18px;flex-wrap:wrap;margin-bottom:18px;">'
    + '<div style="flex:1;min-width:300px;'+card+'padding:20px 24px;">'
    + '<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:10px;">1. Which markets?</div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;align-items:center;">'
    + '<input id="fxs-search" oninput="fxsFilter()" placeholder="Search a market" style="'+inp+'width:150px;padding:6px 10px;font-size:12px;">'
    + '<button onclick="fxsCcPreset(\'nolive\')" class="intent-pill" style="border:none;">No live SMS today</button>'
    + '<button onclick="fxsCcPreset(\'none\')" class="intent-pill" style="border:none;">Clear</button>'
    + '<span id="fxs-cc-count" style="font-size:11px;color:var(--muted);"></span></div>'
    + '<div style="display:flex;flex-wrap:wrap;gap:2px;max-height:230px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:8px;">'+ccHtml+'</div></div>'
    + '<div style="flex:1;min-width:300px;'+card+'padding:20px 24px;">'
    + '<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:10px;">2. Which messages?</div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;align-items:center;">'
    + '<button onclick="fxsEvPreset(\'all\')" class="intent-pill" style="border:none;">All events</button>'
    + '<button onclick="fxsEvPreset(\'us\')" class="intent-pill" style="border:none;">Match US coverage</button>'
    + '<button onclick="fxsEvPreset(\'none\')" class="intent-pill" style="border:none;">Clear</button>'
    + '<span id="fxs-ev-count" style="font-size:11px;color:var(--muted);"></span></div>'
    + '<div style="display:flex;flex-direction:column;gap:1px;max-height:230px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:8px;">'+evHtml+'</div></div>'
    + '</div>'

    + '<div style="display:flex;align-items:flex-end;gap:18px;flex-wrap:wrap;margin-bottom:18px;">'
    + '<button id="fxs-add" onclick="fxsAdd()" class="intent-pill" style="border:none;background:var(--purple);color:#fff;padding:10px 18px;font-size:13px;">Add to list</button>'
    + '<div style="display:flex;flex-direction:column;gap:6px;"><label style="'+lbl+'">Opt-in scenario</label>'
    + '<select id="fxs-scenario" onchange="fxsSetup()" style="'+inp+'cursor:pointer;min-width:170px;"><option value="current">Today\'s opt-in rate</option><option value="full">If everyone opted in</option></select></div>'
    + '<div style="display:flex;flex-direction:column;gap:6px;"><label style="'+lbl+'">Today\'s opt-in %</label>'
    + '<input id="fxs-optin" type="number" min="0.01" max="100" step="0.01" value="64" oninput="fxsSetup()" style="'+inp+'width:100px;"></div>'
    + '</div>'
    + '</div>';

  document.getElementById('p12-content').innerHTML = html;
  renderFxSpend();
  document.getElementById('fxs-scenario').value = S.scenario;
  document.getElementById('fxs-optin').value = S.optin;
  if(noRate > 0){
    const b = document.getElementById('fxs-banner');
    b.style.display = 'block';
    b.innerHTML = '<strong>'+noRate+' market'+(noRate>1?'s':'')+' not listed</strong> because there is no Clickatell rate on file or no order volume.';
  }
  fxsUpdateCounts();
  document.querySelectorAll('.fxs-cc, .fxs-ev').forEach(function(cb){ cb.addEventListener('change', fxsUpdateCounts); });
  fxsRefresh();
}

function fxsSetUnit(i, v){
  const S = window._fxs, D = window._imData;
  const n = Math.max(1, Math.min(10, Math.round(parseFloat(v) || 0)));
  if(!S.units) S.units = {};
  if(n === D.US_EVENTS[i].s) delete S.units[i]; else S.units[i] = n;
  fxsRefresh();
  renderFxSpend();   // the weekly spend table uses the same segment counts
}
function fxsUnits(i){
  const S = window._fxs, D = window._imData;
  return (S.units && S.units[i]) || D.US_EVENTS[i].s;
}

function fxsUpdateCounts(){
  const a = document.querySelectorAll('.fxs-cc:checked').length, b = document.querySelectorAll('.fxs-ev:checked').length;
  const e1 = document.getElementById('fxs-cc-count'), e2 = document.getElementById('fxs-ev-count'), btn = document.getElementById('fxs-add');
  if(e1) e1.textContent = a+' selected';
  if(e2) e2.textContent = b+' of '+window._imData.US_EVENTS.length+' selected';
  if(btn) btn.textContent = (a && b) ? 'Add to list ('+a+' market'+(a>1?'s':'')+' x '+b+' event'+(b>1?'s':'')+')' : 'Add to list';
}
function fxsFilter(){
  const q = document.getElementById('fxs-search').value.trim().toLowerCase();
  document.querySelectorAll('.fxs-cc-row').forEach(function(r){ r.style.display = (!q || r.dataset.name.indexOf(q) !== -1) ? 'flex' : 'none'; });
}
function fxsCcPreset(which){
  const D = window._imData;
  document.querySelectorAll('.fxs-cc').forEach(function(cb){
    if(which === 'none') cb.checked = false;
    else if(which === 'nolive') cb.checked = !(D.LIVE_EVENTS[cb.value]||[]).length;
  });
  fxsUpdateCounts();
}
function fxsEvPreset(which){
  const D = window._imData;
  const usLive = D.LIVE_EVENTS['United States'] || [];
  document.querySelectorAll('.fxs-ev').forEach(function(cb){
    const i = parseInt(cb.value,10);
    if(which === 'all') cb.checked = true;
    else if(which === 'none') cb.checked = false;
    else cb.checked = usLive.indexOf(i) !== -1;
  });
  fxsUpdateCounts();
}
function fxsAdd(){
  const S = window._fxs;
  const cs = Array.from(document.querySelectorAll('.fxs-cc:checked')).map(function(x){ return x.value; });
  const es = Array.from(document.querySelectorAll('.fxs-ev:checked')).map(function(x){ return parseInt(x.value,10); });
  if(!cs.length || !es.length) return;
  cs.forEach(function(c){
    const cur = S.combos[c] || [];
    es.forEach(function(i){ if(cur.indexOf(i) === -1) cur.push(i); });
    cur.sort(function(a,b){ return a-b; });
    S.combos[c] = cur;
  });
  fxsRefresh();
}
function fxsRmEvent(el){
  const S = window._fxs, c = el.dataset.c, i = parseInt(el.dataset.i,10);
  S.combos[c] = (S.combos[c]||[]).filter(function(x){ return x !== i; });
  if(!S.combos[c].length) delete S.combos[c];
  fxsRefresh();
}
function fxsRmCountry(el){ delete window._fxs.combos[el.dataset.c]; fxsRefresh(); }
function fxsClear(){ window._fxs.combos = {}; fxsRefresh(); }
function fxsSetup(){
  const S = window._fxs;
  S.scenario = document.getElementById('fxs-scenario').value;
  S.optin = parseFloat(document.getElementById('fxs-optin').value) || 64;
  fxsRefresh();
}

function fxsCompute(){
  const D = window._imData, S = window._fxs;
  const scale = S.scenario === 'full' ? (100/(S.optin||100)) : 1;
  const rows = [];
  let cost = 0, sms = 0, act = 0, liveSkipped = 0, todayCost = 0, todaySms = 0;
  Object.keys(S.combos).sort().forEach(function(c){
    const orders = D.ORDERS[c] || 0, rate = D.CLICKATELL[c];
    const items = S.combos[c].map(function(i){
      const e = D.US_EVENTS[i];
      const u = fxsUnits(i);
      const t = obsTodayRate(D,c,i), f = obsFullRate(D,c,i) * scale;
      const live = obsIsLive(D,c,i);
      const tSms = (t/100) * orders * u;
      const xSms = live ? 0 : Math.max(0, (f - t)/100 * orders * u);
      return {i:i, name:e.n, live:live, sms:xSms, cost:xSms*rate, todaySms:tSms, todayCost:tSms*rate};
    });
    const extra = items.filter(function(x){ return !x.live; });
    const r = {c:c, items:items, sms:0, cost:0, n:extra.length, todaySms:0, todayCost:0, measured:!!OBS.markets[c]};
    extra.forEach(function(x){ r.sms += x.sms; r.cost += x.cost; });
    items.forEach(function(x){ r.todaySms += x.todaySms; r.todayCost += x.todayCost; });
    liveSkipped += items.length - extra.length;
    cost += r.cost; sms += r.sms; act += r.n; todayCost += r.todayCost; todaySms += r.todaySms;
    rows.push(r);
  });
  return {rows:rows, cost:cost, sms:sms, act:act, liveSkipped:liveSkipped, scale:scale, todayCost:todayCost, todaySms:todaySms};
}
function fxsMoney(n){ return '$'+n.toLocaleString('en-US',{maximumFractionDigits: n < 10 ? 2 : 0, minimumFractionDigits: n < 10 && n > 0 ? 2 : 0}); }
function fxsNum(n){ return n.toLocaleString('en-US',{maximumFractionDigits:0}); }

function fxsRefresh(){
  const S = window._fxs, R = fxsCompute();
  const list = document.getElementById('fxs-list'); if(!list) return;
  const nM = R.rows.filter(function(r){ return r.n > 0; }).length;

  const hl = document.getElementById('fxs-headline');
  if(!R.rows.length) hl.innerHTML = '<span style="color:var(--muted);font-weight:500;">Pick markets and messages below, then add them to your list.</span>';
  else if(R.act === 0) hl.innerHTML = '<span style="color:var(--muted);font-weight:500;">Everything in your list is already live, so there is no extra SMS cost.</span>';
  else hl.innerHTML = 'Turning on <strong>'+R.act+' message activation'+(R.act>1?'s':'')+'</strong> in <strong>'+nM+' market'+(nM>1?'s':'')+'</strong> with FX Client and Clickatell would add about <span style="color:var(--purple);">'+fxsMoney(R.cost)+' per year</span> in SMS.'
    + (R.todayCost > 0 ? ' <span style="font-size:13px;font-weight:500;color:var(--muted);">These markets already send about '+fxsMoney(R.todayCost)+' per year of these messages today.</span>' : '');

  document.getElementById('fxs-k-cost').textContent = R.rows.length ? fxsMoney(R.cost) : '—';
  document.getElementById('fxs-k-sms').textContent = R.rows.length ? fxsNum(R.sms) : '—';
  document.getElementById('fxs-k-act').textContent = R.rows.length ? String(R.act) : '—';
  document.getElementById('fxs-k-act-note').textContent = R.liveSkipped ? (R.liveSkipped+' already live, not counted') : 'Market + event combinations';

  if(!R.rows.length){
    list.innerHTML = '<div style="font-size:12px;color:var(--muted);padding:6px 0;">Nothing added yet.</div>';
  } else {
    const th = 'padding:6px 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);';
    const sorted = R.rows.slice().sort(function(a,b){ return b.cost - a.cost; });
    list.innerHTML = '<table style="width:100%;border-collapse:collapse;"><tbody>'
      + '<tr><td style="'+th+'">Market</td><td style="'+th+'">Messages</td><td style="'+th+'text-align:right;">Today per year</td><td style="'+th+'text-align:right;">Extra SMS per year</td><td style="'+th+'text-align:right;">Extra cost per year</td><td></td></tr>'
      + sorted.map(function(r){
        const chips = r.items.map(function(x){
          return '<span style="display:inline-flex;align-items:center;gap:4px;margin:2px 4px 2px 0;padding:3px 8px;border-radius:12px;font-size:11px;'
            + (x.live ? 'background:var(--border);color:var(--muted);' : 'background:var(--purple-bg);border:1px solid var(--purple);color:var(--text);')+'">'
            + esc(x.name)+(x.live?' (live, '+fxsMoney(x.todayCost)+' today)':' &middot; +'+fxsMoney(x.cost))
            + '<button data-c="'+esc(r.c)+'" data-i="'+x.i+'" onclick="fxsRmEvent(this)" title="Remove" style="border:none;background:none;cursor:pointer;color:var(--muted);font-size:13px;line-height:1;padding:0;">&times;</button></span>';
        }).join('');
        return '<tr style="border-top:1px solid var(--border);vertical-align:top;">'
          + '<td style="padding:8px 10px;font-size:12px;font-weight:600;white-space:nowrap;">'+esc(r.c)+'</td>'
          + '<td style="padding:6px 10px;">'+chips+'</td>'
          + '<td style="padding:8px 10px;font-size:12px;text-align:right;white-space:nowrap;color:var(--muted);">'+fxsMoney(r.todayCost)+(r.measured ? '' : ' <span style="font-size:10px;">(est.)</span>')+'</td>'
          + '<td style="padding:8px 10px;font-size:12px;text-align:right;white-space:nowrap;">'+fxsNum(r.sms)+'</td>'
          + '<td style="padding:8px 10px;font-size:12px;text-align:right;white-space:nowrap;font-weight:600;">'+fxsMoney(r.cost)+'</td>'
          + '<td style="padding:6px 4px;"><button data-c="'+esc(r.c)+'" onclick="fxsRmCountry(this)" title="Remove market" style="border:none;background:none;cursor:pointer;color:var(--muted);font-size:15px;">&times;</button></td></tr>';
      }).join('')
      + '</tbody></table>';
  }

  const note = document.getElementById('fxs-note');
  if(note){
    if(R.rows.length){
      note.style.display = 'block';
      note.innerHTML = '<strong>Today</strong> is real 2026 data from Ria BI for the 9 measured markets (US, Canada, Australia, France, Spain, Germany, Italy, UK, Belgium) and the European average for the others (marked est.). <strong>Extra</strong> is full coverage (the US 2026 rate) minus what the market sends today.';
    } else note.style.display = 'none';
  }

  try{ localStorage.setItem(FXS_KEY, JSON.stringify({version:1, combos:S.combos, scenario:S.scenario, optin:S.optin, units:S.units||{}})); }catch(e){}
}

/* ── Export ── */
function fxsBuildCanvas(){
  const R = fxsCompute(), S = window._fxs;
  const rows = R.rows.filter(function(r){ return r.n > 0; }).sort(function(a,b){ return b.cost - a.cost; });
  if(!rows.length) return null;
  const css = getComputedStyle(document.documentElement);
  const accent = (css.getPropertyValue('--purple') || '').trim() || '#FF6100';
  const W = 1300, PAD = 40, SC = 2, LH = 19;
  const font = function(w, s){ return w+' '+s+'px -apple-system, "Segoe UI", Helvetica, Arial, sans-serif'; };
  const tmp = document.createElement('canvas').getContext('2d');
  tmp.font = font('400', 13);
  function wrap(text, maxW){
    const words = text.split(' '), lines = []; let cur = '';
    words.forEach(function(w){
      const t = cur ? cur+' '+w : w;
      if(tmp.measureText(t).width > maxW && cur){ lines.push(cur); cur = w; } else cur = t;
    });
    if(cur) lines.push(cur);
    return lines;
  }
  const evW = 470;
  const layout = rows.map(function(r){
    const text = r.items.filter(function(x){ return !x.live; }).map(function(x){ return x.name; }).join(', ');
    const lines = wrap(text, evW);
    return {r:r, lines:lines, h:Math.max(44, lines.length*LH+22)};
  });
  const headH = 190, tableHead = 34, footH = 90;
  const H = headH + tableHead + layout.reduce(function(a,l){ return a+l.h; },0) + footH + 50;
  const cv = document.createElement('canvas'); cv.width = W*SC; cv.height = H*SC;
  const g = cv.getContext('2d'); g.scale(SC,SC);
  g.fillStyle = '#FFFFFF'; g.fillRect(0,0,W,H);
  g.fillStyle = accent; g.fillRect(0,0,W,8);

  g.fillStyle = '#1A1A1A'; g.font = font('700', 26); g.textBaseline = 'alphabetic';
  g.fillText('FX Client scenario: extra SMS cost per year', PAD, 55);
  g.fillStyle = '#6B6B6B'; g.font = font('400', 13);
  const d = new Date();
  g.fillText('Sent with FX Client and Clickatell · 2025 order volumes · '+(S.scenario==='full'?'if everyone opted in':'today\'s opt-in rate')+' · '+d.toISOString().slice(0,10), PAD, 78);

  const boxes = [
    {t:'EXTRA COST PER YEAR', v:fxsMoney(R.cost)},
    {t:'EXTRA SMS PER YEAR', v:fxsNum(R.sms)},
    {t:'MARKETS', v:String(rows.length)},
    {t:'MESSAGE ACTIVATIONS', v:String(R.act)},
  ];
  const bw = (W-2*PAD-3*16)/4;
  boxes.forEach(function(b,k){
    const x = PAD + k*(bw+16), y = 100;
    g.fillStyle = k===0 ? accent : '#F5F5F5'; g.fillRect(x,y,bw,72);
    g.fillStyle = k===0 ? '#FFFFFF' : '#6B6B6B'; g.font = font('700', 10); g.fillText(b.t, x+16, y+24);
    g.fillStyle = k===0 ? '#FFFFFF' : '#1A1A1A'; g.font = font('700', 26); g.fillText(b.v, x+16, y+55);
  });

  let y = headH;
  g.font = font('700', 10); g.fillStyle = '#6B6B6B';
  g.fillText('MARKET', PAD, y+20); g.fillText('MESSAGES TURNED ON', PAD+190, y+20);
  g.textAlign = 'right'; g.fillText('SMS PER YEAR', 1030, y+20); g.fillText('EXTRA COST PER YEAR', W-PAD, y+20); g.textAlign = 'left';
  g.fillText('SHARE OF TOTAL', 720, y+20);
  y += tableHead;
  g.strokeStyle = '#DDDDDD'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(PAD, y-6); g.lineTo(W-PAD, y-6); g.stroke();

  const maxCost = rows[0].cost || 1;
  layout.forEach(function(l){
    g.fillStyle = '#1A1A1A'; g.font = font('700', 14); g.fillText(l.r.c, PAD, y+22);
    g.font = font('400', 13); g.fillStyle = '#333333';
    l.lines.forEach(function(t,k){ g.fillText(t, PAD+190, y+22+k*LH); });
    g.fillStyle = '#EEEEEE'; g.fillRect(720, y+11, 200, 12);
    g.fillStyle = accent; g.fillRect(720, y+11, Math.max(2, 200*l.r.cost/maxCost), 12);
    g.fillStyle = '#1A1A1A'; g.font = font('400', 14); g.textAlign = 'right';
    g.fillText(fxsNum(l.r.sms), 1030, y+22);
    g.font = font('700', 14); g.fillText(fxsMoney(l.r.cost), W-PAD, y+22); g.textAlign = 'left';
    y += l.h;
    g.beginPath(); g.moveTo(PAD, y-6); g.lineTo(W-PAD, y-6); g.stroke();
  });

  g.fillStyle = '#6B6B6B'; g.font = font('400', 11);
  const foot = [
    'Estimate. Extra = full coverage (US 2026 rate) minus what the market sends today (Ria BI 2026, European average where the market is not measured).',
    'Only messages that are not live today are counted. Carrier: Clickatell. This view does not include any Iterable cost.'+(Object.keys(S.units||{}).length ? ' Billing units edited for '+Object.keys(S.units).length+' message'+(Object.keys(S.units).length>1?'s':'')+'.' : '')
  ];
  foot.forEach(function(t,k){ g.fillText(t, PAD, y+30+k*16); });
  g.fillStyle = '#AAAAAA'; g.fillText('Ria B&M Messaging Hub', PAD, y+30+2*16+6);
  return cv;
}
function fxsExportPng(){
  const cv = fxsBuildCanvas();
  if(!cv){ alert('Add at least one message that is not live today to your list first.'); return; }
  const url = cv.toDataURL('image/png');
  const box = document.getElementById('fxs-preview');
  box.style.display = 'block';
  box.innerHTML = '<div style="display:flex;gap:12px;align-items:center;margin-bottom:8px;">'
    + '<a href="'+url+'" download="fx-client-scenario.png" class="intent-pill" style="border:none;text-decoration:none;background:var(--purple);color:#fff;">Download PNG</a>'
    + '<span style="font-size:11px;color:var(--muted);">Preview of the picture</span></div>'
    + '<img src="'+url+'" style="max-width:100%;border:1px solid var(--border);border-radius:8px;">';
  const a = document.createElement('a'); a.href = url; a.download = 'fx-client-scenario.png';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
function fxsExportCsv(){
  const R = fxsCompute();
  if(!R.rows.length) return;
  const q = function(s){ return '"'+String(s).replace(/"/g,'""')+'"'; };
  const lines = ['Market,Message,Already live,Today SMS per year,Today cost per year (USD),Extra SMS per year,Extra cost per year (USD)'];
  R.rows.forEach(function(r){ r.items.forEach(function(x){
    lines.push([q(r.c), q(x.name), x.live?'yes':'no', Math.round(x.todaySms), x.todayCost.toFixed(2), Math.round(x.sms), x.cost.toFixed(2)].join(','));
  }); });
  const blob = new Blob([lines.join('\n')], {type:'text/csv'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'fx-client-scenario.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

