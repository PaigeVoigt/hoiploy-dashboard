/* ============================================================
   Hoi P'loy — Business Intelligence Dashboard
   Section-based: Overview · Categories · Products · Price Tier ·
   Sales Type · Customers. Reads data/sales_data.csv (the Cin7
   "Sales Data" tab) or embedded data in the standalone build.
   Financial year: March → February.
   ============================================================ */

/* ---------- Brand palette ---------- */
const C = {
  brass:'#B8894B', brassL:'#E7D3AD', teal:'#3E6B63', tealD:'#2C4E48',
  sage:'#8FA79E', blush:'#B58A94', blushD:'#8F636E', ink:'#2B2926',
  ink2:'#6B6459', line:'#E7DFD2', pos:'#3E6B63', neg:'#B4553F'
};
const CAT_COLORS = ['#B8894B','#3E6B63','#B58A94','#8FA79E','#C9A24B','#6E8B82',
  '#A9707B','#7C93B0','#CDA86A','#4F6E66','#9C7C8A','#B9925E','#5E7D75','#C7B27E',
  '#8A6D5A','#647C74'];
const TIER_COLORS = {Retail:C.teal, Trade:C.brass, Wholesale:C.blush};
const TYPE_COLORS = {OTC:C.brass, Online:C.teal, Other:C.sage};

/* ---------- Formatting ---------- */
const fmtR  = (v)=> 'R ' + Math.round(v).toLocaleString('en-ZA');
const fmtRc = (v)=>{ const a=Math.abs(v);
  if(a>=1e6) return 'R '+(v/1e6).toFixed(2)+'m';
  if(a>=1e3) return 'R '+(v/1e3).toFixed(1)+'k';
  return 'R '+Math.round(v); };
const fmtPct  = (v,d=1)=> (v*100).toFixed(d)+'%';
const fmtPP   = (v,d=1)=> (v>=0?'+':'')+(v*100).toFixed(d)+' pp';
const fmtGrow = (v,d=1)=> v===null?'—':((v>=0?'+':'')+(v*100).toFixed(d)+'%');
const num = (x)=>{ if(x==null) return 0; const s=String(x).replace(/[R,\s%]/g,'').trim();
  const n=parseFloat(s); return isNaN(n)?0:n; };

/* ---------- Financial year ---------- */
const FY_MONTHS = [3,4,5,6,7,8,9,10,11,12,1,2];
const MABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MNAME = {january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,
  september:9,october:10,november:11,december:12};
const fyOf = (y,m)=> m>=3 ? y+1 : y;
const fyLabel = (fe)=> `FY ${String(fe-1).slice(2)}/${String(fe).slice(2)}`;
const key = (y,m)=> y*100+m;
const fyMonthList = (fe)=> FY_MONTHS.map((m,i)=>({order:i, m, y:(m>=3?fe-1:fe)}));

/* ---------- Metric & dimension meta ---------- */
const METRICS = {
  sales:{field:'sales', label:'Revenue',        color:C.brass},
  cogs: {field:'cogs',  label:'Cost of Sales',  color:C.blush},
  gp:   {field:'gp',    label:'Gross Profit',   color:C.teal},
};
const DIMS = {
  category:{field:'category', label:'Category',   page:'Categories', plural:'categories',  topN:14},
  product: {field:'product',  label:'Product',    page:'Products',   plural:'products',    topN:15},
  tier:    {field:'tier',     label:'Price Tier', page:'Price Tier', plural:'price tiers', topN:3, colors:TIER_COLORS},
  saleType:{field:'saleType', label:'Sale Type',  page:'Sale Type',  plural:'sale types',  topN:3, colors:TYPE_COLORS},
};
const esc=(s)=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
// Discount lines are not real products — excluded from all per-product breakdowns
const DISCOUNT = new Set(['Discount','DiscountAdjustment','Discount Adjustment']);

/* Reusable searchable multi-select. onChange(selectedArray) fires on every change. */
function MultiSelect(host, opts){
  host.classList.add('ms');
  host.innerHTML = `<button class="ms-btn" type="button"><span class="ms-lab"></span><span class="ms-caret">▾</span></button>
    <div class="ms-panel" hidden><input class="ms-search" placeholder="Search…">
    <label class="ms-all"><input type="checkbox" class="ms-allcb"> Select all</label>
    <div class="ms-list"></div></div>`;
  const btn=host.querySelector('.ms-btn'), panel=host.querySelector('.ms-panel'),
        lab=host.querySelector('.ms-lab'), search=host.querySelector('.ms-search'),
        listEl=host.querySelector('.ms-list'), allcb=host.querySelector('.ms-allcb');
  let options=opts.options||[], selected=new Set(opts.selected||[]);
  const allLabel=opts.allLabel||'All';
  const summary=()=> selected.size===0?allLabel : (selected.size===1?[...selected][0] : selected.size+' selected');
  const sync=()=>{ lab.textContent=summary(); };
  function renderList(){
    const q=search.value.trim().toLowerCase();
    const vis=options.filter(o=>!q||o.label.toLowerCase().includes(q));
    listEl.innerHTML = vis.length? vis.map(o=>`<label class="ms-opt"><input type="checkbox" data-v="${esc(o.value)}" ${selected.has(o.value)?'checked':''}> ${esc(o.label)}</label>`).join('')
      : `<div class="ms-empty">No matches</div>`;
    listEl.querySelectorAll('input').forEach(cb=> cb.onchange=()=>{
      cb.checked?selected.add(cb.dataset.v):selected.delete(cb.dataset.v); sync(); allcb.checked=selected.size===options.length&&options.length>0; opts.onChange([...selected]); });
    allcb.checked = options.length>0 && selected.size===options.length;
  }
  btn.onclick=(e)=>{ e.stopPropagation(); const willOpen=panel.hidden;
    document.querySelectorAll('.ms-panel').forEach(p=>p.hidden=true);
    panel.hidden=!willOpen; if(willOpen){ search.value=''; renderList(); search.focus(); } };
  search.oninput=renderList;
  allcb.onchange=()=>{ if(allcb.checked) options.forEach(o=>selected.add(o.value)); else selected.clear(); renderList(); sync(); opts.onChange([...selected]); };
  panel.onclick=(e)=>e.stopPropagation();
  document.addEventListener('click',()=>{ panel.hidden=true; });
  sync();
  return {
    setOptions(newOpts,keep){ options=newOpts;
      selected = keep ? new Set([...selected].filter(v=>options.some(o=>o.value===v))) : new Set();
      sync(); },
    setSelected(arr){ selected=new Set(arr); sync(); },
    get(){ return [...selected]; }
  };
}

