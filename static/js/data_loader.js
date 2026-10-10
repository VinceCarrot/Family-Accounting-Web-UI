// js/data_loader.js

window.AppData = {
  accountMeta: null,
  categories: null,
  mortgageMeta: null,
  transactions: {},
  balance: {},
  historicalSpendIncome: []
};

/* ---------- 工具函数 ---------- */

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

/**
 * 自动类型转换
 */
function autoCast(value) {
  if (value === undefined) return null;

  const v = value.trim();

  if (v === '' || v === 'null' || v === 'undefined') {
    return null;
  }

  // number, including CSV values formatted with thousands separators
  if (/^-?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/.test(v)) {
    return Number(v.replace(/,/g, ''));
  }

  const dateOnly = v.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (
      date.getUTCFullYear() === Number(year) &&
      date.getUTCMonth() === Number(month) - 1 &&
      date.getUTCDate() === Number(day)
    ) {
      return date;
    }
    return v;
  }

  // date (ISO / yyyy-mm-dd / yyyy/mm/dd)
  if (
    /^\d{4}-\d{2}-\d{2}/.test(v) ||
    /^\d{4}\/\d{2}\/\d{2}/.test(v) ||
    /^\d{4}-\d{2}-\d{2}T/.test(v)
  ) {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d;
  }

  return v;
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field === '') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

async function loadCSV(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;

    const text = await res.text();
    const rows = parseCSV(text);
    if (rows.length <= 1) return [];

    const headers = rows[0].map((header, i) =>
      (i === 0 ? header.replace(/^\uFEFF/, '') : header).trim()
    );

    return rows.slice(1).filter(values => values.some(value => value !== '')).map(values => {
      const obj = {};

      headers.forEach((h, i) => {
        obj[h] = autoCast(values[i]);
      });

      return obj;
    });
  } catch (err) {
    // 网络错误或解析错误，返回 null，不报错
    return null;
  }
}

function getTransactionDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/* ---------- 主入口 ---------- */

export async function loadAllData() {
  console.log('📦 Loading base data...');

  // 1️⃣ 加载 accountMeta 和 categories
  const [accountMeta, categories, mortgageMeta, historicalSpendIncome] = await Promise.all([
    loadJSON('/static/data/account_meta_data.json'),
    loadJSON('/static/data/categories.json'),
    loadJSON('/static/data/mortgage_meta_data.json'),
    loadJSON('/static/data/income_spend_2017_2025.json')
  ]);

  AppData.accountMeta = accountMeta;
  AppData.mortgageMeta = mortgageMeta;
  AppData.categories = categories;
  AppData.historicalSpendIncome = historicalSpendIncome;

  // 2️⃣ 调用服务器端 Python 脚本生成 transaction_index.json
  try {
    await fetch('/generate_index'); // Flask 路由触发 Python 脚本
  } catch (err) {
    console.warn('⚠️ Failed to trigger index generation, maybe already exists');
  }

  // 3️⃣ 加载 transaction index
  const index = await loadJSON('/static/data/transaction_index.json');
  const transactionFiles = new Set();

  for (const year in index) {
    const monthFiles = Array.isArray(index[year])
      ? Object.fromEntries(index[year].map(mm => [mm, [`${mm}.csv`]]))
      : index[year];

    for (const files of Object.values(monthFiles)) {
      for (const file of files) {
        const encodedPath = file.split('/').map(encodeURIComponent).join('/');
        transactionFiles.add(`/static/data/transaction_history/${year}/${encodedPath}`);
      }
    }
  }

  await Promise.all(Array.from(transactionFiles, async path => {
    const rows = await loadCSV(path);
    let invalidDateCount = 0;

    for (const transaction of rows || []) {
      const date = getTransactionDate(transaction.date);
      if (!date) {
        invalidDateCount += 1;
        continue;
      }

      const year = String(date.getUTCFullYear());
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      AppData.transactions[year] ||= {};
      AppData.transactions[year][month] ||= [];
      AppData.transactions[year][month].push(transaction);
    }

    if (invalidDateCount > 0) {
      console.warn(`Skipped ${invalidDateCount} transaction(s) with invalid dates in ${path}`);
    }
  }));

  for (const months of Object.values(AppData.transactions)) {
    for (const transactions of Object.values(months)) {
      transactions.sort((a, b) =>
        getTransactionDate(a.date).getTime() - getTransactionDate(b.date).getTime()
      );
    }
  }

  // 4️⃣ 加载 balance history
  const balanceIndex = await loadJSON('/static/data/balance_index.json');
  const balanceTasks = [];

  for (const year in balanceIndex) {
    for (const mm of balanceIndex[year]) {
      const path = `/static/data/balance/${year}/${mm}.json`;
      const task = loadJSON(path).then(data => {
        if (!data) return;
           
        if (!AppData.balance[year]) {
          AppData.balance[year] = {};
        }

          AppData.balance[year][mm] = data;
        });

      balanceTasks.push(task);
    }
  }
  

  await Promise.all(balanceTasks);
  
  syncAppData(AppData);
  console.log('✅ All data loaded');
  return AppData;
}


export async function syncAppData(AppData) {
  await fetch('/upload_appdata', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(AppData)
  });
}
