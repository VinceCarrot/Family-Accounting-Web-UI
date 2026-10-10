// 模块内部的私有状态
let initialized = false;
let chartTotal = null;
let chartCashFlow = null;

export function initDashboard() {
  if (initialized) return;
  initialized = true;

  console.log('📊 Dashboard init');

  const data_transactions = AppData.transactions;
  const data_category = AppData.categories;
  const data_account_meta = AppData.accountMeta;
  const data_mortgageMeta = AppData.mortgageMeta;
  const data_balance = AppData.balance;



  function computeSummary(month_balance, accountCashFlowMap) {
    let total_assets = 0;
    let total_cash_flow = 0;
    // console.log('Computing summary for month balance:', month_balance);

    for (const account_idx in month_balance) {
      const account_name = month_balance[account_idx].name;
      const balance = month_balance[account_idx].balance;

      // console.log(`Account: ${account_name}, Balance: ${balance}, Is Cash Flow: ${accountCashFlowMap[account_name]}`);
      // const balance = month_balance[account];
      // console.log(`Account: ${account}, Balance: ${balance}, Is Cash Flow: ${accountCashFlowMap[account]}`);
      total_assets += balance;

      if (accountCashFlowMap[account_name]) {
        total_cash_flow += balance;
      }
    }

    return { total_assets, total_cash_flow };

  }

  function lastMonth(year, month) {
    let y = parseInt(year);
    let m = parseInt(month);

    m -= 1; 
    if (m === 0) {
      m = 12;
      y -= 1;
    }

    return { year: String(y), month: String(m).padStart(2, '0') };
  }

  function currentMonth() {
    const now = new Date();
    return {
      year: String(now.getFullYear()),
      month: String(now.getMonth() + 1).padStart(2, '0')
    };
  }


  // update amount info
  function prepareData() {
    // 1️⃣ 构建 accountId → cash_flow map
    const accountCashFlowMap = {};
    

    data_account_meta.forEach(group => {
      group.child_accounts.forEach(acc => {
        accountCashFlowMap[acc.name] = acc.cash_flow === true;
      });
    });
    // console.log(accountCashFlowMap);

    // 2️⃣ 按月获取 balance 数据
    const assets_history = [];
    const cash_flow_history = [];

    let { year, month } = lastMonth(currentMonth().year, currentMonth().month);
    
    for (let i = 0; i < 12; i++) {
      const month_balance = data_balance[year]?.[month];
      if (month_balance) {
        const { total_assets, total_cash_flow } = computeSummary(month_balance, accountCashFlowMap);
        assets_history.unshift({ year, month, value: total_assets });
        cash_flow_history.unshift({ year, month, value: total_cash_flow });
      }

      ({ year, month } = lastMonth(year, month));
    }

    return { assets_history, cash_flow_history };
  }




  function renderLineChart(canvasId, label, historyData, existingChartRefSetter, color) {

    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const labels = historyData.map(item => `${item.year}-${item.month}`);
    const values = historyData.map(item => item.value);

    const newChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label,
          data: values,
          borderColor: color,
          backgroundColor: color,
          tension: 0.3,
          fill: false,
          borderWidth: 2,
          pointRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            }
          },
          y: {
            beginAtZero: false
          }
        }
      }
    });

    existingChartRefSetter(newChart);
  }


  function renderCharts(assets_history, cash_flow_history) {
    // 如果已存在图表，销毁
    if (chartTotal) {
      chartTotal.destroy();
      chartTotal = null;
    }

    if (chartCashFlow) {
      chartCashFlow.destroy();
      chartCashFlow = null;
    }

    renderLineChart(
      'db-chart-total',
      'Total Assets',
      assets_history,
      chart => chartTotal = chart,
      'rgba(143, 187, 217, 0.9)'   // 浅蓝
    );

    renderLineChart(
      'db-chart-cashflow',
      'Total Cash Flow',
      cash_flow_history,
      chart => chartCashFlow = chart,
      'rgba(217, 143, 143, 0.9)'   // 浅红
    );
  }

  function initHideAmountToggle() {
    const toggleBtn = document.getElementById("db-toggle-amount-btn");
    if (!toggleBtn) return;

    toggleBtn.addEventListener("click", () => {
      // 所有 db-sensitive 元素
      const elements = document.querySelectorAll(".db-sensitive");

      elements.forEach(el => {
        const current = el.textContent.trim();

        // 如果当前显示的是闭眼 icon，则显示真实金额
        if (current === "********") {
          const realValue = Number(el.dataset.realValue) || 0;
          el.textContent = `S$ ${realValue.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}`;
        } else {
          // 否则显示闭眼 icon
          el.textContent = "********";
        }
      });

      // 更新按钮文字
      if (toggleBtn.textContent.includes("Hide")) {
        toggleBtn.textContent = "Show Amounts";
      } else {
        toggleBtn.textContent = "Hide Amounts";
      }
    });
}




  const { assets_history, cash_flow_history } = prepareData();

  // Update ammount
  const assetEl = document.getElementById("db-total-assets");
  const cashEl = document.getElementById("db-total-cashflow");

  const latestAsset =
    assets_history.length > 0
      ? assets_history[assets_history.length - 1].value
      : 0;

  const latestCashFlow =
    cash_flow_history.length > 0
      ? cash_flow_history[cash_flow_history.length - 1].value
      : 0;

  const formattedAsset = `S$ ${Number(latestAsset).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

  const formattedCashFlow = `S$ ${Number(latestCashFlow).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

  // 更新文本
  assetEl.textContent = formattedAsset;
  cashEl.textContent = formattedCashFlow;

  // 更新真实值（给隐藏功能用）
  assetEl.dataset.realValue = latestAsset;
  cashEl.dataset.realValue = latestCashFlow;



  // update charts
  renderCharts(assets_history, cash_flow_history);


  //update mortgage info
  const mortgageEl = document.getElementById("db-mortgage-balance");
  const updateTimeEl = document.getElementById("db-mortgage-update-time");

  if (!mortgageEl || !updateTimeEl) return;

  const balance = AppData.mortgageMeta?.balance || 0;
  const updateTime = AppData.mortgageMeta?.update_time;

  // 格式化金额
  mortgageEl.textContent = `S$ ${Number(balance).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
  mortgageEl.dataset.realValue = balance;

  // 格式化时间为 yyyy-mm-dd
  if (updateTime) {
    const date = new Date(updateTime);
    if (!isNaN(date.getTime())) {
      updateTimeEl.textContent = date.toISOString().split("T")[0];
    } else {
      updateTimeEl.textContent = "--";
    }
  } else {
    updateTimeEl.textContent = "--";
  }




  initHideAmountToggle();





  
}

