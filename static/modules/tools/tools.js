import { syncAppData } from '../../js/data_loader.js';

// 模块内部的私有状态
let initialized = false;

export function initTools() {
  if (initialized) return;
  initialized = true;

  console.log('🛠️ Tools init');

  const categories = AppData.categories;
  const accountMeta = AppData.accountMeta;
  const balanceData = AppData.balance;



  /* =========================
     1️⃣ TOOL TOGGLE
  ========================= */
  function initToolToggle() {
    const buttons = document.querySelectorAll(".tool-card");

    buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        const targetId = btn.dataset.target;
        const targetEl = document.getElementById(targetId);

        const isActive = targetEl.classList.contains("active");

        // reset all
        document.querySelectorAll(".tool-content")
          .forEach(el => el.classList.remove("active"));

        document.querySelectorAll(".tool-card")
          .forEach(el => el.classList.remove("active"));

        // toggle
        if (!isActive) {
          targetEl.classList.add("active");
          btn.classList.add("active");
        }
      });
    });
  }

  /* =========================
     2️⃣ ACCOUNT CATEGORY SWITCH
  ========================= */
  function initAccountCategory() {
    const select = document.getElementById("add-account-category");

    if (!select) return;

    const map = {
      bank: "fields-bank",
      card: "fields-card",
      cpf: "fields-cpf",
      cash: "fields-cash",
      investment: "fields-investment"
    };

    select.addEventListener("change", () => {
      const value = select.value;

      document.querySelectorAll(".account-fields")
        .forEach(el => el.classList.remove("active"));

      if (map[value]) {
        document.getElementById(map[value]).classList.add("active");
      }
    });
  }

  /* =========================
     3️⃣ ADD ACCOUNT
  ========================= */
  function initAddAccount() {
    const btn = document.getElementById("add-account-confirm");
    if (!btn) return;

    btn.addEventListener("click", () => {

      const category = document.getElementById("add-account-category").value;

      if (!category) {
        alert("Please select category");
        return;
      }

      function getValue(containerId, labelText) {
        const rows = document
          .getElementById(containerId)
          .querySelectorAll(".form-row");

        for (let row of rows) {
          const label = row.querySelector("label").innerText;
          if (label === labelText) {
            const input = row.querySelector("input");
            if (input.type === "checkbox") return input.checked;
            return input.value;
          }
        }
        return null;
      }

      let newAccount = {};

      if (category === "bank") {
        newAccount = {
          id: getValue("fields-bank", "Account ID") || crypto.randomUUID(),
          name: getValue("fields-bank", "Account Name"),
          bank: getValue("fields-bank", "Bank"),
          balance: parseFloat(getValue("fields-bank", "Balance") || 0),
          account_number: getValue("fields-bank", "Account Number"),
          branch: getValue("fields-bank", "Branch") || "---",
          branch_code: getValue("fields-bank", "Branch Code") || "---",
          swift_code: getValue("fields-bank", "SWIFT Code"),
          cash_flow: getValue("fields-bank", "Cash Flow"),
          active: getValue("fields-bank", "Active")
        };
      }

      else if (category === "card") {
        newAccount = {
          id: getValue("fields-card", "Account ID") || crypto.randomUUID(),
          name: getValue("fields-card", "Card Name"),
          bank: getValue("fields-card", "Bank"),
          balance: parseFloat(getValue("fields-card", "Balance") || 0),
          card_number: getValue("fields-card", "Card Number"),
          cash_flow: getValue("fields-card", "Cash Flow"),
          active: getValue("fields-card", "Active")
        };
      }

      else if (category === "cash") {
        newAccount = {
          id: getValue("fields-cash", "Account ID") || crypto.randomUUID(),
          name: getValue("fields-cash", "Account Name"),
          balance: parseFloat(getValue("fields-cash", "Balance") || 0),
          cash_flow: getValue("fields-cash", "Cash Flow"),
          active: getValue("fields-cash", "Active")
        };
      }

      else if (category === "cpf") {
        newAccount = {
          id: getValue("fields-cpf", "Account ID") || crypto.randomUUID(),
          name: getValue("fields-cpf", "Account Name"),
          balance: parseFloat(getValue("fields-cpf", "Balance") || 0),
          cash_flow: getValue("fields-cpf", "Cash Flow"),
          active: getValue("fields-cpf", "Active")
        };
      }

      else if (category === "investment") {
        newAccount = {
          id: getValue("fields-investment", "Account ID") || crypto.randomUUID(),
          name: getValue("fields-investment", "Account Name"),
          balance: parseFloat(getValue("fields-investment", "Balance") || 0),
          cash_flow: getValue("fields-investment", "Cash Flow"),
          active: getValue("fields-investment", "Active")
        };
      }

      else {
        alert("Unsupported category");
        return;
      }

      /* === 插入 accountMeta === */
      const map = {
        bank: "Bank Saving Account",
        card: "Credit Cards",
        cash: "Cash Wallet",
        cpf: "CPF",
        investment: "Investment"
      };

      const parent = accountMeta.find(c => c.name === map[category]);
      parent.child_accounts.push(newAccount);

      console.log("✅ Added:", newAccount);

      // console.log("Updated accountMeta:", accountMeta);

      /* === 保存 === */
      saveAccountMeta();
      renderDropdown();

      syncAppData(AppData);
    });
  }

  /* =========================
     4️⃣ FLATTEN + DROPDOWN
  ========================= */
  function flattenAccounts() {
    const all = [];

    accountMeta.forEach(category => {
      category.child_accounts.forEach(acc => {
        all.push({
          id: acc.id,
          name: acc.name,
          category: category.name,
          active: acc.active
        });
      });
    });

    return all;
  }

  function renderDropdown() {
    const select = document.getElementById("toggle-account-select");
    if (!select) return;

    const accounts = flattenAccounts();

    select.innerHTML = "";

    accounts.forEach(acc => {
      const option = document.createElement("option");

      option.value = acc.id;
      option.textContent =
        `${acc.active ? "🟢" : "🔴"}  ${acc.category} - ${acc.name}`;

      select.appendChild(option);
    });
  }

  /* =========================
     5️⃣ ACTIVATE / DEACTIVATE
  ========================= */
  function initToggleAccount() {
    const select = document.getElementById("toggle-account-select");
    const activateBtn = document.querySelector(".activate-btn");
    const deactivateBtn = document.querySelector(".deactivate-btn");

    if (!select) return;

    function updateStatus(isActive) {
      const id = select.value;

      accountMeta.forEach(category => {
        category.child_accounts.forEach(acc => {
          if (acc.id === id) {
            acc.active = isActive;
          }
        });
      });

      renderDropdown();
      saveAccountMeta();

      syncAppData(AppData);
    }

    activateBtn.addEventListener("click", () => updateStatus(true));
    deactivateBtn.addEventListener("click", () => updateStatus(false));
  }

  /* =========================
     6️⃣ SAVE API
  ========================= */
  function saveAccountMeta() {
    fetch("/save_json_file", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        filepath: 'static/data/account_meta_data.json',
        data: accountMeta
      })
    })
    .then(res => res.json())
    .then(() => console.log("💾 saved"))
    .catch(err => console.error("❌ save failed", err));
  }

  /* =========================
   7️⃣ UPDATE TRANSACTION
  ========================= */
  function initUpdateTransaction() {
    const accountSelect = document.getElementById("transaction-entry-account");
    const yearSelect = document.getElementById("transaction-entry-year");
    const monthSelect = document.getElementById("transaction-entry-month");
    const tableBody = document.getElementById("transaction-entry-body");
    const addButton = document.getElementById("transaction-entry-add");
    const saveButton = document.getElementById("transaction-entry-save");
    const result = document.getElementById("transaction-entry-result");
    if (!accountSelect || !yearSelect || !monthSelect || !tableBody || !addButton || !saveButton) return;

    const accounts = accountMeta.flatMap(group => group.child_accounts || [])
      .filter(account => account.active !== false);
    accountSelect.innerHTML = '<option value="">Select account</option>';
    accounts.forEach(account => {
      const option = document.createElement("option");
      option.value = account.name;
      option.textContent = account.name;
      accountSelect.appendChild(option);
    });

    const currentYear = new Date().getFullYear();
    yearSelect.innerHTML = '<option value="">Select year</option>';
    for (let year = currentYear - 5; year <= currentYear + 1; year += 1) {
      const option = document.createElement("option");
      option.value = String(year);
      option.textContent = String(year);
      option.selected = year === currentYear;
      yearSelect.appendChild(option);
    }

    monthSelect.innerHTML = '<option value="">Select month</option>';
    for (let month = 1; month <= 12; month += 1) {
      const value = String(month).padStart(2, "0");
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      option.selected = month === new Date().getMonth() + 1;
      monthSelect.appendChild(option);
    }

    function getCategoryOptions(level, parents = {}) {
      const l0 = categories.find(item => item.id === parents.l0);
      const l1 = l0?.l1_cats?.find(item => item.id === parents.l1);
      const l2 = l1?.l2_cats?.find(item => item.id === parents.l2);
      const options = level === "l0" ? categories
        : level === "l1" ? (l0?.l1_cats || [])
          : level === "l2" ? (l1?.l2_cats || [])
            : (l2?.l3_cats || []);
      const labelKey = `${level}_name`;
      return options.map(item => ({ value: item.id, label: item[labelKey] }));
    }

    function updateCategorySelects(row) {
      const selected = Object.fromEntries(
        Array.from(row.querySelectorAll("select[data-level]"))
          .map(select => [select.dataset.level, select.value])
      );
      const parents = {};
      ["l0", "l1", "l2", "l3"].forEach(level => {
        const select = row.querySelector(`select[data-level="${level}"]`);
        const previousValue = selected[level];
        select.innerHTML = '<option value="">Select</option>';
        getCategoryOptions(level, parents).forEach(item => {
          const option = document.createElement("option");
          option.value = item.value;
          option.textContent = item.label;
          option.selected = item.value === previousValue;
          select.appendChild(option);
        });
        if (select.value) parents[level] = select.value;
      });
    }

    function updateRowNumbers() {
      Array.from(tableBody.rows).forEach((row, index) => {
        row.querySelector(".transaction-entry-number").textContent = String(index + 1);
      });
    }

    function addTransactionRow() {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="transaction-entry-number"></td>
        <td><input type="date" data-field="date" aria-label="Date"></td>
        <td><input type="text" data-field="transaction_detail" aria-label="Transaction Detail"></td>
        <td><select data-level="l0" aria-label="L0 Category"></select></td>
        <td><select data-level="l1" aria-label="L1 Category"></select></td>
        <td><select data-level="l2" aria-label="L2 Category"></select></td>
        <td><select data-level="l3" aria-label="L3 Category"></select></td>
        <td><input type="number" step="any" data-field="amount" aria-label="Amount"></td>
        <td><button type="button" class="transaction-entry-remove" aria-label="Remove transaction row" title="Remove row">−</button></td>
      `;
      const year = yearSelect.value;
      const month = monthSelect.value;
      if (year && month) {
        const lastDay = new Date(Number(year), Number(month), 0).getDate();
        const dateInput = row.querySelector('[data-field="date"]');
        dateInput.min = `${year}-${month}-01`;
        dateInput.max = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;
        const today = new Date();
        const day = year === String(today.getFullYear()) && month === String(today.getMonth() + 1).padStart(2, "0")
          ? today.getDate()
          : 1;
        dateInput.value = `${year}-${month}-${String(day).padStart(2, "0")}`;
      }
      row.querySelectorAll("select[data-level]").forEach(select => {
        select.addEventListener("change", () => updateCategorySelects(row));
      });
      tableBody.appendChild(row);
      updateCategorySelects(row);
      updateRowNumbers();
    }

    function resetRows() {
      tableBody.innerHTML = "";
      addTransactionRow();
    }

    yearSelect.addEventListener("change", resetRows);
    monthSelect.addEventListener("change", resetRows);
    addButton.addEventListener("click", addTransactionRow);
    tableBody.addEventListener("click", event => {
      const removeButton = event.target.closest(".transaction-entry-remove");
      if (!removeButton) return;
      removeButton.closest("tr").remove();
      updateRowNumbers();
    });
    resetRows();

    saveButton.addEventListener("click", async () => {
      if (!accountSelect.value || !yearSelect.value || !monthSelect.value) {
        result.textContent = "Select an account, year, and month before saving.";
        return;
      }

      const transactions = Array.from(tableBody.rows).map(row => {
        const read = field => row.querySelector(`[data-field="${field}"]`).value.trim();
        return {
          account: accountSelect.value,
          date: read("date"),
          transaction_detail: read("transaction_detail"),
          l0_category: row.querySelector('[data-level="l0"]').value,
          l1_category: row.querySelector('[data-level="l1"]').value,
          l2_category: row.querySelector('[data-level="l2"]').value,
          l3_category: row.querySelector('[data-level="l3"]').value,
          amount: read("amount")
        };
      }).filter(transaction => transaction.transaction_detail || transaction.amount);

      if (!transactions.length || transactions.some(transaction =>
        !transaction.date || !transaction.transaction_detail || transaction.amount === ""
      )) {
        result.textContent = "Complete the date, transaction detail, and amount for each started row.";
        return;
      }

      saveButton.disabled = true;
      result.textContent = "Saving...";
      try {
        const response = await fetch("/api/update_transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            account: accountSelect.value,
            year: yearSelect.value,
            month: monthSelect.value,
            transactions
          })
        });
        const saved = await response.json();
        if (!response.ok || saved.status !== "ok") throw new Error(saved.message || "Save failed");

        const year = yearSelect.value;
        const month = monthSelect.value;
        AppData.transactions[year] ||= {};
        AppData.transactions[year][month] ||= [];
        AppData.transactions[year][month].push(...transactions);
        await syncAppData(AppData);
        result.textContent = `Saved ${transactions.length} transaction(s) to ${saved.file}.`;
        resetRows();
      } catch (error) {
        result.textContent = `Save failed: ${error.message}`;
      } finally {
        saveButton.disabled = false;
      }
    });
  }

  function initUpdateBalance() {
    const yearSelect = document.getElementById("balance-entry-year");
    const monthSelect = document.getElementById("balance-entry-month");
    const tableBody = document.getElementById("balance-entry-body");
    const saveButton = document.getElementById("balance-entry-save");
    const result = document.getElementById("balance-entry-result");
    if (!yearSelect || !monthSelect || !tableBody || !saveButton) return;

    const activeAccounts = accountMeta.flatMap(group => group.child_accounts || [])
      .filter(account => account.active !== false);
    const currentYear = new Date().getFullYear();
    yearSelect.innerHTML = '<option value="">Select year</option>';
    for (let year = currentYear - 5; year <= currentYear + 1; year += 1) {
      const option = document.createElement("option");
      option.value = String(year);
      option.textContent = String(year);
      option.selected = year === currentYear;
      yearSelect.appendChild(option);
    }

    monthSelect.innerHTML = '<option value="">Select month</option>';
    for (let month = 1; month <= 12; month += 1) {
      const value = String(month).padStart(2, "0");
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      option.selected = month === new Date().getMonth() + 1;
      monthSelect.appendChild(option);
    }

    activeAccounts.forEach(account => {
      const row = document.createElement("tr");
      const nameCell = document.createElement("td");
      nameCell.textContent = account.name;
      const balanceCell = document.createElement("td");
      const input = document.createElement("input");
      input.type = "number";
      input.step = "any";
      input.dataset.accountName = account.name;
      input.setAttribute("aria-label", `${account.name} balance`);
      balanceCell.appendChild(input);
      row.append(nameCell, balanceCell);
      tableBody.appendChild(row);
    });

    saveButton.addEventListener("click", async () => {
      if (!yearSelect.value || !monthSelect.value) {
        result.textContent = "Select a year and month before saving.";
        return;
      }

      const balances = Array.from(tableBody.querySelectorAll("input")).map(input => ({
        name: input.dataset.accountName,
        balance: input.value.trim()
      }));
      if (!balances.length || balances.some(item => item.balance === "" || !Number.isFinite(Number(item.balance)))) {
        result.textContent = "Enter a valid balance for every active account.";
        return;
      }
      const data = balances.map(item => ({ name: item.name, balance: Number(item.balance) }));

      saveButton.disabled = true;
      result.textContent = "Saving...";
      try {
        const response = await fetch("/api/update_balance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ year: yearSelect.value, month: monthSelect.value, data })
        });
        const saved = await response.json();
        if (!response.ok || saved.status !== "ok") throw new Error(saved.message || "Save failed");

        const year = yearSelect.value;
        const month = monthSelect.value;
        AppData.balance[year] ||= {};
        AppData.balance[year][month] = data;
        await syncAppData(AppData);
        result.textContent = `Saved ${data.length} account balance(s) to ${saved.file}.`;
      } catch (error) {
        result.textContent = `Save failed: ${error.message}`;
      } finally {
        saveButton.disabled = false;
      }
    });
  }


  /* =========================
    下载 Category MetaData
  ========================= */
  function initDownloadCategoryMeta() {

    const btn = document.getElementById("download-category-meta-confirm");
    if (!btn) return;

    btn.addEventListener("click", async () => {

      // const categories = AppData.categories;

      if (!categories) {
        alert("No category data found");
        return;
      }

      const jsonStr = JSON.stringify(categories, null, 4);

      try {
        // 👇 打开“选择保存位置”窗口
        const handle = await window.showSaveFilePicker({
          suggestedName: "categories.json",
          types: [{
            description: "JSON File",
            accept: { "application/json": [".json"] }
          }]
        });

        // 👇 写入文件
        const writable = await handle.createWritable();
        await writable.write(jsonStr);
        await writable.close();

        console.log("💾 File saved successfully");

      } catch (err) {
        console.warn("❌ Save cancelled or failed", err);
      }
    });

  }


  /* =========================
    下载 Account MetaData
  ========================= */
  function initDownloadAccountMeta() {

    const btn = document.getElementById("download-account-meta-confirm");
    if (!btn) return;

    btn.addEventListener("click", async () => {

      // const categories = AppData.categories;

      if (!accountMeta) {
        alert("No account data found");
        return;
      }

      const jsonStr = JSON.stringify(accountMeta, null, 4);

      try {
        // 👇 打开“选择保存位置”窗口
        const handle = await window.showSaveFilePicker({
          suggestedName: "accounts_meta_data.json",
          types: [{
            description: "JSON File",
            accept: { "application/json": [".json"] }
          }]
        });

        // 👇 写入文件
        const writable = await handle.createWritable();
        await writable.write(jsonStr);
        await writable.close();

        console.log("💾 File saved successfully");

      } catch (err) {
        console.warn("❌ Save cancelled or failed", err);
      }
    });

  }

  /* =========================
   8️⃣ UPDATE MORTGAGE
========================= */
function initUpdateMortgage() {

  const balanceInput = document.getElementById("mortgage-balance-input");
  const timeInput = document.getElementById("mortgage-update-time");
  const btn = document.querySelector("#update-mortgage-content .tool-confirm-btn");

  if (!balanceInput || !timeInput || !btn) return;

  btn.addEventListener("click", async () => {

    // 1️⃣ 获取输入
    const balance = parseFloat(balanceInput.value);
    const time = timeInput.value; // YYYY-MM

    if (isNaN(balance)) {
      alert("Please enter a valid balance");
      return;
    }

    if (!time) {
      alert("Please select update time");
      return;
    }

    // 转成 ISO 时间字符串，默认取该月最后一天 23:59:59
    const [year, month] = time.split("-");
    const lastDay = new Date(year, month, 0, 23, 59, 59); // month 从 0 开始
    const isoTime = lastDay.toISOString();

    // 2️⃣ 更新 AppData.mortgageMeta
    AppData.mortgageMeta.balance = balance;
    AppData.mortgageMeta.update_time = isoTime;

    console.log("🏠 Mortgage updated:", AppData.mortgageMeta);

    // 3️⃣ 保存到后端 JSON
    try {
      const res = await fetch("/save_json_file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filepath: 'static/data/mortgage_meta_data.json',
          data: AppData.mortgageMeta
        })
      });

      const result = await res.json();
      if (result.status === "ok") {
        console.log("💾 Mortgage saved");
      } else {
        console.error("❌ Save failed:", result.message);
      }
    } catch (err) {
      console.error("❌ Save failed:", err);
    }

    // 4️⃣ 同步 AppData 给后端 / 网页B
    syncAppData(AppData);

  });
}


  /* =========================
     INIT
  ========================= */
  initUpdateTransaction();
  initUpdateBalance();
  initToolToggle();
  initAccountCategory();
  initAddAccount();
  renderDropdown();
  initToggleAccount();
  initDownloadCategoryMeta();
  initDownloadAccountMeta();
  initUpdateMortgage();

}

