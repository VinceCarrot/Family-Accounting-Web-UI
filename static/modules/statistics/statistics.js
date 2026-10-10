

let initialized = false;
let pieChart = null;
let barChart = null;

// -------------------- 全局状态 --------------------
const state = {
  type: "Spend",           // spend | income
  period: "Month",         // year | month | week
  anchorDate: new Date(),  
  drillPath: ["Spend"],           // 当前 drill 路径
  view: "pie"              // pie | bar
};


function pad2(n){ return n.toString().padStart(2,'0'); }
function toISODate(d){ return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }


export async function initStatistics(){
  if(initialized) return;
  initialized=true;

  console.log('📊 Statistics init');

  const typeSelect = document.getElementById('sta-select-type');
  const accountSelect = document.getElementById('sta-select-account');
  const periodSelect = document.getElementById('sta-select-period');
  const anchorDateInput = document.getElementById('sta-select-anchor-date');

  const btnPie = document.getElementById("sta-btn-pie-view");
  const btnBar = document.getElementById("sta-btn-bar-view");
  const btnUp = document.getElementById("sta-btn-up");
  const btnTop = document.getElementById("sta-btn-top");

  

  /* =========================================================
    日期工具
  ========================================================= */
  function parseISO(s){
    const [y,m,d] = s.split("-").map(Number);
    return new Date(y,m-1,d);
  }

  function normalize(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function startOfWeekMonday(d){
    const dd = new Date(d);
    const day = dd.getDay();
    const diff = (day===0?-6:1-day);
    dd.setDate(dd.getDate()+diff);
    dd.setHours(0,0,0,0);
    return dd;
  }

  function endOfWeekSunday(d){
    const s = startOfWeekMonday(d);
    const e = new Date(s);
    e.setDate(e.getDate()+6);
    e.setHours(23,59,59,999);
    return e;
  }

  function pad2(n){ return n.toString().padStart(2,'0'); }
  function toISODate(d){ return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }

  function getRange(period, anchorDate){
    const a = new Date(anchorDate);
    a.setHours(0,0,0,0);
    if(period==="year") return {start:new Date(a.getFullYear(),0,1), end:new Date(a.getFullYear(),11,31,23,59,59,999)};
    if(period==="month") return {start:new Date(a.getFullYear(),a.getMonth(),1), end:new Date(a.getFullYear(),a.getMonth()+1,0,23,59,59,999)};
    return {start:startOfWeekMonday(a), end:endOfWeekSunday(a)};
  }

  function formatRange({start,end}){ 
    const f = d=>`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
    return `${f(start)} → ${f(end)}`;
  }


  /* =========================================================
    筛选工具
  ========================================================= */
  function getTransactionsByPeriod() {
    const period = periodSelect.value;          // year | month | week
    const anchorDateStr = anchorDateInput.value;   // YYYY-MM-DD

    if (!anchorDateStr) return [];

    let startDate = new Date(anchorDateStr);
    if (isNaN(startDate.getTime())) return [];

    // ---------- 计算 endDate ----------
    let endDate = new Date(startDate);

    switch (period) {
      case 'year':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;

      case 'month':
        endDate.setMonth(endDate.getMonth() + 1);
        break;

      case 'week':
        endDate.setDate(endDate.getDate() + 7);
        break;

      default:
        return [];
    }

    startDate = normalize(startDate);   
    endDate = normalize(endDate);

    const outputRecords = [];

    // ---------- 遍历月份 ----------
    for (const year in AppData.transactions) {
      for (const mm in AppData.transactions[year]) {

        const monthData = AppData.transactions[year][mm];

        if (!Array.isArray(monthData) || monthData.length === 0) continue;

        // 构造该月的时间范围
        let monthStart = new Date(`${year}-${mm}-01`);
        let monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);

        monthStart = normalize(monthStart);
        monthEnd = normalize(monthEnd);

        // ---------- 1️⃣ 判断是否有 overlap ----------
        
        if (monthEnd <= startDate || monthStart >= endDate) {
          continue; // 无重叠
        }
        
        // ---------- 2️⃣ 如果是 year 且整月被完全覆盖 ----------
        const monthFullyCovered =
          monthStart >= startDate && monthEnd <= endDate;

        if (monthFullyCovered) {
          // 直接批量加入
          outputRecords.push(...monthData);
        } else {
          // ---------- 3️⃣ 否则逐条判断 ----------
          for (const tx of monthData) {
           
            if (!tx.date) continue;

            let d = tx.date instanceof Date
              ? tx.date
              : new Date(tx.date);

            d = normalize(d);

            if (isNaN(d.getTime())) continue;

            if (d >= startDate && d < endDate) {
              outputRecords.push(tx);
            }
            

          }
        }
      }
    }

    return outputRecords;
  }


  function getTransactionsByType(transactions) {
    if (!Array.isArray(transactions)) return [];

    if (!typeSelect) return transactions;

    const selectedType = typeSelect.value;

    if (!selectedType || selectedType === 'all') {
      return transactions;
    }

    const outputRecords = [];

    for (const tx of transactions) {
      if (tx.l0_category.toLowerCase() === selectedType.toLowerCase()) {
        outputRecords.push(tx);
      }
    }

    return outputRecords;
  }

  function getTransactionsByAccount(transactions) {
    if (!Array.isArray(transactions)) return [];

    if (!accountSelect) return transactions;

    const selectedAccount = accountSelect.value;

    if (!selectedAccount || selectedAccount === 'All Accounts') {
      return transactions;
    }

    const outputRecords = [];

    for (const tx of transactions) {
      if (tx.account.toLowerCase() === selectedAccount.toLowerCase()) {
        outputRecords.push(tx);
      }
    }

    return outputRecords;
  }

  
  /* =========================================================
    分类工具
  ========================================================= */
  function getChildren(type, path){
    let node = AppData.categories.find(c => c.l0_name.toLowerCase() === type.toLowerCase());
    if(!node) return null;

    let children = node.l1_cats || [];

    if (path.length > 1){
      const selected_l1 = path[1];
      const found = children.find(c => c.l1_name.toLowerCase() === selected_l1.toLowerCase());
      
      children = found.l2_cats || [];

      if (path.length > 2){  
        const selected_l2 = path[2];
        const found = children.find(c => c.l2_name.toLowerCase() === selected_l2.toLowerCase());
        children = found.l3_cats || [];

        return {children, levelName: 'l3_name'};
      }
      return {children, levelName: 'l2_name'};
    }
    return {children, levelName: 'l1_name'};
  }

  function getCategoryPathIds(type, path) {
    const root = AppData.categories.find(c => c.l0_name.toLowerCase() === type.toLowerCase());
    if (!root) return [];

    const ids = [root.id || root.l0_name];
    let node = root;
    const levels = [
      { children: 'l1_cats', name: 'l1_name' },
      { children: 'l2_cats', name: 'l2_name' },
      { children: 'l3_cats', name: 'l3_name' }
    ];

    for (let i = 1; i < path.length; i += 1) {
      const level = levels[i - 1];
      const child = (node[level.children] || []).find(item => item[level.name] === path[i]);
      if (!child) break;
      ids.push(child.id || child[level.name]);
      node = child;
    }

    return ids;
  }


  

  /* =========================================================
    聚合函数
  ========================================================= */
  function hasChildren(type, pathPlusOne){
    let { children, levelName } = getChildren(type, pathPlusOne);
    return children && children.length>0;
  }

  function aggregateTransactions(type, period, anchorDate, drillPath){

    const range = getRange(period, anchorDate);
    const startTime = range.start.getTime();
    const endTime = range.end.getTime();

    let { children, levelName } = getChildren(type, drillPath);
    if (!children) children = [];
    // console.log('Children for', drillPath, children, levelName);
    const labels = [];
    const labelByCategoryId = new Map();
    

    if (children) {
      for (const child of children) {
        let id = child.id;
        let name = '';  
        if (levelName === 'l1_name') {
          name = child.l1_name;
        } else if (levelName === 'l2_name') { 
          name = child.l2_name;
        } else if (levelName === 'l3_name') {
          name = child.l3_name;
        }

        labels.push(name);
        if (child.id) labelByCategoryId.set(String(child.id).toLowerCase(), name);
        labelByCategoryId.set(String(name).toLowerCase(), name);
      }
    }

    const totals = new Map();
    labels.forEach(l => totals.set(l, 0));

    let matchedCount = 0;

    // Step1: 取 period → type → account

    const periodTransactions = getTransactionsByPeriod(period, toISODate(anchorDate));
    const typeTransactions = getTransactionsByType(periodTransactions, type);
    const accountTransactions = getTransactionsByAccount(typeTransactions);
    const categoryPathIds = getCategoryPathIds(type, drillPath);
    
    // console.log("Array length:", accountTransactions.length);

    for(const tx of accountTransactions){
      // const txTime = new Date(tx.date).getTime();
      // if(txTime < startTime || txTime > endTime) continue;

      // drillPath 匹配
      let ok = true;
      for(let i=0;i<categoryPathIds.length;i++){
        const key = categoryPathIds[i];
        const pathLevel = ['l0_category','l1_category','l2_category','l3_category'][i];
        // console.log(key, pathLevel, tx[pathLevel]);
        if(!pathLevel) break;
        if(String(tx[pathLevel] || '').toLowerCase() !== String(key).toLowerCase()){ ok=false; break; }
      }
      if(!ok) continue;

      const nextKey = ['l0_category','l1_category','l2_category','l3_category'][categoryPathIds.length];
      if(!nextKey) continue;

      const nextLabel = labelByCategoryId.get(String(tx[nextKey] || '').toLowerCase());
      // console.log('nextLabel:', nextLabel);
      if(!totals.has(nextLabel)) continue;

      let value = tx.amount;

      if (type === "Spend") {
        value = Math.abs(value);  // 👈 关键修改
      }

      totals.set(nextLabel, totals.get(nextLabel) + value);


      // totals.set(nextLabel, totals.get(nextLabel)+tx.amount);
      matchedCount++;
    }

    const outLabels = [], outValues = [];
    for(const [k,v] of totals.entries()){ outLabels.push(k); outValues.push(v); }

    // 按值排序
    const idx = outLabels.map((_,i)=>i);
    idx.sort((a,b)=>outValues[b]-outValues[a]);
    const sortedLabels = idx.map(i=>outLabels[i]);
    const sortedValues = idx.map(i=>outValues[i]);

    // console.log('Sorted', {sortedLabels, sortedValues});
    return {
      range,
      rangeText: formatRange(range),
      labels: sortedLabels,
      values: sortedValues,
      matchedCount,
      childrenMap: children // used to know drill-down availability
    };
  }



  /* =========================================================
    UI 渲染
  ========================================================= */

  const palette = [
  "#3E92CC", "#F45B69", "#F6AE2D", "#6C9A8B", "#9B5DE5", "#43AA8B", 
  "#F28482", "#577590", "#90BE6D", "#F9C74F", "#277DA1", "#C06C84"];


   // 给 labels 按 index 循环分配颜色
  function colorsForLabels(labels) {
    return labels.map((label, index) => palette[index % palette.length]);
  }

  function renderBreadcrumb(){
    const bc = document.getElementById("sta-path-visualization");
    bc.innerHTML = "";

    // const root = document.createElement("span");
    // root.className = "crumb";
    // root.textContent = state.type.toUpperCase();
    // bc.appendChild(root);

    for(const p of state.drillPath){
      const s = document.createElement("span");
      s.className = "crumb";

      s.textContent = p;
      bc.appendChild(s);
    }


    if(btnUp) btnUp.disabled = state.drillPath.length===1;
    if(btnTop) btnTop.disabled = state.drillPath.length===1;
  }

  function makeLegend(el, labels, values, onClick){
    el.innerHTML = "";
    const total = values.reduce((a,b)=>a+b,0)||1;
    const isDrillDisabled = state.drillPath.length === 3;

    labels.forEach((label,i)=>{
      const item = document.createElement("div");
      const displayName = label;

      item.className="legendItem";
      item.innerHTML=`
        <div class="legendLeft">
          <span class="swatch"></span>
          <span class="legendName">${displayName}</span>
        </div>
        <div class="legendRight">${values[i].toFixed(0)} (${Math.round(values[i]/total*100)}%)</div>
      `;
      if (!isDrillDisabled) {
        item.addEventListener("click", () => onClick(i));
      }

      el.appendChild(item);
    });
  }

  /* =========================================================
    图表渲染
  ========================================================= */
  function renderPie(agg){

    const ctx = document.getElementById("sta-pie-canvas").getContext("2d");;
    const legendEl = document.getElementById("sta-pie-legend");

    if (pieChart) {
      pieChart.destroy();
      pieChart = null;
    }

    const isDrillDisabled = state.drillPath.length === 3;
    pieChart = new Chart(ctx, {
      type: "pie",
      data: {
        labels: agg.labels,
        datasets: [{
          data: agg.values,
          backgroundColor: colorsForLabels(agg.labels),
          borderColor: "rgba(255,255,255,0.20)",
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 1,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (c) => `${c.label}: ${Number(c.raw).toFixed(0)}`
            }
          }
        },
        onClick: (_evt, elements) => {
          if (isDrillDisabled) return;
          if (!elements || elements.length === 0) return;
          const idx = elements[0].index;
          const label = agg.labels[idx];
          drillInto(label);
        }
      }
    });

    makeLegend(legendEl, agg.labels, agg.values, (idx) => drillInto(agg.labels[idx]));
  }

  function renderBar(agg){
    const ctx = document.getElementById("sta-bar-canvas").getContext("2d");;
    const legendEl = document.getElementById("sta-bar-legend");

    if(barChart) {
      barChart.destroy();
      barChart = null;
    }

    const isDrillDisabled = state.drillPath.length === 3;
    barChart = new Chart(ctx,{
      type:"bar",
      data:{
        labels: agg.labels,
        datasets:[{
          label:state.type,
          data:agg.values,
          backgroundColor: colorsForLabels(agg.labels),
          borderColor: "rgba(255,255,255,0.20)",
          borderWidth: 2}]
      },

      options:{
        responsive:true,
        plugins:{legend:{display:false}},
        onClick:(_evt,elements)=>{
          if(isDrillDisabled) return;
          if(!elements||elements.length===0) return;
          const idx = elements[0].index;
          drillInto(agg.labels[idx]);
        }
      }
    });
    makeLegend(legendEl, agg.labels, agg.values, idx=>drillInto(agg.labels[idx]));

  }

  /* =========================================================
    Drill 操作
  ========================================================= */
  function drillInto(label){
    if (state.drillPath.length === 3) return;
    // console.log('Drilling into', label);
    const nextPath = [...state.drillPath, label];
    if(!hasChildren(state.type, nextPath)) return;
    state.drillPath = nextPath;
    refreshAll();
  }

  function drillUp(){
    if(state.drillPath.length===1) return;
    state.drillPath = state.drillPath.slice(0,-1);
    refreshAll();
  }

  function drillTop(){
    state.drillPath = state.drillPath.slice(0,1);
    refreshAll();
  }

  /* =========================================================
    刷新图表
  ========================================================= */
  function refreshAll(){
    
    renderBreadcrumb();
    const agg = aggregateTransactions(state.type, state.period, state.anchorDate, state.drillPath);
    document.getElementById("sta-range-text-pie").textContent = `Range: ${agg.rangeText} • tx matched: ${agg.matchedCount}`;
    document.getElementById("sta-range-text-bar").textContent = `Range: ${agg.rangeText} • tx matched: ${agg.matchedCount}`;
    renderPie(agg);
    renderBar(agg);
  }

  /* =========================================================
    切换视图
  ========================================================= */
  function setActiveView(view){
    state.view = view;
    const pieSec = document.querySelector(".viewPie");
    const barSec = document.querySelector(".viewBar");
    const btnPie = document.querySelector(".btnPie");
    const btnBar = document.querySelector(".btnBar");

    if(view==="pie"){
      pieSec.classList.remove("hidden");
      barSec.classList.add("hidden");
      btnPie.classList.remove("btnSecondary");
      btnBar.classList.add("btnSecondary");
    } else {
      barSec.classList.remove("hidden");
      pieSec.classList.add("hidden");
      btnBar.classList.remove("btnSecondary");
      btnPie.classList.add("btnSecondary");
    }
  }


  // ---------- 初始化账户选择器 ----------
  const acountMeta = AppData.accountMeta;
  accountSelect.innerHTML = [
      'All Accounts',
      ...acountMeta
        .flatMap(p => p.child_accounts)   // 比 map + flat 更干净
        .filter(a => a.active === true)   // 关键过滤
        .map(a => a.name)
    ]
    .map(n => `<option>${n}</option>`)
    .join('');

  // Start on the latest populated date so the default month contains data.
  let latestTransactionDate = null;
  for (const months of Object.values(AppData.transactions)) {
    for (const transactions of Object.values(months)) {
      for (const tx of transactions) {
        const date = tx.date instanceof Date ? tx.date : new Date(tx.date);
        if (!Number.isNaN(date.getTime()) && (!latestTransactionDate || date > latestTransactionDate)) {
          latestTransactionDate = date;
        }
      }
    }
  }
  state.anchorDate = latestTransactionDate
    ? new Date(latestTransactionDate.getFullYear(), latestTransactionDate.getMonth(), 1)
    : new Date();
  if(anchorDateInput) anchorDateInput.value = toISODate(state.anchorDate);

  document.getElementById('tab_nav_statistics')?.addEventListener('click', () => {
    requestAnimationFrame(() => {
      pieChart?.resize();
      barChart?.resize();
    });
  });

  // 事件绑定
  if(typeSelect) typeSelect.addEventListener("change", e=> {
    state.type = e.target.value;
    state.drillPath = [state.type]; // reset path when switching type
    refreshAll();
  });

  if(accountSelect) accountSelect.addEventListener("change", e=> {  
    state.selectedAccount = e.target.value;
    refreshAll();
  });

  if(periodSelect) periodSelect.addEventListener("change", e=> {
    state.period = e.target.value;
    refreshAll();
  });

  if(anchorDateInput) anchorDateInput.addEventListener("change", e=>{
    state.anchorDate = parseISO(e.target.value);
    refreshAll();
  });

  if(btnPie) btnPie.addEventListener("click",()=>setActiveView("pie"));
  if(btnBar) btnBar.addEventListener("click",()=>setActiveView("bar"));
  if(btnUp) btnUp.addEventListener("click", drillUp);
  if(btnTop) btnTop.addEventListener("click", drillTop);

  setActiveView("pie");
  refreshAll();
}






