let initialized = false;

export function initTransactionHistory() {
  if (initialized) return;
  initialized = true;

  const yearSelect = document.getElementById('filter-year');
  const monthSelect = document.getElementById('filter-month');
  const l0Select = document.getElementById('filter-l0');
  const l1Select = document.getElementById('filter-l1');
  const l2Select = document.getElementById('filter-l2');
  const l3Select = document.getElementById('filter-l3');
  const accountSelect = document.getElementById('filter-account');
  const applyBtn = document.getElementById('filter-apply');
  const transactionList = document.getElementById('transaction-list');
  const transactionHeader = document.querySelector('.transaction-header');

  // ---------- 初始化年份和月份 ----------
  const years = Object.keys(AppData.transactions).sort();
  yearSelect.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
  monthSelect.innerHTML = Array.from({length: 12}, (_, i) => i + 1)
    .map(m => `<option value="${String(m).padStart(2,'0')}">${m}</option>`).join('');

  // ---------- 初始化类别选择器 ----------
  const categories = AppData.categories;
  const allOption = '<option value="All">All</option>';
  l0Select.innerHTML = allOption + categories
    .map(c => `<option value="${c.id}">${c.l0_name}</option>`).join('');

  function updateL1() {
    const l0Obj = categories.find(c => c.id === l0Select.value);
    if (!l0Obj) { l1Select.innerHTML = allOption; updateL2(); return; }
    l1Select.innerHTML = allOption + l0Obj.l1_cats
      .map(c => `<option value="${c.id}">${c.l1_name}</option>`).join('');
    updateL2();
  }

  function updateL2() {
    const l0Obj = categories.find(c => c.id === l0Select.value);
    if (!l0Obj || l1Select.value === 'All') { l2Select.innerHTML = allOption; updateL3(); return; }
    const l1Obj = l0Obj.l1_cats.find(c => c.id === l1Select.value);
    if (!l1Obj) return;
    l2Select.innerHTML = allOption + l1Obj.l2_cats
      .map(c => `<option value="${c.id}">${c.l2_name}</option>`).join('');
    updateL3();
  }

  function updateL3() {
    const l0Obj = categories.find(c => c.id === l0Select.value);
    if (!l0Obj || l1Select.value === 'All' || l2Select.value === 'All') { l3Select.innerHTML = allOption; return; }
    const l1Obj = l0Obj.l1_cats.find(c => c.id === l1Select.value);
    const l2Obj = l1Obj?.l2_cats.find(c => c.id === l2Select.value);
    if (!l2Obj) return;
    l3Select.innerHTML = allOption + l2Obj.l3_cats
      .map(c => `<option value="${c.id}">${c.l3_name}</option>`).join('');
  }

  l0Select.addEventListener('change', updateL1);
  l1Select.addEventListener('change', updateL2);
  l2Select.addEventListener('change', updateL3);

  // ---------- 初始化账户选择器 ----------
  const accounts = [];
  AppData.accountMeta.forEach(p => p.child_accounts.forEach(a => accounts.push(a)));
  accountSelect.innerHTML = ['All', ...accounts.map(a => a.name)].map(n => `<option>${n}</option>`).join('');

  // ---------- 渲染交易记录 ----------
  function renderTransactions() {
    const year = yearSelect.value;
    const month = monthSelect.value;
    const l0 = l0Select.value;
    const l1 = l1Select.value;
    const l2 = l2Select.value;
    const l3 = l3Select.value;
    const selectedAccounts = Array.from(accountSelect.selectedOptions).map(o => o.value);

    const data = AppData.transactions[year]?.[month] || [];

    const filtered = data.filter(tx => {
      if (!selectedAccounts.includes('All') && !selectedAccounts.includes(tx.account)) return false;
      if (l0 !== 'All' && tx.l0_category !== l0) return false;
      if (l1 !== 'All' && tx.l1_category !== l1) return false;
      if (l2 !== 'All' && tx.l2_category !== l2) return false;
      if (l3 !== 'All' && tx.l3_category !== l3) return false;
      return true;
    });

    // 显示/隐藏表头
    transactionHeader.style.display = filtered.length ? 'flex' : 'none';

    transactionList.innerHTML = filtered.map(tx => {
      const amountClass = tx.amount >= 0 ? 'positive' : 'negative';
      const date = tx.date instanceof Date ? tx.date.toLocaleDateString() : tx.date;

      return `
        <div class="transaction-card">
          <span>${date}</span>
          <span>${tx.l0_category || ''}</span>
          <span>${tx.l1_category || ''}</span>
          <span>${tx.l2_category || ''}</span>
          <span>${tx.l3_category || ''}</span>
          <span>${tx.account || ''}</span>
          <span class="amount ${amountClass}">${tx.amount}</span>
          <span>${tx.transaction_detail || ''}</span>
          <span>${tx.note || ''}</span>
        </div>
      `;
    }).join('');
  }

  // Apply Filter 按钮绑定
  applyBtn.addEventListener('click', renderTransactions);

  // 默认渲染
  updateL1(); // 初始化 L1-L3
  renderTransactions();
}