/* ---------- State ---------- */
let DATA=[], DATA_KEYS=new Set();
let FY_END=null, COMPARE=true, FYS=[];
// A financial year needs at least this many line items to appear in the selector.
// Filters out stub years made only of stray old-dated credit notes (e.g. FY 22/23).
const MIN_FY_ROWS = 200;
let SECTION='overview', DIM='category', METRIC='sales', MONTH=null, GP_PRIOR_YEARS=0;
let ITEMS=[], SHOW_ALL=false, PRIOR_YEARS=0;
let CUST_MONTH=null, CUST_SEL=[], CUST_SHOW_ALL=false, CUST_PRIOR=0;
let itemMS=null, custMS=null;
const charts={};

/* ---------- Load ---------- */
function parseDate(s){ if(!s) return null; s=String(s).trim();
  let m=s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/); if(m) return {y:+m[1],mo:+m[2]};
  m=s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/); if(m){ let a=+m[1],b=+m[2];
    return a>12?{y:+m[3],mo:b}:{y:+m[3],mo:a}; } return null; }
function normalize(r){
  const gv=(k)=> r[k] ?? r[k.trim()] ?? '';
  let y=null,mo=null; const d=parseDate(gv('Invoice Date'));
  if(d){y=d.y;mo=d.mo;}
  if(y===null){const yy=parseInt(num(gv('Year'))); if(yy)y=yy;}
  if(mo===null){const mn=String(gv('Month')).trim().toLowerCase(); if(MNAME[mn])mo=MNAME[mn];}
  return { order:String(gv('Order #')||gv('Order Number')||'').trim(),
    customer:String(gv('Customer')||'').trim(),
    product:String(gv('Product')||'').trim(),
    category:String(gv('Category')||'').trim()||'(uncategorised)',
    tier:String(gv('Price Tier')||'').trim()||'(none)',
    saleType:String(gv('Sale Type')||'').trim()||'(none)',
    y, mo, qty:num(gv('Quantity')),
    sales:num(gv('Sales Value (ZAR)')), cogs:num(gv('COGS (ZAR)')), gp:num(gv('Gross Profit (ZAR)')),
    _k:(y&&mo)?key(y,mo):null };
}
function ingest(res){
  DATA = res.data.map(normalize).filter(r=>r._k);
  DATA_KEYS = new Set(DATA.map(r=>r._k));
  boot();
}
function loadCSV(){
  const embed=document.getElementById('embeddedData');
  if(embed && embed.textContent.trim().length){
    ingest(Papa.parse(embed.textContent.trim(),{header:true,skipEmptyLines:true})); return;
  }
  Papa.parse('data/sales_data.csv?_='+Date.now(),{download:true,header:true,skipEmptyLines:true,
    complete:ingest,
    error:()=>{document.getElementById('loading').textContent=
      'Could not load data/sales_data.csv — open dashboard.html, or run start.command.';}});
}

/* ---------- Windows / filtering ---------- */
function windowFor(fe){
  const list=fyMonthList(fe); let cap=-1;
  for(const o of list) if(DATA_KEYS.has(key(o.y,o.m))) cap=Math.max(cap,o.order);
  if(cap<0) cap=0;
  return {list, cap, cur:list.slice(0,cap+1), prior:fyMonthList(fe-1).slice(0,cap+1)};
}
const setFrom = (mos)=> new Set(mos.map(o=>key(o.y,o.m)));
function rowsFor(winSet, extra){ return DATA.filter(r=> winSet.has(r._k) && (!extra || extra(r))); }

/* ---------- Aggregation ---------- */
function totals(rs){ let s=0,c=0,g=0; const cu=new Set(),od=new Set();
  for(const r of rs){s+=r.sales;c+=r.cogs;g+=r.gp; if(r.customer)cu.add(r.customer); if(r.order)od.add(r.order);}
  return {sales:s,cogs:c,gp:g,gpPct:s?g/s:0,customers:cu.size,orders:od.size}; }
function groupBy(rs, field){ const m=new Map();
  for(const r of rs){
    if(field==='product' && DISCOUNT.has(r.product)) continue;   // not a real product
    const k=r[field]||'(none)'; let o=m.get(k);
    if(!o){o={key:k,sales:0,cogs:0,gp:0,cu:new Set(),od:new Set()};m.set(k,o);}
    o.sales+=r.sales;o.cogs+=r.cogs;o.gp+=r.gp; if(r.customer)o.cu.add(r.customer); if(r.order)o.od.add(r.order);}
  return [...m.values()].map(o=>({key:o.key,sales:o.sales,cogs:o.cogs,gp:o.gp,
    gpPct:o.sales?o.gp/o.sales:0,customers:o.cu.size,orders:o.od.size})); }
const growth = (c,p)=> (p && Math.abs(p)>1e-9) ? (c-p)/Math.abs(p) : null;

