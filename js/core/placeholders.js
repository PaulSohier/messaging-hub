// Placeholder sample values for the Messages Library preview
// Sample values for the Messages Library placeholder preview.
// Lengths are deliberately near the real median for each field, so a filled
// message reads at a realistic character count — the point is to judge SMS
// length, not just readability. Names vary in length on purpose, as real ones
// do. Correspondent and agent values are taken from real Ria data.
// Ria PayID is intentionally absent: its format is unknown, so it is left as
// the raw placeholder rather than filled with something invented.
const P1_PLACEHOLDER_VALUES = {
  'Customer First Name': 'Carlos',
  'Customer Last Name': 'Ramirez',
  'Beneficiary First Name': 'Lucia',
  'Beneficiary Last Name': 'Morales',
  'Order Number': 'US896541236',
  'PIN': '9654882031',
  'Refund PIN': '7854123690',
  'Foreign Amount': '1,250.00',
  'Local Amount': '1,250.00',
  'Total Amount': '1,268.50',
  'Amount': '1,250.00',
  'Customer Fee': '18.50',
  'Payout Currency': 'MXN',
  'Payin Currency': 'USD',
  'Currency': 'USD',
  'Recipient Country': 'Mexico',
  'Beneficiary City': 'Guadalajara',
  'Rate': '17.85',
  'Sent Date': '01/05/2026',
  // Locale-aware: see P1_LINK_BY_LOCALE below. This entry is the fallback
  // used if language detection somehow fails.
  'Dynamic Link w/ Omni Token for Digital User': 'https://www.riamoneytransfer.com/en-us/track-a-transfer/',
  'Customer Required Items list for Transaction': 'a photo ID, proof of address and proof of income',
  'Agent Name': 'Walmart Store 2451',
  'Correspondent Display Name': 'Banco Azteca Bank Deposit',
  'Correspondent Name': 'Banco Azteca Bank Deposit (Direct)',
};

// The tracking link is locale specific. The Language column is blank on these
// rows, so the language is detected from the message text itself. Both URLs
// are the same length (56 chars), so this does not change SMS sizing.
const P1_LINK_KEY = 'Dynamic Link w/ Omni Token for Digital User';
const P1_LINK_BY_LOCALE = {
  en: 'https://www.riamoneytransfer.com/en-us/track-a-transfer/',
  es: 'https://www.riamoneytransfer.com/es-us/track-a-transfer/',
};
function detectMessageLocale(text){
  const t = (text || '');
  if(/\bHola\b|Tarifas por msj|Responde STOP|La transferencia|Consulta el historial|Rastrea/i.test(t)) return 'es';
  return 'en';
}

// Replaces <Angle Bracket> placeholders with sample values. WhatsApp's {{1}}
// and {{Named}} styles are deliberately left alone: WhatsApp isn't billed by
// length, and the numbered variables' field mapping is still unconfirmed.
function fillPlaceholders(text){
  if(!text) return text;
  const locale = detectMessageLocale(text);
  return text.replace(/<([^<>]{1,60})>/g, function(whole, inner){
    const key = inner.trim();
    if(key === P1_LINK_KEY){
      return P1_LINK_BY_LOCALE[locale] || P1_PLACEHOLDER_VALUES[key];
    }
    if(Object.prototype.hasOwnProperty.call(P1_PLACEHOLDER_VALUES, key)){
      return P1_PLACEHOLDER_VALUES[key];
    }
    return whole; // unknown placeholder (e.g. Ria PayID) stays visible as-is
  });
}

function setP1FillPlaceholders(on){
  p1FillPlaceholders = !!on;
  renderP1();
}
let p1ChannelFilter = 'all';
let p2CountryFilter = 'all'; // Customer Journeys — B&M only (SMS is the only channel with per-country variants)

window.setP2CountryFilter = function(val){
  p2CountryFilter = val;
  renderJourneys();
};

function setP1CountryFilter(val){
  p1CountryFilter = val;
  renderP1();
}
function setP1ChannelFilter(val){
  p1ChannelFilter = val;
  document.querySelectorAll('#p1-filter-row .intent-pill[data-p1channel]').forEach(function(el){
    el.classList.toggle('active', el.dataset.p1channel === val);
  });
  renderP1();
}
function populateP1CountryOptions(){
  const select = document.getElementById('p1-country-select');
  if(!select || select.dataset.populated) return;
  const countries = new Set();
  INTENTS.forEach(function(intent){
    intent.data.forEach(function(d){
      var isBmChannel = ['SMS','WhatsApp'].indexOf(d.channel) !== -1;
      if(isBmChannel && d.r1) countries.add(d.r1.trim());
    });
  });
  const sorted = Array.from(countries).sort();
  sorted.forEach(function(c){
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });
  select.dataset.populated = '1';
}

function setSearch(val){
  searchQuery = (val||'').trim();
  document.getElementById('p1-search-clear').style.display = searchQuery ? 'inline-block' : 'none';
  renderP1();
}
function clearSearch(){
  searchQuery = '';
  document.getElementById('p1-search').value = '';
  document.getElementById('p1-search-clear').style.display = 'none';
  renderP1();
}
function highlight(text, esc){
  if(!searchQuery) return esc(text);
  var q = searchQuery.toLowerCase();
  var src = text || '';
  var lower = src.toLowerCase();
  var idx = lower.indexOf(q);
  if(idx === -1) return esc(text);
  var out = '';
  var pos = 0;
  while(idx !== -1){
    out += esc(src.substring(pos, idx)) + '<mark>' + esc(src.substring(idx, idx+q.length)) + '</mark>';
    pos = idx + q.length;
    idx = lower.indexOf(q, pos);
  }
  out += esc(src.substring(pos));
  return out;
}

const CH_CLS  = {SMS:'sms',WhatsApp:'wa',Email:'em'};
const CH_ICON = {SMS:'',WhatsApp:'',Email:''};
const CH_COLOR= {SMS:'#378ADD',WhatsApp:'#1D9E75',Email:'#BA7517'};

