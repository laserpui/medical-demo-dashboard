const DEVICES = [
  { id: 'density', name: 'Density', color: '#23c7d9', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRtWX2GnAXFnXfLreNePepS_lUTvYRzGHCM58Dd29CqD5KsxlW_T5eqvL8jslpFltMGkoenkLB6aCNe/pub?output=csv', usage: [[6,7],[8,9],[10,11],[12,13],[14,15],[16,17]] },
  { id: 'linearZ', name: 'Linear Z', color: '#8b7cf6', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR0CtN1J7s2cHRBDZjLiTTOxXaFxJfIrNJt1ESRxWnpMCoVaIhEIRNoRnmbEqnQ8Hk9nynTrxkuMgDs/pub?output=csv', usage: [[6,7],[8,9],[10,11],[12,13]] },
  { id: 'ultracel', name: 'UltraCel Q+', color: '#f3b64b', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQrpHdDGieF5VGy375jUukb7CDav18UQiAvCnvpFq3tdNj5CO5TBe5EdBcftaE3Jc_BXF8bky2e27uK/pub?output=csv', usage: [[6,7],[8,9],[10,11],[12,13],[14,15],[16,17],[18,19],[20,21],[22,23],[24,25],[26,27],[28,29],[30,31],[32,33],[34,35],[36,37]] },
  { id: 'virtue', name: 'Virtue RF', color: '#43d5a5', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjIokyxDc1h0KqgSCcPC539iy4YDE3DiPydMPFvx27aSFagG_EG3SdOB3sj6w7qh0ewqP5poz9SgVT/pub?output=csv', usage: [[6,7],[8,9],[10,11],[12,13],[14,15],[16,17]] }
];
const PRODUCT_URL = 'https://docs.google.com/spreadsheets/d/1JuneOZnbJJ_r7JdNW6Rnd-LZcQ9sAAPb__VVSc4ZtbY/export?format=csv&gid=1031226843';

const state = {
  records: [], filtered: [], selected: new Set(DEVICES.map(d => d.id)),
  start: null, end: null, maxDate: null, charts: {}, currentView: 'analytics',
  recordPage: 1, pageSize: 25, sort: { key: 'date', direction: -1 }, search: '',
  products: [], productHeaders: [], productFiltered: [], productPage: 1, productsLoaded: false
};
const $ = (id) => document.getElementById(id);
const fmt = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 });
const fmt1 = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 1 });
const thaiDate = new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short', year: '2-digit' });
const monthFmt = new Intl.DateTimeFormat('th-TH', { month: 'short', year: '2-digit' });

document.addEventListener('DOMContentLoaded', init);

function init() {
  renderDeviceChips();
  bindEvents();
  Chart.defaults.color = '#8293a7';
  Chart.defaults.borderColor = 'rgba(148,163,184,.09)';
  Chart.defaults.font.family = "'IBM Plex Sans Thai', sans-serif";
  loadAllData();
}

function bindEvents() {
  document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)));
  $('filterToggle').addEventListener('click', () => $('filterPanel').classList.toggle('collapsed'));
  $('mobileNavBtn').addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('open'));
  $('refreshBtn').addEventListener('click', loadAllData);
  $('resetFilters').addEventListener('click', resetFilters);
  $('periodPreset').addEventListener('change', () => applyPreset($('periodPreset').value));
  $('dateStart').addEventListener('change', onCustomDate);
  $('dateEnd').addEventListener('change', onCustomDate);
  $('topMetric').addEventListener('change', renderAnalytics);
  $('clearChartFilter').addEventListener('click', () => { state.selected = new Set(DEVICES.map(d => d.id)); syncDeviceChips(); applyFilters(); });
  $('recordSearch').addEventListener('input', debounce(e => { state.search = e.target.value.trim().toLowerCase(); state.recordPage = 1; renderRecords(); }, 180));
  document.querySelectorAll('.records-table th[data-sort]').forEach(th => th.addEventListener('click', () => setSort(th.dataset.sort)));
  $('prevPage').addEventListener('click', () => { state.recordPage--; renderRecords(); });
  $('nextPage').addEventListener('click', () => { state.recordPage++; renderRecords(); });
  $('exportRecords').addEventListener('click', exportRecords);
  $('productSearch').addEventListener('input', debounce(() => { state.productPage = 1; filterProducts(); }, 180));
  $('prevProductPage').addEventListener('click', () => { state.productPage--; renderProducts(); });
  $('nextProductPage').addEventListener('click', () => { state.productPage++; renderProducts(); });
  $('exportProducts').addEventListener('click', exportProducts);
}