/* ---------- Boot ---------- */
function boot(){
  const fyCounts={};
  DATA.forEach(r=>{ const fe=fyOf(r.y,r.mo); if(fe) fyCounts[fe]=(fyCounts[fe]||0)+1; });
  FYS=Object.keys(fyCounts).map(Number).filter(fe=>fyCounts[fe]>=MIN_FY_ROWS).sort((a,b)=>a-b);
  FY_END=FYS[FYS.length-1];
  const sel=document.getElementById('fySel');
  sel.innerHTML=FYS.slice().reverse().map(fe=>`<option value="${fe}">${fyLabel(fe)}</option>`).join('');
  sel.value=FY_END;
  sel.onchange=()=>{FY_END=+sel.value; MONTH=null; CUST_MONTH=null; CUST_SEL=[]; ITEMS=[]; buildMonthPickers(); buildPriorPickers(); buildItemPicker(); buildCustPicker(); renderCurrent();};
  document.getElementById('cmpToggle').onchange=(e)=>{COMPARE=e.target.checked; renderCurrent();};

  // nav
  document.querySelectorAll('#sectionnav .navbtn').forEach(b=> b.onclick=()=>{
    document.querySelectorAll('#sectionnav .navbtn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); SECTION=b.dataset.sec;
    if(b.dataset.dim && b.dataset.dim!==DIM){ DIM=b.dataset.dim; ITEMS=[]; SHOW_ALL=false; PRIOR_YEARS=0; GP_PRIOR_YEARS=0;
      document.getElementById('showAllToggle').checked=false; document.getElementById('monthlyPriorSel').value='0';
      document.getElementById('gpPriorSel').value='0'; buildItemPicker(); }
    showSection(); });

  // dim controls
  document.querySelectorAll('#metricSeg .seg').forEach(b=> b.onclick=()=>{
    document.querySelectorAll('#metricSeg .seg').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); METRIC=b.dataset.m; renderDim(); });
  document.getElementById('showAllToggle').onchange=(e)=>{ SHOW_ALL=e.target.checked; renderDim(); };
  document.getElementById('monthlyPriorSel').onchange=(e)=>{ PRIOR_YEARS=+e.target.value; renderDim(); };
  document.getElementById('monthSel').onchange=(e)=>{ MONTH = e.target.value==='ytd'?null:+e.target.value; renderDim(); };
  document.getElementById('gpPriorSel').onchange=(e)=>{ GP_PRIOR_YEARS=+e.target.value; renderDim(); };
  document.getElementById('custMonthSel').onchange=(e)=>{ CUST_MONTH = e.target.value==='ytd'?null:+e.target.value; buildCustPicker(); renderCustomers(); };
  document.getElementById('custShowAll').onchange=(e)=>{ CUST_SHOW_ALL=e.target.checked; renderCustomers(); };

  initCharts();
  window.addEventListener('resize', ()=>Object.values(charts).forEach(c=>c&&c.resize()));
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>Object.values(charts).forEach(c=>c&&c.resize()));

  document.getElementById('loading').style.display='none';
  buildMonthPickers();
  buildPriorPickers();
  buildItemPicker();
  buildCustPicker();
  showSection();
  document.getElementById('foot').textContent =
    `Hoi P'loy · ${DATA.length.toLocaleString()} line items · source: Cin7 “Sales Data”`;
}
function initCharts(){
  ['ovTrend','ovCatRev','ovProd','ovTier','ovType','ovCust','dimRank','dimMonthly','dimGpPct','custRank','custTier','custType','custCat']
    .forEach(id=>{ const el=document.getElementById(id); if(el) charts[id]=echarts.init(el); });
  const ro=new ResizeObserver(()=>Object.values(charts).forEach(c=>c&&c.resize()));
  ['ovTrend','ovCatRev','ovProd','dimRank','dimMonthly','dimGpPct','custRank'].forEach(id=>{ const el=document.getElementById(id); if(el) ro.observe(el); });
}
function buildMonthPickers(){
  const w=windowFor(FY_END);
  const opts='<option value="ytd">Year to date</option>'+
    w.cur.map(o=>`<option value="${o.order}">${MABBR[o.m-1]} ${o.y}</option>`).join('');
  const ms=document.getElementById('monthSel'); ms.innerHTML=opts; ms.value='ytd';
  const cs=document.getElementById('custMonthSel'); cs.innerHTML=opts; cs.value='ytd';
}
function buildItemPicker(){
  const D=DIMS[DIM];
  const g=groupBy(rowsFor(setFrom(windowFor(FY_END).cur)),D.field).filter(d=>d.sales>0).sort((a,b)=>b.sales-a.sales);
  const options=g.map(d=>({value:d.key,label:d.key}));
  document.getElementById('itemLabel').textContent=D.label;
  itemMS = MultiSelect(document.getElementById('itemMs'),
    {options, selected:ITEMS, allLabel:`All ${D.plural}`,
     onChange:(sel)=>{ ITEMS=sel; renderDim(); }});
}
function buildCustPicker(){
  const {set}=custWindowSet();
  const g=groupBy(rowsFor(set),'customer').filter(d=>d.sales>0).sort((a,b)=>b.sales-a.sales);
  const options=g.map(d=>({value:d.key,label:d.key}));
  custMS = MultiSelect(document.getElementById('custMs'),
    {options, selected:CUST_SEL, allLabel:'All customers',
     onChange:(sel)=>{ CUST_SEL=sel; renderCustomers(); }});
}
function buildPriorPickers(){
  const fys=FYS.filter(f=>f<FY_END).sort((a,b)=>b-a);
  const maxP=Math.min(fys.length, 5);
  let opts='<option value="0">This year only</option>';
  for(let k=1;k<=maxP;k++) opts+=`<option value="${k}">+ prior ${k===1?'year':k+' years'}</option>`;
  const sel=document.getElementById('monthlyPriorSel');
  const cur=Math.min(PRIOR_YEARS,maxP); sel.innerHTML=opts; sel.value=String(cur); PRIOR_YEARS=cur;
  const gsel=document.getElementById('gpPriorSel');
  const gcur=Math.min(GP_PRIOR_YEARS,maxP); gsel.innerHTML=opts; gsel.value=String(gcur); GP_PRIOR_YEARS=gcur;
}
function setHeight(id,px){ const el=document.getElementById(id); el.style.height=px+'px';
  if(charts[id]) charts[id].resize(); }

/* ---------- Section routing ---------- */
function showSection(){
  document.getElementById('sec-overview').style.display = SECTION==='overview'?'block':'none';
  document.getElementById('sec-dim').style.display      = SECTION==='dim'?'block':'none';
  document.getElementById('sec-customers').style.display= SECTION==='customers'?'block':'none';
  renderCurrent();
  requestAnimationFrame(()=>Object.values(charts).forEach(c=>c&&c.resize()));
}
function renderCurrent(){
  const w=windowFor(FY_END);
  document.getElementById('asof').textContent='YTD: '+periodLabel(w);
  if(SECTION==='overview') renderOverview(w);
  else if(SECTION==='dim') renderDim();
  else renderCustomers();
}
function periodLabel(w){ const a=w.cur[0], b=w.cur[w.cur.length-1];
  return `1 ${MABBR[a.m-1]} ${a.y} – end ${MABBR[b.m-1]} ${b.y}`; }

/* ============================================================
   OVERVIEW
   ============================================================ */
