// 模块内部的私有状态
let initialized = false;
let summaryCharts = [];
const MR_FIRST_COLUMN_WIDTH = 180;
const MR_MONTH_COLUMN_WIDTH = 112;

export function initMonthlyReport() {
  if (initialized) return;
  initialized = true;

  console.log("📅 Monthly Report init");

  const accountMeta = AppData.accountMeta;
  const balanceData = AppData.balance;

  /* ===============================
     模块内部共享状态
  =============================== */
  let selectedNames = [];
  let selectedIds = [];

  let container = null;
  let dropdown = null;
  let selectedDiv = null;
  let allAccounts = [];



  /* =====================================================
     1️⃣ 初始化 DOM 引用
  ===================================================== */
  container = document.getElementById("mr-account-multiselect");
  dropdown = container.querySelector(".mr-multiselect-dropdown");
  selectedDiv = container.querySelector(".mr-multiselect-selected");
  
  /* =====================================================
      工具
  ===================================================== */
  function getLastMonth() {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    return { year, month };
  }

  function generateMonthList(startYear, startMonth, endYear, endMonth) {
    const result = [];

    let y = Number(startYear);
    let m = Number(startMonth);

    while (y < endYear || (y === endYear && m <= endMonth)) {

      result.push({
        year: y,
        month: String(m).padStart(2, "0")
      });

      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }

    return result;
  }

  function findEarliestMonth(selectedNames) {
    const balanceData = AppData.balance;

    let earliest = null;

    Object.keys(balanceData).forEach(year => {

      Object.keys(balanceData[year]).forEach(month => {

        const monthData = balanceData[year][month];

        const hasData = monthData.some(item =>
          selectedNames.includes(item.name)
        );

        if (hasData) {

          const current = year + "-" + month;

          if (!earliest || current < earliest) {
            earliest = current;
          }
        }
      });
    });

    if (!earliest) return null;

    const [y, m] = earliest.split("-");
    return { year: Number(y), month: Number(m) };
  }




  /* =====================================================
     2️⃣ 渲染账户列表（只负责渲染 + active 勾选）
  ===================================================== */
  function renderAccountOptions() {

    // flatten 所有账户
    allAccounts = accountMeta.flatMap(
      group => group.child_accounts || []
    );

    dropdown.innerHTML = "";

    allAccounts.forEach(acc => {

      const label = document.createElement("label");
      label.className = "mr-multiselect-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = acc.name;

      // 仅初始化时根据 active 勾选
      if (acc.active) checkbox.checked = true;

      label.appendChild(checkbox);
      label.append(acc.name);

      dropdown.appendChild(label);
    });
  }



  /* =====================================================
     3️⃣ 更新选中状态（只负责状态更新）
  ===================================================== */
  function updateSelectionState() {

    const checkedInputs = dropdown.querySelectorAll("input:checked");

    selectedIds = Array.from(checkedInputs).map(input => input.value);

    selectedNames = selectedIds.map(id =>
      allAccounts.find(acc => acc.name === id)?.name
    );
  }



  /* =====================================================
     4️⃣ 更新显示文本
  ===================================================== */
  // function updateSelectedDisplay() {

  //   const text =
  //     selectedNames.length > 0
  //       ? selectedNames.join(", ")
  //       : "Select accounts";

  //   // 保留箭头
  //   selectedDiv.innerHTML = `
  //     ${text}
  //     <span class="mr-arrow">&#9662;</span>
  //   `;
  // }



  /* =====================================================
     5️⃣ 绑定交互行为
  ===================================================== */
  function bindEvents() {

    // 下拉开关
    selectedDiv.addEventListener("click", () => {
      dropdown.style.display =
        dropdown.style.display === "block" ? "none" : "block";
    });

    // 点击外部关闭
    document.addEventListener("click", (e) => {
      if (!container.contains(e.target)) {
        dropdown.style.display = "none";
      }
    });

    // 勾选变化
    dropdown.addEventListener("change", () => {
      updateSelectionState();
      renderBalanceTable();
      renderSummaryTable();
      // updateSelectedDisplay();

      console.log("当前选中账户ID:", selectedIds);
    });
  }



  /* =====================================================
     6️⃣ 对外（模块内部）读取选中账户
  ===================================================== */
  function getSelectedAccounts() {
    return selectedIds;
  }


  /* =====================================================
     7️⃣ 渲染表格
  ===================================================== */
  function renderBalanceTable() {
    const balanceData = AppData.balance;

    const theadRow = document.getElementById("mr-account-balance-header-row");
    const tbody = document.getElementById("mr-account-balance-body");

    tbody.innerHTML = "";
    theadRow.innerHTML = "<th>Month</th>";

    if (selectedNames.length === 0) return;

    const earliest = findEarliestMonth(selectedNames);
    if (!earliest) return;

    const lastMonth = getLastMonth();

    const monthList = generateMonthList(
      earliest.year,
      earliest.month,
      lastMonth.year,
      Number(lastMonth.month)
    );
    document.getElementById("mr-account-balance-table").style.width =
      `${MR_FIRST_COLUMN_WIDTH + monthList.length * MR_MONTH_COLUMN_WIDTH}px`;

    /* ===============================
      1️⃣ 表头：月份
    =============================== */
    monthList.forEach(({ year, month }) => {
      const th = document.createElement("th");
      th.textContent = `${year}-${month}`;
      theadRow.appendChild(th);
    });


    /* ===============================
      2️⃣ 每一行 = 一个账户
    =============================== */
    selectedNames.forEach(name => {

      const tr = document.createElement("tr");

      // 第一列：账户名
      const nameTd = document.createElement("td");
      nameTd.textContent = name;
      tr.appendChild(nameTd);

      // 后续列：每个月的数据
      monthList.forEach(({ year, month }) => {

        const td = document.createElement("td");

        const monthData =
          balanceData[year] && balanceData[year][month]
            ? balanceData[year][month]
            : null;

        if (!monthData) {
          td.textContent = "-";
        } else {

          const found = monthData.find(item => item.name === name);

          td.textContent =
            found && found.balance !== undefined
              ? found.balance.toFixed(2)
              : "-";
        }

        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
  }


  function renderSummaryTable() {
    const balanceData = AppData.balance;
    const table = document.getElementById("mr-total-summary-table");
    const thead = table.querySelector("thead");
    const tbody = document.getElementById("mr-total-summary-body");

    tbody.innerHTML = "";
    thead.innerHTML = "";
    summaryCharts.forEach(chart => chart.destroy());
    summaryCharts = [];

    document.getElementById("mr-spend-income-legend").innerHTML = "";
    document.getElementById("mr-assets-cashflow-legend").innerHTML = "";

    if (selectedIds.length === 0) return;

    const earliestBalanceMonth = findEarliestMonth(selectedNames);
    if (!earliestBalanceMonth) return;

    const firstHistoricalMonth = AppData.historicalSpendIncome?.[0];
    const earliest = firstHistoricalMonth && (
      Number(firstHistoricalMonth.year) < earliestBalanceMonth.year ||
      (Number(firstHistoricalMonth.year) === earliestBalanceMonth.year &&
        Number(firstHistoricalMonth.month) < earliestBalanceMonth.month)
    )
      ? {
          year: Number(firstHistoricalMonth.year),
          month: Number(firstHistoricalMonth.month)
        }
      : earliestBalanceMonth;

    const lastMonth = getLastMonth();

    const monthList = generateMonthList(
      earliest.year,
      earliest.month,
      lastMonth.year,
      Number(lastMonth.month)
    );
    const tableWidth =
      MR_FIRST_COLUMN_WIDTH + monthList.length * MR_MONTH_COLUMN_WIDTH;
    table.style.width = `${tableWidth}px`;

    /* ===============================
      1️⃣ 构造账户映射
    =============================== */

    const selectedAccounts = allAccounts.filter(acc =>
      selectedIds.includes(acc.name)
    );

    const nameSet = new Set(selectedAccounts.map(acc => acc.name));

    const cashFlowNameSet = new Set(
      selectedAccounts
        .filter(acc => acc.cash_flow === true)
        .map(acc => acc.name)
    );

    /* ===============================
      2️⃣ 先计算所有月份数据
    =============================== */

    const totalArray = [];
    const deltaArray = [];
    const cashArray = [];
    const deltaCashArray = [];
    const spendArray = [];
    const incomeArray = [];
    const historicalSpendIncomeByMonth = new Map(
      (AppData.historicalSpendIncome || []).map(item => [
        `${item.year}-${item.month}`,
        item
      ])
    );

    let prevTotal = null;
    let prevCash = null;

    monthList.forEach(({ year, month }) => {

      const monthData =
        balanceData[year] && balanceData[year][month]
          ? balanceData[year][month]
          : [];
      const transactions = AppData.transactions[year]?.[month] || [];

      let total = 0;
      let cash = 0;
      let spend = 0;
      let income = 0;

      monthData.forEach(item => {

        if (nameSet.has(item.name)) {
          total += Number(item.balance) || 0;
        }

        if (cashFlowNameSet.has(item.name)) {
          cash += Number(item.balance) || 0;
        }
      });

      transactions.forEach(transaction => {
        if (!nameSet.has(transaction.account)) return;

        const amount = Number(transaction.amount) || 0;
        const category = String(transaction.l0_category || "").toLowerCase();

        if (category === "spend") spend += Math.abs(amount);
        if (category === "income") income += Math.abs(amount);
      });

      const historicalMonth = historicalSpendIncomeByMonth.get(`${year}-${month}`);
      if (historicalMonth) {
        spend = Number(historicalMonth.spend) || 0;
        income = Number(historicalMonth.income) || 0;
      }

      totalArray.push(total);
      spendArray.push(spend);
      incomeArray.push(income);

      if (prevTotal === null) {
        deltaArray.push("-");
      } else {
        deltaArray.push((total - prevTotal).toFixed(2));
      }

      cashArray.push(cash);

      if (prevCash === null) {
        deltaCashArray.push("-");
      } else {
        deltaCashArray.push((cash - prevCash).toFixed(2));
      }

      prevTotal = total;
      prevCash = cash;
    });

    /* ===============================
      3️⃣ 渲染表头（月份）
    =============================== */

    const headRow = document.createElement("tr");

    const emptyTh = document.createElement("th");
    emptyTh.textContent = "Month";
    headRow.appendChild(emptyTh);

    monthList.forEach(({ year, month }) => {
      const th = document.createElement("th");
      th.textContent = `${year}-${month}`;
      headRow.appendChild(th);
    });

    thead.appendChild(headRow);

    /* ===============================
      4️⃣ 渲染四行数据
    =============================== */

    function createRow(label, dataArray) {

      const tr = document.createElement("tr");

      const labelTd = document.createElement("td");
      labelTd.textContent = label;
      tr.appendChild(labelTd);

      dataArray.forEach(value => {
        const td = document.createElement("td");
        td.textContent =
          value === "-" ? "-" : Number(value).toFixed
            ? Number(value).toFixed(2)
            : value;
        tr.appendChild(td);
      });

      return tr;
    }

    tbody.appendChild(createRow("Assets Total", totalArray));
    tbody.appendChild(createRow("Assets Diff", deltaArray));
    tbody.appendChild(createRow("Cash Flow Total", cashArray));
    tbody.appendChild(createRow("Cash Flow Diff", deltaCashArray));
    tbody.appendChild(createRow("Monthly Spend", spendArray));
    tbody.appendChild(createRow("Monthly Income", incomeArray));

    const labels = monthList.map(({ year, month }) => `${year}-${month}`);
    renderSummaryChart(
      "mr-spend-income-chart",
      "mr-spend-income-legend",
      labels,
      [
        { label: "Monthly Spend", data: spendArray, color: "#d45d52" },
        { label: "Monthly Income", data: incomeArray, color: "#258779" }
      ],
      tableWidth
    );
    renderSummaryChart(
      "mr-assets-cashflow-chart",
      "mr-assets-cashflow-legend",
      labels,
      [
        { label: "Assets Total", data: totalArray, color: "#4779b8" },
        { label: "Cash Flow Total", data: cashArray, color: "#c28b32" }
      ],
      tableWidth
    );
  }

  function renderSummaryChart(canvasId, legendId, labels, series, width) {
    const canvas = document.getElementById(canvasId);
    const legend = document.getElementById(legendId);
    canvas.width = width;
    canvas.height = 240;
    canvas.style.width = `${width}px`;

    series.forEach(item => {
      const legendItem = document.createElement("span");
      legendItem.className = "mr-chart-legend-item";

      const swatch = document.createElement("span");
      swatch.className = "mr-chart-legend-swatch";
      swatch.style.backgroundColor = item.color;

      const label = document.createElement("span");
      label.textContent = item.label;

      legendItem.append(swatch, label);
      legend.appendChild(legendItem);
    });

    summaryCharts.push(new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: series.map(item => ({
          label: item.label,
          data: item.data,
          borderColor: item.color,
          backgroundColor: item.color,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.25,
          fill: false
        }))
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            offset: true,
            ticks: { autoSkip: false, maxRotation: 0 },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            afterFit(scale) {
              scale.width = MR_FIRST_COLUMN_WIDTH;
            },
            title: { display: true, text: "Money" },
            ticks: {
              callback(value) {
                return `$${Number(value).toLocaleString()}`;
              }
            }
          }
        }
      }
    }));
  }




  /* =====================================================
     🚀 初始化流程
  ===================================================== */
  renderAccountOptions();
  updateSelectionState();
  renderBalanceTable();
  renderSummaryTable();
  // updateSelectedDisplay();
  bindEvents();

  // 你后续如果要调用：
  // console.log(getSelectedAccounts());
}