async function loadAllData() {
  const screen = $('loadingScreen');
  screen.classList.remove('done');
  $('syncDot').className = 'status-dot'; $('syncLabel').textContent = 'กำลังเชื่อมต่อ';
  let completed = 0;
  try {
    const results = await Promise.all(DEVICES.map(async device => {
      try { return await fetchDevice(device); }
      finally { completed++; $('loadingText').textContent = `อ่านข้อมูลแล้ว ${completed} / ${DEVICES.length} แหล่ง`; }
    }));
    state.records = results.flat();
    state.maxDate = state.records.reduce((max, r) => r.date && (!max || r.date > max) ? r.date : max, null);
    applyPreset($('periodPreset').value, false);
    $('syncDot').className = 'status-dot online'; $('syncLabel').textContent = 'ข้อมูลพร้อมใช้';
    $('syncTime').textContent = `อัปเดต ${new Date().toLocaleTimeString('th-TH', {hour:'2-digit',minute:'2-digit'})} น.`;
    toast(`โหลดข้อมูลสำเร็จ ${fmt.format(state.records.length)} รายการ`);
  } catch (error) {
    console.error(error);
    $('syncDot').className = 'status-dot error'; $('syncLabel').textContent = 'เชื่อมต่อไม่สมบูรณ์';
    $('loadingText').textContent = 'ไม่สามารถอ่านข้อมูลได้ กรุณาลองใหม่';
  } finally {
    setTimeout(() => screen.classList.add('done'), 350);
  }
}

async function fetchDevice(device) {
  const csv = await fetchCsv(device.url);
  const parsed = Papa.parse(csv, { skipEmptyLines: 'greedy' });
  const rows = parsed.data || [];
  if (rows.length < 2) return [];
  const headers = rows[0].map(v => String(v || '').trim());
  const dateIdx = findHeader(headers, [/วันที่ส่ง/, /วันที่/, /date/i]);
  const clinicIdx = findHeader(headers, [/ลูกค้า/, /คลินิก/, /สถานพยาบาล/, /customer/i]);
  const repIdx = findHeader(headers, [/ตัวแทน/, /ผู้แทน/, /เซลล์/, /sale/i]);
  const purposeIdx = findHeader(headers, [/จุดประสงค์/, /วัตถุประสงค์/, /purpose/i]);
  return rows.slice(1).filter(row => row.some(v => String(v || '').trim())).map((row, index) => {
    const usage = device.usage.reduce((sum, [before, after]) => {
      const b = numeric(row[before]), a = numeric(row[after]);
      return sum + (Number.isFinite(b) && Number.isFinite(a) ? Math.abs(a - b) : 0);
    }, 0);
    return {
      id: `${device.id}-${index}`, device: device.id, deviceName: device.name, color: device.color,
      date: parseDate(row[dateIdx]), clinic: clean(row[clinicIdx]) || 'ไม่ระบุคลินิก',
      representative: clean(row[repIdx]) || '—', purpose: clean(row[purposeIdx]) || '—',
      usage, raw: row, headers
    };
  });
}