function renderOverview(w){
  const curSet=setFrom(w.cur), priSet=setFrom(w.prior);
  const c=totals(rowsFor(curSet)), p=totals(rowsFor(priSet));
  const cards=[
    {cls:'',label:'YTD Sales',val:fmtRc(c.sales),g:growth(c.sales,p.sales),prior:fmtRc(p.sales)},
    {cls:'k-cos',label:'YTD Cost of Sales',val:fmtRc(c.cogs),g:growth(c.cogs,p.cogs),prior:fmtRc(p.cogs),inv:true},
    {cls:'k-gp',label:'YTD Gross Profit',val:fmtRc(c.gp),g:growth(c.gp,p.gp),prior:fmtRc(p.gp)},
    {cls:'k-gpm',label:'YTD GP Margin',val:fmtPct(c.gpPct),g:c.gpPct-p.gpPct,prior:fmtPct(p.gpPct),pp:true},
    {cls:'k-cust',label:'YTD Customers',val:c.customers.toLocaleString(),g:growth(c.customers,p.customers),prior:p.customers.toLocaleString()},
  ];
  document.getElementById('kpis').innerHTML=cards.map(k=>kpiHtml(k)).join('');
  renderOvTrend(w);
  ovBar('ovCatRev','category',curSet,14,{dim:'category'});
  ovBar('ovProd','product',curSet,14,{dim:'product'});
  ovDonut('ovTier','tier',curSet,TIER_COLORS,{dim:'tier'});
  ovDonut('ovType','saleType',curSet,TYPE_COLORS,{dim:'saleType'});
  ovBar('ovCust','customer',curSet,10,{sec:'customers'});
}
function goTo(t){
  const btn = t.sec==='customers'
    ? document.querySelector('.navbtn[data-sec="customers"]')
    : document.querySelector('.navbtn[data-dim="'+t.dim+'"]');
  if(btn){ btn.click(); window.scrollTo(0,0); }
}
function ovBar(id,field,curSet,topN,target){
  let g=groupBy(rowsFor(curSet),field).filter(d=>d.sales>0).sort((a,b)=>a.sales-b.sales);
  if(g.length>topN) g=g.slice(g.length-topN);
  const isCust=field==='customer';
  charts[id].setOption({
    grid:{left:8,right:70,top:8,bottom:20,containLabel:true},
    tooltip:{trigger:'item',formatter:(p)=>{const d=g[p.dataIndex];
      return `<b>${d.key}</b><br/>Sales: <b>${fmtR(d.sales)}</b><br/>GP: ${fmtR(d.gp)} (${fmtPct(d.gpPct)})`;}},
    xAxis:{type:'value',axisLabel:{color:C.ink2,formatter:fmtRc,hideOverlap:true},splitLine:{lineStyle:{color:C.line}}},
    yAxis:{type:'category',data:g.map(d=>d.key.length>24?d.key.slice(0,23)+'…':d.key),
      axisTick:{show:false},axisLine:{lineStyle:{color:C.line}},axisLabel:{color:C.ink,fontSize:10.5}},
    series:[{type:'bar',data:g.map((d,i)=>({value:+d.sales.toFixed(0),
      itemStyle:{color:isCust?C.sage:(field==='product'?C.blush:C.brass),borderRadius:[0,4,4,0]}})),
      label:{show:true,position:'right',color:C.ink2,fontSize:10,formatter:(p)=>fmtRc(p.value)}}]
  }, true);
  if(target){ const zr=charts[id].getZr(); zr.off('click'); zr.on('click',()=>goTo(target)); }
}
function kpiHtml(k){
  let d='';
  if(COMPARE && k.g!==null){ const favUp=k.inv?(k.g<0):(k.g>0); const cls=favUp?'up':'down';
    const arrow=k.g>0?'▲':(k.g<0?'▼':'—'); const txt=k.pp?fmtPP(k.g):fmtGrow(k.g);
    d=`<span class="delta ${cls}">${arrow} ${txt}</span>`; }
  return `<div class="kpi ${k.cls}"><div class="label">${k.label}</div>
    <div class="value">${k.val}</div>
    ${COMPARE?`<div class="compare">${d}<span class="prior">vs ${k.prior} prior yr</span></div>`
             :`<div class="compare"><span class="prior">&nbsp;</span></div>`}</div>`;
}
function renderOvTrend(w){
  const cats=w.list.map(o=>MABBR[o.m-1]);
  const mk=(mos)=> mos.map(o=>totals(DATA.filter(r=>r._k===key(o.y,o.m))));
  const cur=mk(w.list), pri=mk(fyMonthList(FY_END-1)); const cap=w.cap;
  const sales=cur.map((t,i)=>i<=cap?+t.sales.toFixed(0):null);
  const priSales=pri.map((t,i)=>i<=cap?+t.sales.toFixed(0):null);
  const gpPct=cur.map((t,i)=>i<=cap&&t.sales?+(t.gp/t.sales*100).toFixed(1):null);
  const priPct=pri.map(t=>t.sales?+(t.gp/t.sales*100).toFixed(1):null);
  const series=[
    {name:'Sales',type:'bar',data:sales,itemStyle:{color:C.brass,borderRadius:[4,4,0,0]},barGap:'10%'},
  ];
  if(COMPARE) series.push({name:'Sales (prior yr)',type:'bar',data:priSales,
    itemStyle:{color:C.brassL,borderRadius:[4,4,0,0]}});
  series.push({name:'GP Margin %',type:'line',yAxisIndex:1,data:gpPct,smooth:true,lineStyle:{color:C.tealD,width:3},
     itemStyle:{color:C.tealD},symbol:'circle',symbolSize:8,z:5,
     label:{show:true,formatter:(p)=>p.value+'%',color:C.tealD,fontSize:10,position:'top'}});
  if(COMPARE) series.push({name:'GP Margin % (prior yr)',type:'line',yAxisIndex:1,data:priPct,smooth:true,
    lineStyle:{color:C.sage,width:2,type:'dashed'},itemStyle:{color:C.sage},symbol:'none'});
  charts.ovTrend.setOption({
    grid:{left:64,right:56,top:44,bottom:30},
    legend:{top:6,textStyle:{color:C.ink2,fontSize:11},itemWidth:12,itemHeight:8},
    tooltip:{trigger:'axis',axisPointer:{type:'shadow'},formatter:(ps)=>{ const i=ps[0].dataIndex; const o=w.list[i];
      const t=cur[i]; let s=`<b>${MABBR[o.m-1]} ${o.y}</b><br/>Sales: <b>${fmtR(t.sales)}</b><br/>`+
        `Gross Profit: ${fmtR(t.gp)}<br/>GP Margin: <b>${t.sales?(t.gp/t.sales*100).toFixed(1)+'%':'—'}</b>`;
      if(COMPARE&&priPct[i]!=null) s+=`<br/><span style="color:${C.ink2}">Prior-yr margin: ${priPct[i]}%</span>`; return s; }},
    xAxis:{type:'category',data:cats,axisLine:{lineStyle:{color:C.line}},axisLabel:{color:C.ink2}},
    yAxis:[{type:'value',axisLabel:{color:C.ink2,formatter:fmtRc},splitLine:{lineStyle:{color:C.line}}},
           {type:'value',min:0,max:100,axisLabel:{color:C.tealD,formatter:'{value}%'},splitLine:{show:false}}],
    series
  });
  document.getElementById('ovTrendSub').textContent=`${fyLabel(FY_END)} · sales bars + GP margin % line${COMPARE?' · this year vs prior year':''}`;
}
function ovDonut(id,field,curSet,colors,target){
  const g=groupBy(rowsFor(curSet),field).filter(d=>d.sales>0).sort((a,b)=>b.sales-a.sales);
  const total=g.reduce((s,d)=>s+d.sales,0);
  charts[id].setOption({
    tooltip:{trigger:'item',formatter:(p)=>{const d=g[p.dataIndex];
      return `<b>${d.key}</b><br/>Sales: <b>${fmtR(d.sales)}</b> (${fmtPct(d.sales/total,1)})<br/>GP: ${fmtR(d.gp)} (${fmtPct(d.gpPct)})`;}},
    legend:{bottom:0,textStyle:{color:C.ink2,fontSize:11},itemWidth:11,itemHeight:11},
    series:[{type:'pie',radius:['52%','74%'],center:['50%','44%'],
      data:g.map(d=>({name:d.key,value:+d.sales.toFixed(0),itemStyle:{color:colors[d.key]||C.sage}})),
      label:{formatter:(p)=>`${p.name}\n${fmtPct(p.value/total,0)}`,color:C.ink,fontSize:11},
      labelLine:{length:8,length2:8}}]
  });
  if(target){ const zr=charts[id].getZr(); zr.off('click'); zr.on('click',()=>goTo(target)); }
}

