// App state and Global Agent markets
/* ── STATE ── */
let activeIntent = 'all';
let activeAudience = 'bm'; // structural now: 'bm' or 'digital' (only meaningful when activeBrand==='ria')
let activeBrand = 'ria'; // 'ria' or 'xe'
let activeTab = 'p0';
// Countries where a Global Agent (not Ria) manages sending — per the Global
// Agents file, excluding the US, where Ria still owns the customer
// communication even though an agent manages the sending tooling there.
const GLOBAL_AGENT_COUNTRIES = ['Albania','Angola','Antigua & Barbuda','Argentina','Armenia','Bahamas','Bahrain','Benin','Bolivia','Bosnia Herzegovina','Brazil','Brunei','Bulgaria','Burkina Faso','Cambodia','Cameroon','Cape Verde','Chad','Chile','Comoros','Congo DRC','Congo Brazaville','Cyprus','Czech Republic','Dominican Republic','Ecuador','El Salvador','Estonia','Fiji','Gabon','Gambia','Georgia','Guatemala','Guinea','Guinea Bissau','Guyana','Honduras','Hong Kong','Hungary','Indonesia','Israel','Ivory Coast','Japan','Jordan','Kazakhstan','Kenya','Korea South','Kosovo','Kuwait','Kyrgyzstan','Laos','Latvia','Lebanon','Liberia','Lithuania','Macau','Madagascar','Malawi','Maldives','Mauritius','Moldova','Mongolia','Montenegro','Morocco','Mozambique','Nicaragua','Niger','North Macedonia','Oman','Paraguay','Peru','Philippines','Poland','Qatar','Romania','Rwanda','Saudi Arabia','Senegal','Serbia','Seychelles','Sierra Leone','Singapore','Solomon Islands','South Africa','Sri Lanka','Suriname','Tanzania','Thailand','Togo','Trinidad & Tobago','Turkey','Turks & Caicos','Uganda','United Arab Emirates','Zambia','Zimbabwe'];

function isRiaSendingCountry(country){
  return GLOBAL_AGENT_COUNTRIES.indexOf(country) === -1;
}

function getRiaSendingOnly(){
  try { return localStorage.getItem('riaMessagingHub_riaSendingOnly') === '1'; } catch(e){ return false; }
}
function setRiaSendingOnly(val){
  try { localStorage.setItem('riaMessagingHub_riaSendingOnly', val ? '1' : '0'); } catch(e){}
  renderPage(activeTab);
}
function riaSendingToggleHtml(){
  const checked = getRiaSendingOnly();
  return '<label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);cursor:pointer;user-select:none;">'
    + '<input type="checkbox" '+(checked?'checked':'')+' onchange="setRiaSendingOnly(this.checked)" style="cursor:pointer;">'
    + 'Ria sending countries only <span style="color:var(--hint);">(excludes Global Agent markets)</span>'
    + '</label>';
}

let searchQuery = '';
let p1CountryFilter = 'all';
let p1FillPlaceholders = false;

