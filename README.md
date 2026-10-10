# Family Accounting Web UI

A Flask-based web interface for viewing family finances and maintaining transaction, account-balance, category, and mortgage data. The application keeps its data files under `static/data/`; this repository intentionally does not include personal financial records.

## Sidebar Pages

- **Dashboard**: At-a-glance assets, recent asset and cash-flow trends, and the mortgage balance.
- **Transaction History**: Browse transactions by year, month, category, and account.
- **Monthly Report**: Compare selected account balances month by month, with monthly asset and cash-flow summaries and charts.
- **Statistics**: Explore spending or income by account and time period, using pie or bar charts and category drill-down.
- **Customized View**: Plot monthly or yearly transaction trends for selected accounts and categories.
- **Tools**: Enter transactions and monthly balances, manage accounts, download account/category metadata, and update the mortgage balance.

## Requirements and Run

Use Python 3.11 or a compatible Python environment. From this directory (`WebUI_Server`):

```bash
python -m pip install -r requirements.txt
python app.py
```

Open <http://localhost:5000>. Run the application with `WebUI_Server` as the working directory because the data and index-generation scripts use paths relative to it.

## First-Run Data Setup

The application expects the following local files under `static/data/`. These are intentionally ignored by Git, so create them yourself after cloning. Use the examples below as starter data, replacing the sample labels and IDs with your own. Keep the filenames exactly as shown.

### `account_meta_data.json`

This is a JSON array of account groups. Each group has a `name` and a `child_accounts` array. Every account needs a unique string `id`, a display `name`, and an `active` boolean. `cash_flow` determines whether the account is included in cash-flow totals. The remaining fields are optional metadata.

```json
[
  {
    "name": "Cash",
    "child_accounts": [
      {
        "id": "cash-001",
        "name": "Everyday Account",
        "active": true,
        "cash_flow": true,
        "bank": "",
        "balance": 0,
        "account_number": "",
        "branch": "",
        "branch_code": "",
        "swift_code": ""
      }
    ]
  }
]
```

Add any number of groups/accounts. Account names should be unique because the UI uses them to match balances and transactions.

### `categories.json`

This is an array of top-level categories. Categories can have up to four levels; each node uses an `id`, its level-specific name field, and (except at the last level) a child array. IDs should be unique among siblings and represented as strings.

```json
[
  {
    "id": "spend",
    "l0_name": "Spend",
    "l1_cats": [
      {
        "id": "home",
        "l1_name": "Home",
        "l2_cats": [
          {
            "id": "utilities",
            "l2_name": "Utilities",
            "l3_cats": [
              {
                "id": "electricity",
                "l3_name": "Electricity"
              }
            ]
          }
        ]
      }
    ]
  }
]
```

Use `l1_cats`, `l2_cats`, and `l3_cats` for child arrays at levels 0, 1, and 2 respectively. A node with no children can use an empty array for its child field. Include a top-level `Income` category if you want income categories in transaction entry and statistics.

### `mortgage_meta_data.json`

The mortgage balance is numeric. `update_time` is an ISO date/time string; the Tools page updates both fields when you save a new balance.

```json
{
  "balance": 0,
  "update_time": "2026-01-31T23:59:59Z"
}
```

### Historical Data and Empty Startup

`static/data/income_spend_2017_2025.json` is also loaded at startup. Create it as an empty array (`[]`) when there is no historical summary data. To provide historical monthly totals, use an array of objects with numeric `year`, `month`, `spend`, and `income` fields, for example:

```json
[
  { "year": 2025, "month": 1, "spend": 0, "income": 0 }
]
```

Transaction history is stored as CSV files under `static/data/transaction_history/`; balance history is stored as monthly JSON files under `static/data/balance/`. Both are created/updated by the Tools page. The transaction and balance index JSON files are generated automatically when the app starts. With no history files, reports and charts will have little or no historical data, but the app can still be used to start entering records.