async function fetchCsv(url) {
  const sources = [url, `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, `https://corsproxy.io/?${encodeURIComponent(url)}`];
  let lastError;
  for (const source of sources) {
    try {
      const response = await fetch(source, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      if (!text.trim() || /^\s*</.test(text)) throw new Error('รูปแบบข้อมูลไม่ถูกต้อง');
      return text;
    } catch (error) { lastError = error; }
  }
  throw lastError || new Error('Fetch failed');
}

function parseDate(value) {
  if (!value) return null;
  const source = String(value).trim().split(/[ T]/)[0];
  let match = source.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (match) {
    let [, day, month, year] = match.map(Number);
    if (year < 100) year += year > 60 ? 1900 : 2000;
    if (year > 2400) year -= 543;
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function findHeader(headers, patterns) { for (const pattern of patterns) { const found = headers.findIndex(h => pattern.test(h)); if (found >= 0) return found; } return -1; }
function clean(value) { return value == null ? '' : String(value).trim(); }
function numeric(value) { const result = parseFloat(String(value ?? '').replace(/[^0-9.-]/g, '')); return Number.isFinite(result) ? result : NaN; }
function dateInput(date) { return date ? `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` : ''; }

function renderDeviceChips() {
  $('deviceChips').innerHTML = DEVICES.map(d => `<button class="device-chip active" data-device="${d.id}" style="--chip-color:${d.color}"><span style="background:${d.color}"></span>${d.name}</button>`).join('');
  document.querySelectorAll('.device-chip').forEach(chip => chip.addEventListener('click', () => {
    const id = chip.dataset.device;
    if (state.selected.has(id) && state.selected.size === 1) return toast('ต้องเลือกอย่างน้อย 1 เครื่อง');
    state.selected.has(id) ? state.selected.delete(id) : state.selected.add(id);
    syncDeviceChips(); applyFilters();
  }));
}
function syncDeviceChips() { document.querySelectorAll('.device-chip').forEach(c => c.classList.toggle('active', state.selected.has(c.dataset.device))); }

function applyPreset(value, update = true) {
  if (!state.maxDate) return applyFilters();
  let start = null, end = endOfDay(state.maxDate);
  if (value === 'ytd') start = new Date(end.getFullYear(), 0, 1);
  else if (value !== 'all' && value !== 'custom') { start = new Date(end); start.setDate(start.getDate() - Number(value) + 1); start.setHours(0,0,0,0); }
  else if (value === 'custom') return;
  state.start = start; state.end = value === 'all' ? null : end;
  $('dateStart').value = dateInput(state.start); $('dateEnd').value = dateInput(state.end);
  if (update) applyFilters(); else applyFilters();
}
function onCustomDate() {
  $('periodPreset').value = 'custom';
  state.start = $('dateStart').value ? new Date(`${$('dateStart').value}T00:00:00`) : null;
  state.end = $('dateEnd').value ? endOfDay(new Date(`${$('dateEnd').value}T00:00:00`)) : null;
  applyFilters();
}
function resetFilters() { state.selected = new Set(DEVICES.map(d => d.id)); syncDeviceChips(); $('periodPreset').value = '365'; applyPreset('365'); }
function endOfDay(date) { const d = new Date(date); d.setHours(23,59,59,999); return d; }

function applyFilters() {
  state.filtered = state.records.filter(r => state.selected.has(r.device) && (!state.start || (r.date && r.date >= state.start)) && (!state.end || (r.date && r.date <= state.end)));
  state.recordPage = 1;
  const activeCount = (DEVICES.length - state.selected.size) + (state.start || state.end ? 1 : 0);
  $('filterBadge').textContent = activeCount; $('filterBadge').classList.toggle('show', activeCount > 0);
  $('navRecordCount').textContent = fmt.format(state.filtered.length);
  renderAnalytics(); renderRecords();
}

function aggregate(records) {
  const clinics = new Map(); let usage = 0;
  records.forEach(r => { usage += r.usage; const key = r.clinic.toLowerCase(); clinics.set(key, (clinics.get(key) || 0) + 1); });
  const repeat = [...clinics.values()].filter(v => v > 1).length;
  return { count: records.length, usage, average: records.length ? usage / records.length : 0, clinics: clinics.size, repeatRate: clinics.size ? repeat / clinics.size * 100 : 0 };
}
function previousRecords() {
  if (!state.start || !state.end) return null;
  const duration = state.end.getTime() - state.start.getTime() + 1;
  const prevEnd = new Date(state.start.getTime() - 1), prevStart = new Date(prevEnd.getTime() - duration + 1);
  return state.records.filter(r => state.selected.has(r.device) && r.date && r.date >= prevStart && r.date <= prevEnd);
}

function renderAnalytics() {
  const current = aggregate(state.filtered), previousList = previousRecords(), previous = previousList ? aggregate(previousList) : null;
  $('kpiDemos').textContent = fmt.format(current.count); $('kpiUsage').textContent = fmt.format(current.usage);
  $('kpiAverage').textContent = fmt.format(current.average); $('kpiClinics').textContent = fmt.format(current.clinics);
  $('repeatRate').textContent = `อัตรากลับมาใช้ซ้ำ ${fmt1.format(current.repeatRate)}%`;
  renderDelta('deltaDemos', current.count, previous?.count); renderDelta('deltaUsage', current.usage, previous?.usage);
  renderDelta('deltaAverage', current.average, previous?.average); renderDelta('deltaClinics', current.clinics, previous?.clinics);
  renderTrend(); renderDeviceMix(); renderClinics(); renderWeekdays(); renderScorecard(previousList); renderQuality(); renderInsight(current);
}

function renderDelta(id, current, previous) {
  const el = $(id);
  if (previous == null) { el.className = 'delta neutral'; el.textContent = 'ตลอดช่วงข้อมูลที่เลือก'; return; }
  if (!previous) { el.className = 'delta positive'; el.innerHTML = '<i class="ph ph-trend-up"></i> เริ่มมีข้อมูลในช่วงนี้'; return; }
  const pct = (current - previous) / previous * 100, positive = pct >= 0;
  el.className = `delta ${positive ? 'positive' : 'negative'}`;
  el.innerHTML = `<i class="ph ph-trend-${positive ? 'up' : 'down'}"></i> ${positive ? '+' : ''}${fmt1.format(pct)}% จากช่วงก่อน`;
}

function renderTrend() {
  const buckets = new Map();
  state.filtered.filter(r => r.date).forEach(r => {
    const key = `${r.date.getFullYear()}-${String(r.date.getMonth()+1).padStart(2,'0')}`;
    if (!buckets.has(key)) buckets.set(key, { date: new Date(r.date.getFullYear(), r.date.getMonth(), 1), count: 0, usage: 0 });
    const b = buckets.get(key); b.count++; b.usage += r.usage;
  });
  const values = [...buckets.values()].sort((a,b) => a.date-b.date);
  chart('trendChart', { type:'line', data:{ labels:values.map(v=>monthFmt.format(v.date)), datasets:[
    {label:'Demo',data:values.map(v=>v.count),borderColor:'#23c7d9',backgroundColor:'rgba(35,199,217,.08)',fill:true,tension:.35,pointRadius:2,yAxisID:'y'},
    {label:'Consumer',data:values.map(v=>v.usage),borderColor:'#8b7cf6',backgroundColor:'transparent',tension:.35,pointRadius:2,borderDash:[5,4],yAxisID:'y1'}]},
    options:{interaction:{mode:'index',intersect:false},plugins:{legend:{display:false}},scales:{x:{grid:{display:false}},y:{beginAtZero:true,title:{display:true,text:'Demo'},ticks:{precision:0}},y1:{beginAtZero:true,position:'right',grid:{drawOnChartArea:false},title:{display:true,text:'Consumer'}}}}
  });
  spark('sparkDemos', values.map(v=>v.count), '#23c7d9'); spark('sparkUsage', values.map(v=>v.usage), '#8b7cf6');
}

function renderDeviceMix() {
  const values = DEVICES.filter(d => state.selected.has(d.id)).map(d => ({...d, count:state.filtered.filter(r=>r.device===d.id).length}));
  $('donutTotal').textContent = fmt.format(values.reduce((s,v)=>s+v.count,0));
  chart('deviceChart', {type:'doughnut',data:{labels:values.map(v=>v.name),datasets:[{data:values.map(v=>v.count),backgroundColor:values.map(v=>v.color),borderWidth:0,hoverOffset:5}]},options:{cutout:'72%',plugins:{legend:{position:'bottom',labels:{usePointStyle:true,boxWidth:6,padding:14,font:{size:9}}}},onClick:(_,elements)=>{if(!elements.length)return;state.selected=new Set([values[elements[0].index].id]);syncDeviceChips();applyFilters();}}});
}

function clinicGroups() {
  const groups = new Map(); state.filtered.forEach(r=>{const key=r.clinic;const item=groups.get(key)||{name:key,count:0,usage:0};item.count++;item.usage+=r.usage;groups.set(key,item);}); return [...groups.values()];
}
function renderClinics() {
  const metric = $('topMetric').value, values = clinicGroups().sort((a,b)=>b[metric]-a[metric]).slice(0,7).reverse();
  chart('clinicChart',{type:'bar',data:{labels:values.map(v=>truncate(v.name,22)),datasets:[{data:values.map(v=>v[metric]),backgroundColor:'rgba(139,124,246,.75)',borderRadius:5,barThickness:13}]},options:{indexAxis:'y',plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${metric==='usage'?'Consumer':'Demo'}: ${fmt.format(c.raw)}`}}},scales:{x:{beginAtZero:true,grid:{color:'rgba(148,163,184,.07)'},ticks:{precision:0}},y:{grid:{display:false}}}}});
}
function renderWeekdays() {
  const days=['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'],values=Array(7).fill(0);state.filtered.forEach(r=>{if(r.date)values[r.date.getDay()]++;});
  chart('weekdayChart',{type:'bar',data:{labels:days,datasets:[{data:values,backgroundColor:values.map((_,i)=>i===values.indexOf(Math.max(...values))?'#23c7d9':'rgba(35,199,217,.22)'),borderRadius:5}]},options:{plugins:{legend:{display:false}},scales:{x:{grid:{display:false}},y:{beginAtZero:true,ticks:{precision:0}}}}});
}

function renderScorecard(previousList) {
  const total = state.filtered.length || 1;
  $('scorecardBody').innerHTML = DEVICES.filter(d=>state.selected.has(d.id)).map(d=>{
    const rows=state.filtered.filter(r=>r.device===d.id),a=aggregate(rows),prev=previousList?aggregate(previousList.filter(r=>r.device===d.id)):null;
    const pct=prev&&prev.count?(a.count-prev.count)/prev.count*100:null;
    return `<tr><td><div class="device-cell"><span style="background:${d.color}"></span>${d.name}</div></td><td>${fmt.format(a.count)}</td><td>${fmt.format(a.usage)}</td><td>${fmt.format(a.average)}</td><td>${fmt1.format(a.count/total*100)}%</td><td>${pct==null?'<span class="trend-pill">—</span>':`<span class="trend-pill ${pct<0?'down':''}">${pct>=0?'+':''}${fmt1.format(pct)}%</span>`}</td></tr>`;
  }).join('');
}

function renderQuality() {
  const relevant=state.records.filter(r=>state.selected.has(r.device)),total=relevant.length||1;
  const items=[{icon:'ph-calendar-x',name:'วันที่ไม่สมบูรณ์',count:relevant.filter(r=>!r.date).length},{icon:'ph-buildings',name:'ไม่ระบุคลินิก',count:relevant.filter(r=>r.clinic==='ไม่ระบุคลินิก').length},{icon:'ph-lightning-slash',name:'Consumer เป็นศูนย์',count:relevant.filter(r=>r.usage===0).length}];
  const critical=items[0].count+items[1].count,score=Math.max(0,100-critical/total*100);
  $('qualityScore').textContent=`${fmt1.format(score)}%`; $('qualityScore').style.color=score>=90?'var(--mint)':score>=70?'var(--amber)':'var(--danger)';
  $('qualityItems').innerHTML=items.map(item=>{const pct=item.count/total*100;return `<div class="quality-row"><i class="ph ${item.icon}"></i><div><b>${item.name}</b><small>${fmt1.format(pct)}% ของข้อมูล</small><div class="quality-bar"><em style="width:${Math.min(100,100-pct)}%"></em></div></div><span>${fmt.format(item.count)}</span></div>`}).join('');
}
function renderInsight(metrics) {
  if(!metrics.count){$('insightText').textContent='ไม่พบข้อมูลในช่วงและเครื่องมือที่เลือก';return;}
  const devices=DEVICES.map(d=>({name:d.name,count:state.filtered.filter(r=>r.device===d.id).length})).sort((a,b)=>b.count-a.count),clinics=clinicGroups().sort((a,b)=>b.usage-a.usage);
  const concentration=metrics.usage&&clinics.length?clinics.slice(0,5).reduce((s,c)=>s+c.usage,0)/metrics.usage*100:0;
  $('insightText').textContent=`${devices[0].name} มี Demo มากที่สุด ${fmt.format(devices[0].count)} ครั้ง · Top 5 คลินิกคิดเป็น ${fmt1.format(concentration)}% ของ Consumer · คลินิกกลับมาใช้ซ้ำ ${fmt1.format(metrics.repeatRate)}%`;
}

function chart(id, config) { if(state.charts[id])state.charts[id].destroy();config.options={responsive:true,maintainAspectRatio:false,...config.options};state.charts[id]=new Chart($(id),config); }
function spark(id,data,color){chart(id,{type:'line',data:{labels:data.map((_,i)=>i),datasets:[{data,borderColor:color,borderWidth:1.5,pointRadius:0,tension:.35,fill:false}]},options:{events:[],plugins:{legend:{display:false},tooltip:{enabled:false}},scales:{x:{display:false},y:{display:false}}}});}

function switchView(view) {
  state.currentView=view; document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view)); document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  $(`${view}View`).classList.add('active'); document.querySelector('.sidebar').classList.remove('open');
  const isProductView = view === 'products';
  $('filterPanel').classList.toggle('hidden', isProductView); $('filterToggle').classList.toggle('hidden', isProductView);
  const titles={analytics:'ภาพรวมประสิทธิภาพ Demo',records:'รายการ Demo ทั้งหมด',products:'ฐานข้อมูลผลิตภัณฑ์'}; $('pageTitle').textContent=titles[view];
  if(view==='products'&&!state.productsLoaded)loadProducts();
  if(view==='analytics')setTimeout(()=>Object.values(state.charts).forEach(c=>c.resize()),50);
}

function recordSearchResults() {
  let data=state.filtered;
  if(state.search)data=data.filter(r=>[r.deviceName,r.clinic,r.representative,r.purpose].some(v=>String(v).toLowerCase().includes(state.search)));
  const {key,direction}=state.sort; return [...data].sort((a,b)=>compare(a[key],b[key])*direction);
}
function compare(a,b){if(a==null)return 1;if(b==null)return-1;if(a instanceof Date)return a-b;if(typeof a==='number')return a-b;return String(a).localeCompare(String(b),'th');}
function setSort(key){if(state.sort.key===key)state.sort.direction*=-1;else state.sort={key,direction:1};state.recordPage=1;renderRecords();}
function renderRecords() {
  const data=recordSearchResults(),pages=Math.max(1,Math.ceil(data.length/state.pageSize));state.recordPage=Math.min(state.recordPage,pages);const start=(state.recordPage-1)*state.pageSize,rows=data.slice(start,start+state.pageSize);
  $('recordsBody').innerHTML=rows.map(r=>`<tr><td>${r.date?thaiDate.format(r.date):'<span class="delta negative">ไม่ระบุ</span>'}</td><td><span class="device-badge" style="color:${r.color};border-color:${r.color}55;background:${r.color}0c">${escapeHtml(r.deviceName)}</span></td><td>${escapeHtml(r.clinic)}</td><td>${escapeHtml(r.representative)}</td><td>${escapeHtml(r.purpose)}</td><td class="num">${fmt.format(r.usage)}</td></tr>`).join('');
  $('recordEmpty').classList.toggle('hidden',data.length>0);$('recordSummary').textContent=`${fmt.format(data.length)} รายการ`;$('pageInfo').textContent=`หน้า ${state.recordPage} / ${pages}`;$('prevPage').disabled=state.recordPage<=1;$('nextPage').disabled=state.recordPage>=pages;
}

async function loadProducts() {
  $('productStatus').textContent='กำลังโหลดข้อมูลผลิตภัณฑ์…';
  try{const csv=await fetchCsv(PRODUCT_URL),parsed=Papa.parse(csv,{skipEmptyLines:'greedy'}).data||[];state.productHeaders=(parsed.shift()||[]).map(clean);state.products=parsed;state.productsLoaded=true;filterProducts();$('productStatus').textContent=`โหลดแล้ว ${fmt.format(state.products.length)} รายการ · อัปเดต ${new Date().toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'})} น.`;}catch(e){console.error(e);$('productStatus').textContent='ไม่สามารถโหลดข้อมูลผลิตภัณฑ์ได้ กรุณากดอัปเดตแล้วลองอีกครั้ง';}
}
function filterProducts(){const term=$('productSearch').value.trim().toLowerCase();state.productFiltered=term?state.products.filter(row=>row.some(cell=>String(cell||'').toLowerCase().includes(term))):state.products;renderProducts();}
function renderProducts(){const pages=Math.max(1,Math.ceil(state.productFiltered.length/state.pageSize));state.productPage=Math.min(state.productPage,pages);const start=(state.productPage-1)*state.pageSize,rows=state.productFiltered.slice(start,start+state.pageSize);$('productHead').innerHTML=`<tr>${state.productHeaders.map(h=>`<th>${escapeHtml(h||'—')}</th>`).join('')}</tr>`;$('productBody').innerHTML=rows.map(row=>`<tr>${state.productHeaders.map((_,i)=>`<td>${formatCell(row[i])}</td>`).join('')}</tr>`).join('');$('productPageInfo').textContent=`หน้า ${state.productPage} / ${pages} · ${fmt.format(state.productFiltered.length)} รายการ`;$('prevProductPage').disabled=state.productPage<=1;$('nextProductPage').disabled=state.productPage>=pages;}
function formatCell(value){const text=clean(value)||'—';if(/^https?:\/\//i.test(text))return `<a href="${escapeAttr(text)}" target="_blank" rel="noopener">เปิดลิงก์ <i class="ph ph-arrow-square-out"></i></a>`;return escapeHtml(text);}

function exportRecords(){const rows=recordSearchResults().map(r=>[r.date?dateInput(r.date):'',r.deviceName,r.clinic,r.representative,r.purpose,r.usage]);downloadCsv(`medical-demo-${dateInput(new Date())}.csv`,[['วันที่','เครื่อง','คลินิก/ลูกค้า','ผู้แทน','จุดประสงค์','Consumer'],...rows]);}
function exportProducts(){downloadCsv(`medical-products-${dateInput(new Date())}.csv`,[state.productHeaders,...state.productFiltered]);}
function downloadCsv(filename,rows){if(!rows.length)return toast('ไม่มีข้อมูลสำหรับ Export');const csv=Papa.unparse(rows),blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);toast('สร้างไฟล์ CSV แล้ว');}

function toast(message){const el=$('toast');el.querySelector('span').textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2600);}
function truncate(value,length){const text=String(value||'');return text.length>length?text.slice(0,length-1)+'…':text;}
function escapeHtml(value){return String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function escapeAttr(value){return escapeHtml(value);}
function debounce(fn,delay){let timer;return(...args)=>{clearTimeout(timer);timer=setTimeout(()=>fn(...args),delay);};}