/* ============================================================
   DIMENSION SECTION (category / product / tier / saleType)
   ============================================================ */
function dimWindowSet(){ const w=windowFor(FY_END);
  if(MONTH===null) return {set:setFrom(w.cur), label:'YTD'};
  const o=w.list[MONTH]; return {set:new Set([key(o.y,o.m)]), label:`${MABBR[o.m-1]} ${o.y}`}; }
function colorFor(dim, keyName, i){ const D=DIMS[dim];
  return D.colors ? (D.colors[keyName]||C.sage) : CAT_COLORS[i%CAT_COLORS.length]; }

function renderDim(){
  const D=DIMS[DIM], M=METRICS[METRIC];
  document.getElementById('dimTitle').textContent = D.page;
  // Top chart is ALWAYS the ranking across all items — a specific selection
  // only refocuses the two lower charts.
  document.getElementById('dimRankTitle').textContent = `${M.label} by ${D.label}`;
  renderDimRank(D,M);
  if(ITEMS.length){
    const sl = ITEMS.length===1?ITEMS[0]:`${ITEMS.length} ${D.plural}`;
    document.getElementById('dimMonthlyTitle').textContent= `${M.label} per month — ${sl}`;
    document.getElementById('dimGpTitle').textContent     = `GP Margin per month — ${sl}`;
    renderItemMonthly(D,M);
    renderItemGp(D,M);
  } else {
    document.getElementById('dimMonthlyTitle').textContent= `${M.label} by ${D.label}, per month`;
    document.getElementById('dimGpTitle').textContent     = `Gross Profit Margin by ${D.label}`;
    renderDimMonthly(D,M);
    renderDimGpPct(D);
  }
}
const monthSum=(y,m,field,pred)=>{ const k=key(y,m); let s=0; for(const r of DATA){ if(r._k===k && (!pred||pred(r))) s+=r[field]; } return s; };
function renderDimRank(D,M){
  const {set,label}=dimWindowSet();
  let g=groupBy(rowsFor(set),D.field).filter(d=>d[M.field]!==0).sort((a,b)=>a[M.field]-b[M.field]);
  const all = SHOW_ALL || !!D.colors;
  if(!all && g.length>D.topN) g=g.slice(g.length-D.topN);
  setHeight('dimRank', (all && g.length>14) ? Math.max(360, g.length*24+50) : 360);
  const data=g.map((d)=>({value:+d[M.field].toFixed(0),
    itemStyle:{color: D.colors?(D.colors[d.key]||C.sage):M.color, borderRadius:[0,4,4,0],
      opacity:(ITEMS.length && !ITEMS.includes(d.key))?0.4:1}, _d:d}));
  charts.dimRank.setOption({
    grid:{left:8,right:74,top:10,bottom:24,containLabel:true},
    tooltip:{trigger:'item',formatter:(p)=>{const d=p.data._d;
      return `<b>${d.key}</b><br/>${M.label}: <b>${fmtR(d[M.field])}</b><br/>Sales: ${fmtR(d.sales)} · GP ${fmtPct(d.gpPct)}<br/>Orders: ${d.orders} · Customers: ${d.customers}`;}},
    xAxis:{type:'value',axisLabel:{color:C.ink2,formatter:fmtRc,hideOverlap:true},splitLine:{lineStyle:{color:C.line}}},
    yAxis:{type:'category',data:g.map(d=>d.key),axisTick:{show:false},axisLine:{lineStyle:{color:C.line}},
      axisLabel:{color:C.ink,fontSize:11,formatter:(v)=>v.length>26?v.slice(0,25)+'…':v}},
    series:[{type:'bar',data,label:{show:true,position:'right',color:C.ink2,fontSize:10,formatter:(p)=>fmtRc(p.value)}}]
  }, true);
  document.getElementById('dimRankSub').textContent=`${label} · ${all?`all ${g.length}`:`top ${Math.min(D.topN,g.length)}`} by ${M.label.toLowerCase()} · click a bar to focus it below`;
  charts.dimRank.off('click');
  charts.dimRank.on('click',(p)=>{ const k=(p.data&&p.data._d)?p.data._d.key:p.name;
    ITEMS = ITEMS.includes(k) ? ITEMS.filter(x=>x!==k) : ITEMS.concat([k]);
    if(itemMS) itemMS.setSelected(ITEMS); renderDim(); });
}
function renderDimMonthly(D,M){
  const w=windowFor(FY_END); const months=w.cur;
  let tot=groupBy(rowsFor(setFrom(w.cur)),D.field).sort((a,b)=>b[M.field]-a[M.field]);
  const N = D.colors?tot.length:Math.min(8,tot.length);
  const topKeys=tot.slice(0,N).map(d=>d.key); const hasOther = !D.colors && tot.length>N;
  const keys = hasOther? topKeys.concat(['Other']) : topKeys;
  const opac=[1,0.55,0.32];
  const series=[];
  for(let d=0; d<=PRIOR_YEARS; d++){
    const list=fyMonthList(FY_END-d).slice(0,w.cap+1);
    const perMonth=list.map(o=>{ const rs=DATA.filter(r=>r._k===key(o.y,o.m));
      const row={}; let other=0;
      for(const gg of groupBy(rs,D.field)){ if(topKeys.includes(gg.key)) row[gg.key]=gg[M.field]; else other+=gg[M.field]; }
      if(hasOther) row['Other']=other; return {row, y:o.y}; });
    keys.forEach((k,i)=> series.push({ name:k, type:'bar', stack:'y'+d,
      itemStyle:{color: k==='Other'?'#CFC6B6':colorFor(DIM,k,i), opacity:opac[d]||0.3},
      data:months.map((o,mi)=>({ value:+((perMonth[mi].row[k]||0).toFixed(0)), cat:k, ml:MABBR[o.m-1], yr:perMonth[mi].y })) }));
  }
  const multi = PRIOR_YEARS>0;
  charts.dimMonthly.setOption({
    grid:{left:60,right:14,top:34,bottom:26},
    legend:{type:'scroll',top:4,data:keys,textStyle:{color:C.ink2,fontSize:10},itemWidth:10,itemHeight:8},
    tooltip: multi
      ? {trigger:'item',formatter:(p)=>`<b>${p.data.cat}</b><br/>${p.data.ml} ${p.data.yr}: ${fmtR(p.value)}`}
      : {trigger:'axis',axisPointer:{type:'shadow'},formatter:(ps)=>{ const o=months[ps[0].dataIndex];
          let s=`<b>${MABBR[o.m-1]} ${o.y}</b>`;
          ps.slice().reverse().filter(p=>p.value>0).forEach(p=> s+=`<br/>${p.marker}${p.data.cat}: ${fmtR(p.value)}`); return s; }},
    xAxis:{type:'category',data:months.map(o=>MABBR[o.m-1]),axisLine:{lineStyle:{color:C.line}},axisLabel:{color:C.ink2}},
    yAxis:{type:'value',axisLabel:{color:C.ink2,formatter:fmtRc},splitLine:{lineStyle:{color:C.line}}},
    series
  }, true);
  const yr=(d)=>`${FY_END-d-1}/${String(FY_END-d).slice(2)}`;
  const cmp = PRIOR_YEARS===1?` · solid = this year, faded = ${yr(1)}`
            : PRIOR_YEARS===2?` · solid = this year, faded = ${yr(1)} & ${yr(2)}` : '';
  document.getElementById('dimMonthlySub').textContent =
    `${M.label} split by ${D.label.toLowerCase()} each month${hasOther?` · top ${N} + Other`:''}${cmp}`;
}
function renderDimGpPct(D){
  const w=windowFor(FY_END);
  let g=groupBy(rowsFor(setFrom(w.cur)),D.field).filter(d=>d.sales>0).sort((a,b)=>a.gpPct-b.gpPct);
  const all = SHOW_ALL || !!D.colors;
  if(!all && g.length>D.topN) g=g.slice(g.length-D.topN);
  setHeight('dimGpPct', (all && g.length>14) ? Math.max(360, g.length*24+50) : 360);
  const ramp=(v)=> v>=0.7?C.teal : v>=0.5?C.sage : v>=0.3?C.brass : C.neg;
  // prior-year GP% maps per year offset
  const priMaps=[]; for(let d=1; d<=GP_PRIOR_YEARS; d++){
    const wl=fyMonthList(FY_END-d).slice(0,w.cap+1);
    priMaps[d]=new Map(groupBy(rowsFor(setFrom(wl)),D.field).map(x=>[x.key,x.gpPct])); }
  const opac=[1,0.6,0.35,0.25,0.18];
  const series=[{name:'This year',type:'bar',
    data:g.map(d=>({value:+d.gpPct.toFixed(4),itemStyle:{color:ramp(d.gpPct),borderRadius:[0,4,4,0]}})),
    label:{show:GP_PRIOR_YEARS===0,position:'right',color:C.ink2,fontSize:10,formatter:(p)=>fmtPct(p.value)}}];
  for(let d=1; d<=GP_PRIOR_YEARS; d++) series.push({name:fyLabel(FY_END-d),type:'bar',
    data:g.map(x=>{const pv=priMaps[d].get(x.key); return pv==null?null:+pv.toFixed(4);}),
    itemStyle:{color:C.brass,opacity:opac[d]||0.15,borderRadius:[0,4,4,0]}});
  const multi=GP_PRIOR_YEARS>0;
  charts.dimGpPct.setOption({
    grid:{left:8,right:64,top:multi?26:10,bottom:24,containLabel:true},
    legend:multi?{top:2,textStyle:{color:C.ink2,fontSize:11},itemWidth:12,itemHeight:8}:{show:false},
    tooltip:{trigger:'item',formatter:(p)=>{const d=g[p.dataIndex];
      let s=`<b>${d.key}</b><br/>${p.seriesName} GP margin: <b>${fmtPct(p.value)}</b>`;
      if(p.seriesIndex===0){ s+=`<br/>GP: ${fmtR(d.gp)} · Sales: ${fmtR(d.sales)}`;
        if(multi){ const pv=priMaps[1].get(d.key); if(pv!=null) s+=`<br/><span style="color:${C.ink2}">vs ${fyLabel(FY_END-1)}: ${fmtPct(pv)} (${fmtPP(d.gpPct-pv)})</span>`; } }
      return s;}},
    xAxis:{type:'value',max:1,axisLabel:{color:C.ink2,formatter:(v)=>Math.round(v*100)+'%'},splitLine:{lineStyle:{color:C.line}}},
    yAxis:{type:'category',data:g.map(d=>d.key),axisTick:{show:false},axisLine:{lineStyle:{color:C.line}},
      axisLabel:{color:C.ink,fontSize:11,formatter:(v)=>v.length>26?v.slice(0,25)+'…':v}},
    series
  }, true);
}
const itemColour=(D,it,idx)=> (D.colors&&D.colors[it]) ? D.colors[it] : CAT_COLORS[idx%CAT_COLORS.length];
function renderItemMonthly(D,M){
  const w=windowFor(FY_END); const months=w.cur;
  const single=ITEMS.length===1; const opac=[1,0.55,0.32,0.22]; const series=[];
  if(single){
    const inItem=(r)=> r[D.field]===ITEMS[0];
    for(let d=0; d<=PRIOR_YEARS; d++){ const list=fyMonthList(FY_END-d).slice(0,w.cap+1);
      series.push({ name:d===0?'This year':fyLabel(FY_END-d), type:'bar', barGap:'10%',
        itemStyle:{color:d===0?M.color:C.brass, opacity:opac[d]||0.2, borderRadius:[4,4,0,0]},
        data:list.map(o=>+monthSum(o.y,o.m,M.field,inItem).toFixed(0)) }); }
  } else {  // multiple items — one coloured series per item
    ITEMS.forEach((it,idx)=>{ const col=itemColour(D,it,idx); const inThis=(r)=> r[D.field]===it;
      for(let d=0; d<=PRIOR_YEARS; d++){ const list=fyMonthList(FY_END-d).slice(0,w.cap+1);
        series.push({ name:it, type:'bar', barGap:'10%',
          itemStyle:{color:col, opacity:opac[d]||0.2, borderRadius:[4,4,0,0]},
          data:list.map(o=>+monthSum(o.y,o.m,M.field,inThis).toFixed(0)) }); }
    });
  }
  const showLeg=series.length>1;
  charts.dimMonthly.setOption({
    grid:{left:60,right:14,top:showLeg?30:16,bottom:26},
    legend:showLeg?{type:'scroll',top:4,textStyle:{color:C.ink2,fontSize:11},itemWidth:12,itemHeight:8}:{show:false},
    tooltip:{trigger:'axis',axisPointer:{type:'shadow'},formatter:(ps)=>{const o=months[ps[0].dataIndex];
      let s=`<b>${MABBR[o.m-1]}</b>`; ps.forEach(p=>s+=`<br/>${p.marker}${p.seriesName}: ${fmtR(p.value)}`); return s;}},
    xAxis:{type:'category',data:months.map(o=>MABBR[o.m-1]),axisLine:{lineStyle:{color:C.line}},axisLabel:{color:C.ink2}},
    yAxis:{type:'value',axisLabel:{color:C.ink2,formatter:fmtRc},splitLine:{lineStyle:{color:C.line}}},
    series
  }, true);
  const sl=single?ITEMS[0]:`${ITEMS.length} ${D.plural}`;
  document.getElementById('dimMonthlySub').textContent=`${M.label} per month — ${sl}${PRIOR_YEARS>0?' · vs prior year'+(PRIOR_YEARS>1?'s':''):''}`;
}
function renderItemGp(D,M){
  const w=windowFor(FY_END); const months=w.cur; setHeight('dimGpPct',360);
  const single=ITEMS.length===1;
  const gpFor=(pred,d)=>{ const pl=fyMonthList(FY_END-d).slice(0,w.cap+1);
    return pl.map(o=>{const t=totals(DATA.filter(r=>r._k===key(o.y,o.m)&&pred(r))); return t.sales?+(t.gp/t.sales*100).toFixed(1):null;}); };
  const priColors=[C.sage,C.brass,C.blush,C.ink2];
  const s3=[];
  if(single){
    const inItem=(r)=> r[D.field]===ITEMS[0];
    s3.push({name:'This year',type:'line',data:gpFor(inItem,0),smooth:true,lineStyle:{color:C.tealD,width:3},itemStyle:{color:C.tealD},
      symbol:'circle',symbolSize:7,label:{show:GP_PRIOR_YEARS===0,formatter:(p)=>p.value==null?'':p.value+'%',color:C.tealD,fontSize:10,position:'top'}});
    for(let d=1; d<=GP_PRIOR_YEARS; d++) s3.push({name:fyLabel(FY_END-d),type:'line',data:gpFor(inItem,d),smooth:true,
      lineStyle:{color:priColors[d-1]||C.ink2,width:2,type:'dashed'},itemStyle:{color:priColors[d-1]||C.ink2},symbol:'none'});
  } else {  // multiple items — one coloured line per item
    ITEMS.forEach((it,idx)=>{ const col=itemColour(D,it,idx); const inThis=(r)=> r[D.field]===it;
      s3.push({name:it,type:'line',data:gpFor(inThis,0),smooth:true,lineStyle:{color:col,width:3},itemStyle:{color:col},symbol:'circle',symbolSize:6});
      for(let d=1; d<=GP_PRIOR_YEARS; d++) s3.push({name:it,type:'line',data:gpFor(inThis,d),smooth:true,
        lineStyle:{color:col,width:2,type:'dashed',opacity:0.6},itemStyle:{color:col},symbol:'none'});
    });
  }
  const showLeg=s3.length>1;
  charts.dimGpPct.setOption({
    grid:{left:48,right:20,top:showLeg?30:16,bottom:26},
    legend:showLeg?{type:'scroll',top:4,textStyle:{color:C.ink2,fontSize:11},itemWidth:12,itemHeight:8}:{show:false},
    tooltip:{trigger:'axis',formatter:(ps)=>{const o=months[ps[0].dataIndex];
      let s=`<b>${MABBR[o.m-1]} ${o.y}</b>`; ps.forEach(p=>s+=`<br/>${p.marker}${p.seriesName}: ${p.value==null?'—':p.value+'%'}`); return s;}},
    xAxis:{type:'category',data:months.map(o=>MABBR[o.m-1]),axisLine:{lineStyle:{color:C.line}},axisLabel:{color:C.ink2}},
    yAxis:{type:'value',min:0,max:100,axisLabel:{color:C.ink2,formatter:'{value}%'},splitLine:{lineStyle:{color:C.line}}},
    series:s3
  }, true);
}

