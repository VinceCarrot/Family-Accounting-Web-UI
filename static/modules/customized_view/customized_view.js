// 模块内部的私有状态
let initialized = false;

export function initCustomizedView() {
  if (initialized) return;
  initialized = true;

  console.log("💡 Customized View init");

  const accountMeta = AppData.accountMeta;
  const categories = AppData.categories;
  const transactions = AppData.transactions;

  /* ===============================
     状态
  =============================== */
  let allAccounts = [];
  let selectedAccountNames = [];

  let selectedCategories = [];
  const categoryFields = ["l0_category", "l1_category", "l2_category", "l3_category"];
  const categoryCheckboxes = new Map();
  let activeCategoryPath = [];

  /* ===============================
     DOM
  =============================== */
  const accContainer = document.getElementById("cus-account-multiselect");
  const accDropdown = document.getElementById("cus-account-dropdown");
  const accSelectedDiv = document.getElementById("cus-account-selected");

  const catContainer = document.getElementById("cus-category-multiselect");
  const catDropdown = document.getElementById("cus-category-dropdown");
  const catSelectedDiv = document.getElementById("cus-category-selected");

  const periodSelect = document.getElementById("cus-select-period");
  const applyBtn = document.getElementById("cus-btn-apply");

  /* =========================================================
    1️⃣ Account 渲染
  ========================================================= */
  function renderAccountOptions() {
    allAccounts = accountMeta.flatMap(g => g.child_accounts || []);

    accDropdown.innerHTML = "";

    allAccounts.forEach(acc => {
      const label = document.createElement("label");
      label.className = "mr-multiselect-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = acc.name;

      if (acc.active) checkbox.checked = true;

      label.appendChild(checkbox);
      label.append(acc.name);

      accDropdown.appendChild(label);
    });
  }

  function updateAccountState() {
    const checked = accDropdown.querySelectorAll("input:checked");

    selectedAccountNames = Array.from(checked).map(i => i.value);
  }

  /* =========================================================
    2️⃣ Category 渲染（L0-L3 cascading menu）
  ========================================================= */
  function buildCategoryNodes(items, level, parentPath = [], parent = null) {
    const nameField = `l${level}_name`;
    const childrenField = `l${level + 1}_cats`;

    return (items || []).map(item => {
      const node = {
        id: item.id,
        name: item[nameField],
        level,
        path: [...parentPath, item.id],
        parent,
        children: []
      };

      if (level < categoryFields.length - 1) {
        node.children = buildCategoryNodes(item[childrenField], level + 1, node.path, node);
      }

      return node;
    });
  }

  const categoryTree = buildCategoryNodes(categories, 0);

  function renderCategoryLevel(nodes, levelIndex) {
    const level = document.createElement("div");
    level.className = "cus-category-level";
    level.dataset.level = String(levelIndex);

    nodes.forEach(node => {
      const row = document.createElement("div");
      row.className = "cus-category-row";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = Boolean(node.checked);
      checkbox.indeterminate = Boolean(node.indeterminate);
      checkbox.setAttribute("aria-label", `Select ${node.name}`);
      node.checkbox = checkbox;
      categoryCheckboxes.set(checkbox, node);
      row.appendChild(checkbox);

      const nameButton = document.createElement("button");
      nameButton.type = "button";
      nameButton.className = "cus-category-name";
      nameButton.textContent = node.name;
      nameButton.disabled = node.children.length === 0;
      nameButton.setAttribute("aria-expanded", String(activeCategoryPath[levelIndex] === node));

      if (node.children.length > 0) {
        nameButton.classList.add("has-children");
        nameButton.addEventListener("click", event => {
          event.stopPropagation();
          const shouldClose = activeCategoryPath[levelIndex] === node;
          activeCategoryPath = activeCategoryPath.slice(0, levelIndex);
          if (!shouldClose) activeCategoryPath.push(node);
          renderCategoryPanels();
        });
      }

      row.appendChild(nameButton);
      level.appendChild(row);
    });

    return level;
  }

  function renderCategoryPanels() {
    categoryCheckboxes.clear();
    catDropdown.innerHTML = "";

    let nodes = categoryTree;
    for (let levelIndex = 0; levelIndex <= activeCategoryPath.length; levelIndex += 1) {
      catDropdown.appendChild(renderCategoryLevel(nodes, levelIndex));
      if (levelIndex < activeCategoryPath.length) {
        nodes = activeCategoryPath[levelIndex].children;
      }
    }

    const panelCount = catDropdown.children.length;
    catDropdown.style.width = `${panelCount * 260}px`;
    catDropdown.style.gridTemplateColumns = `repeat(${panelCount}, minmax(0, 1fr))`;
  }

  function setCategorySubtree(node, checked) {
    node.checked = checked;
    node.indeterminate = false;
    if (node.checkbox) {
      node.checkbox.checked = checked;
      node.checkbox.indeterminate = false;
    }
    node.children.forEach(child => setCategorySubtree(child, checked));
  }

  function updateCategoryAncestors(node) {
    if (!node) return;

    const allChildrenChecked = node.children.every(child => child.checked && !child.indeterminate);
    const someChildrenChecked = node.children.some(child => child.checked || child.indeterminate);
    node.checked = allChildrenChecked;
    node.indeterminate = !allChildrenChecked && someChildrenChecked;
    if (node.checkbox) {
      node.checkbox.checked = node.checked;
      node.checkbox.indeterminate = node.indeterminate;
    }
    updateCategoryAncestors(node.parent);
  }

  function updateCategoryState() {
    selectedCategories = [];

    function collectSelected(nodes) {
      nodes.forEach(node => {
        if (node.checked && !node.indeterminate) {
          selectedCategories.push(node.path.map((value, index) => ({ field: categoryFields[index], value })));
        }
        collectSelected(node.children);
      });
    }

    collectSelected(categoryTree);
  }

  function renderCategoryOptions() {
    renderCategoryPanels();
  }

  /* =========================================================
    3️⃣ MultiSelect 交互（通用）
  ========================================================= */
  function bindMultiSelect(container, dropdown) {
    const selectedDiv = container.querySelector(".mr-multiselect-selected");

    selectedDiv.addEventListener("click", () => {
      const isCategoryDropdown = dropdown === catDropdown;
      const isOpen = dropdown.style.display !== "none" && dropdown.style.display !== "";
      dropdown.style.display = isOpen ? "none" : isCategoryDropdown ? "grid" : "block";
    });

    document.addEventListener("click", (e) => {
      if (!container.contains(e.target)) {
        dropdown.style.display = "none";
      }
    });
  }

  /* =========================================================
    4️⃣ 数据过滤
  ========================================================= */
  function getFilteredTransactions() {
    const result = [];

    for (const year in transactions) {
      for (const month in transactions[year]) {

        const monthData = transactions[year][month];

        monthData.forEach(tx => {

          // account filter
          if (!selectedAccountNames.includes(tx.account)) return;

          const matchesCategory = selectedCategories.some(path =>
            path.every(({ field, value }) => tx[field] === value)
          );
          if (!matchesCategory) return;

          result.push(tx);
        });
      }
    }

    return result;
  }

  /* =========================================================
    5️⃣ 聚合（month / year）
  ========================================================= */
  function aggregateByPeriod(data) {
    const map = new Map();
    const period = periodSelect.value;

    data.forEach(tx => {
      const d = tx.date instanceof Date ? tx.date : new Date(tx.date);
      if (Number.isNaN(d.getTime())) return;

      let key = "";
      const year = d.getUTCFullYear();

      if (period === "month") {
        key = `${year}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      } else {
        key = `${year}`;
      }

      const val = Number(tx.amount);
      if (!Number.isFinite(val)) return;

      map.set(key, (map.get(key) || 0) + val);
    });

    // 排序
    const sortedKeys = Array.from(map.keys()).sort();

    return {
      labels: sortedKeys,
      values: sortedKeys.map(k => map.get(k))
    };
  }

  /* =========================================================
    6️⃣ Chart
  ========================================================= */
  let chart = null;

  function renderChart(labels, values) {
    const ctx = document.getElementById("cus-bar-canvas").getContext("2d");

    if (chart) {
      chart.destroy();
    }

    chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Total",
          data: values,
          backgroundColor: "rgba(106,188,255,0.80)",
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            title: { display: true, text: periodSelect.value === "month" ? "Month" : "Year" }
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: "Amount" }
          }
        }
      }
    });
  }

  /* =========================================================
    7️⃣ 主流程
  ========================================================= */
  function run() {
    updateAccountState();
    updateCategoryState();

    const filtered = getFilteredTransactions();
    const agg = aggregateByPeriod(filtered);

    renderChart(agg.labels, agg.values);

    // console.log("Accounts:", selectedAccountNames);
    // console.log("Categories:", selectedCategories);
  }

  /* =========================================================
    8️⃣ 初始化
  ========================================================= */
  renderAccountOptions();
  renderCategoryOptions();

  bindMultiSelect(accContainer, accDropdown);
  bindMultiSelect(catContainer, catDropdown);

  accDropdown.addEventListener("change", updateAccountState);
  catDropdown.addEventListener("change", event => {
    const node = categoryCheckboxes.get(event.target);
    if (!node) return;

    node.checked = event.target.checked;
    setCategorySubtree(node, event.target.checked);
    updateCategoryAncestors(node.parent);
    updateCategoryState();
  });

  applyBtn.addEventListener("click", run);

  // 默认跑一次
  run();
}
