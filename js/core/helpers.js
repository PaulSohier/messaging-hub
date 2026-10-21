// Small shared helpers
/* ── HELPERS ── */
function getData(){
  let data;
  if(activeIntent==='all') data = INTENTS.flatMap(i=>i.data);
  else {
    const found = INTENTS.find(i=>i.key===activeIntent);
    data = found ? found.data : [];
  }
  // Audience here means "which section" (B&M vs Digital), and that has to be
  // channel-based, not just which sheet tab a row came from — the B&M sheet tab
  // contains some Email rows (e.g. agent-facing notifications) that must show
  // under Digital, not B&M, regardless of their source tab.
  const BM_CHANNELS = ['SMS','WhatsApp'];
  const DIGITAL_CHANNELS = ['Email','Push','InApp','In-App','In-app'];
  if(activeAudience==='bm') data = data.filter(d=>BM_CHANNELS.indexOf(d.channel)!==-1);
  if(activeAudience==='digital') data = data.filter(d=>DIGITAL_CHANNELS.indexOf(d.channel)!==-1);
  return data;
}