/* ============================================================
   CUSTOMERS
   ============================================================ */
function custWindowSet(){ const w=windowFor(FY_END);
  if(CUST_MONTH===null) return {set:setFrom(w.cur), prior:setFrom(w.prior), label:'YTD'};
  const o=w.list[CUST_MONTH]; const po=fyMonthList(FY_END-1)[CUST_MONTH];
  return {set:new Set([key(o.y,o.m)]), prior:new Set([key(po.y,po.m)]), label:`${MABBR[o.m-1]} ${o.y}`}; }
function renderCustomers(){
  const {set,prior,label}=custWindowSet();
  const rs=rowsFor(set); const c=totals(rs); const p=totals(rowsFor(prior));
  document.getElementById('custKpis').innerHTML=[
    {cls:'k-cust',label:`Customers · ${label}`,val:c.customers.toLocaleString(),g:growth(c.customers,p.customers),prior:p.customers.toLocaleString()},
    {cls:'',label:'Revenue',val:fmtRc(c.sales),g:growth(c.sales,p.sales),prior:fmtRc(p.sales)},
    {cls:'k-gp',label:'Avg Revenue / Customer',val:fmtRc(c.customers?c.sales/c.customers:0),
      g:growth(c.customers?c.sales/c.customers:0, p.customers?p.sales/p.customers:0),
      prior:fmtRc(p.customers?p.sales/p.customers:0)},
  ].map(kpiHtml).join('');
  // ranking
  let g=groupBy(rs,'customer').filter(d=>d.sales>0).sort((a,b)=>a.sales-b.sales);
  if(!CUST_SHOW_ALL && g.length>15) g=g.slice(g.length-15);
  setHeight('custRank', (CUST_SHOW_ALL && g.length>18) ? Math.max(460, g.length*22+40) : 460);
  charts.custRank.setOption({
    grid:{left:8,right:70,top:8,bottom:20,containLabel:true},
    tooltip:{trigger:'item',formatter:(p)=>{const d=p.data._d;
      return `<b>${d.key}</b><br/>Revenue: <b>${fmtR(d.sales)}</b><br/>GP: ${fmtR(d.gp)} (${fmtPct(d.gpPct)}) · Orders: ${d.orders}`;}},
    xAxis:{type:'value',axisLabel:{color:C.ink2,formatter:fmtRc,hideOverlap:true},splitLine:{lineStyle:{color:C.line}}},
    yAxis:{type:'category',data:g.map(d=>d.key.length>24?d.key.slice(0,23)+'…':d.key),
      axisTick:{show:false},axisLine:{lineStyle:{color:C.line}},axisLabel:{color:C.ink,fontSize:10.5}},
    series:[{type:'bar',data:g.map(d=>({value:+d.sales.toFixed(0),
      itemStyle:{color:C.sage,borderRadius:[0,4,4,0],opacity:(CUST_SEL.length&&!CUST_SEL.includes(d.key))?0.4:1},_d:d})),
      label:{show:true,position:'right',color:C.ink2,fontSize:10,formatter:(p)=>fmtRc(p.value)}}]
  }, true);
  charts.custRank.off('click');
  charts.custRank.on('click',(p)=>{ const k=p.data._d.key;
    CUST_SEL = CUST_SEL.includes(k)?CUST_SEL.filter(x=>x!==k):CUST_SEL.concat([k]);
    if(custMS) custMS.setSelected(CUST_SEL); renderCustomers(); });
  renderCustDrill(set,label);
}
function renderCustDrill(set,label){
  const body=document.getElementById('custDrillBody');
  if(!CUST_SEL.length){ document.getElementById('custDrillName').textContent='Select a customer';
    document.getElementById('custDrillSub').textContent='Their price tier, sale type and what they buy';
    body.className='drillempty'; body.textContent='Pick a customer above (or click a bar) to see their profile.';
    ['custTier','custType','custCat','custMon'].forEach(id=>charts[id]&&charts[id].dispose&&charts[id].dispose());
    ['custTier','custType','custCat','custMon'].forEach(id=>delete charts[id]); return; }
  const inSel=(r)=> CUST_SEL.includes(r.customer);
  const rs=DATA.filter(r=>set.has(r._k)&&inSel(r));
  const t=totals(rs);
  const name = CUST_SEL.length===1?CUST_SEL[0]:`${CUST_SEL.length} customers`;
  document.getElementById('custDrillName').textContent=name;
  document.getElementById('custDrillSub').textContent=`${label} · ${t.orders} order${t.orders!==1?'s':''}`;
  const tier=groupBy(rs,'tier').sort((a,b)=>b.sales-a.sales);
  const type=groupBy(rs,'saleType').sort((a,b)=>b.sales-a.sales);
  const topTier=tier[0]?tier[0].key:'—', topType=type[0]?type[0].key:'—';
  // compare options
  const fys=FYS.filter(f=>f<FY_END).sort((a,b)=>b-a);
  const maxP=Math.min(fys.length,5); CUST_PRIOR=Math.min(CUST_PRIOR,maxP);
  let cmpOpts='<option value="0">This year only</option>';
  for(let k=1;k<=maxP;k++) cmpOpts+=`<option value="${k}" ${k===CUST_PRIOR?'selected':''}>+ prior ${k===1?'year':k+' years'}</option>`;
  body.className='';
  body.innerHTML=`
    <div class="drill-stats">
      <div class="drill-stat"><div class="l">Revenue</div><div class="v">${fmtRc(t.sales)}</div></div>
      <div class="drill-stat"><div class="l">Gross Profit</div><div class="v">${fmtRc(t.gp)}</div></div>
      <div class="drill-stat"><div class="l">GP Margin</div><div class="v">${fmtPct(t.gpPct)}</div></div>
      <div class="drill-stat"><div class="l">Mostly</div><div class="v" style="font-size:14px">${topTier} · ${topType}</div></div>
    </div>
    <div class="drill-mini">
      <div><h4>By Price Tier</h4><div class="chart" id="custTier"></div></div>
      <div><h4>By Sale Type</h4><div class="chart" id="custType"></div></div>
    </div>
    <div class="drill-full">
      <div class="cardhead"><h4>Revenue per month</h4>
        <div class="control inline"><label for="custPriorSel">Compare</label><select id="custPriorSel">${cmpOpts}</select></div></div>
      <div class="chart" id="custMon"></div>
    </div>
    <div class="drill-full"><h4>Where their orders come from — top categories</h4><div class="chart" id="custCat"></div></div>`;
  ['custTier','custType','custCat','custMon'].forEach(id=>{ if(charts[id]&&charts[id].dispose)charts[id].dispose(); charts[id]=echarts.init(document.getElementById(id)); });
  miniDonut(charts.custTier,tier,TIER_COLORS);
  miniDonut(charts.custType,type,TYPE_COLORS);
  // monthly revenue with prior-year compare
  const w=windowFor(FY_END); const months=w.cur; const opac=[1,0.6,0.35]; const ms=[];
  for(let d=0; d<=CUST_PRIOR; d++){ const list=fyMonthList(FY_END-d).slice(0,w.cap+1);
    ms.push({ name:d===0?'This year':fyLabel(FY_END-d), type:'bar', barGap:'10%',
      itemStyle:{color:d===0?C.sage:C.brass, opacity:opac[d]||0.3, borderRadius:[4,4,0,0]},
      data:list.map(o=>+monthSum(o.y,o.m,'sales',inSel).toFixed(0)) }); }
  charts.custMon.setOption({ grid:{left:56,right:12,top:CUST_PRIOR?28:12,bottom:24},
    legend:CUST_PRIOR?{top:2,textStyle:{color:C.ink2,fontSize:10},itemWidth:10,itemHeight:8}:{show:false},
    tooltip:{trigger:'axis',formatter:(ps)=>{const o=months[ps[0].dataIndex]; let s=`<b>${MABBR[o.m-1]}</b>`;
      ps.forEach(p=>s+=`<br/>${p.marker}${p.seriesName}: ${fmtR(p.value)}`); return s;}},
    xAxis:{type:'category',data:months.map(o=>MABBR[o.m-1]),axisLine:{lineStyle:{color:C.line}},axisLabel:{color:C.ink2}},
    yAxis:{type:'value',axisLabel:{color:C.ink2,formatter:fmtRc},splitLine:{lineStyle:{color:C.line}}},
    series:ms }, true);
  document.getElementById('custPriorSel').onchange=(e)=>{ CUST_PRIOR=+e.target.value; renderCustDrill(set,label); };
  let cat=groupBy(rs,'category').filter(d=>d.sales>0).sort((a,b)=>a.sales-b.sales); if(cat.length>8)cat=cat.slice(cat.length-8);
  charts.custCat.setOption({ grid:{left:8,right:64,top:6,bottom:18,containLabel:true},
    tooltip:{trigger:'item',formatter:(p)=>{const d=cat[p.dataIndex];return `<b>${d.key}</b><br/>Revenue: ${fmtR(d.sales)} · GP ${fmtPct(d.gpPct)}`;}},
    xAxis:{type:'value',axisLabel:{color:C.ink2,formatter:fmtRc,hideOverlap:true},splitLine:{lineStyle:{color:C.line}}},
    yAxis:{type:'category',data:cat.map(d=>d.key),axisTick:{show:false},axisLine:{lineStyle:{color:C.line}},axisLabel:{color:C.ink,fontSize:10.5}},
    series:[{type:'bar',data:cat.map((d,i)=>({value:+d.sales.toFixed(0),itemStyle:{color:CAT_COLORS[i%CAT_COLORS.length],borderRadius:[0,3,3,0]}})),
      label:{show:true,position:'right',color:C.ink2,fontSize:9.5,formatter:(p)=>fmtRc(p.value)}}]});
  requestAnimationFrame(()=>{['custTier','custType','custCat','custMon'].forEach(id=>charts[id]&&charts[id].resize());});
}
function miniDonut(chart,g,colors){ const total=g.reduce((s,d)=>s+d.sales,0)||1;
  chart.setOption({ tooltip:{trigger:'item',formatter:(p)=>`<b>${p.name}</b><br/>${fmtR(p.value)} (${fmtPct(p.value/total,0)})`},
    series:[{type:'pie',radius:['48%','72%'],center:['50%','50%'],
      data:g.map(d=>({name:d.key,value:+d.sales.toFixed(0),itemStyle:{color:colors[d.key]||C.sage}})),
      label:{formatter:(p)=>`${p.name} ${fmtPct(p.value/total,0)}`,color:C.ink,fontSize:10},labelLine:{length:6,length2:6}}]}); }

/* ---------- go ---------- */
loadCSV();
