from fileinput import filename

from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import subprocess

import os
import time
import json
import copy
import random
from datetime import datetime
from werkzeug.utils import secure_filename

import pandas as pd

from scripts.utils import *


app = Flask(__name__)
CORS(app)

AppData = None  # 用于存储从网页A接收的数据

@app.route("/")
def home():
    return render_template('index.html')

@app.route('/generate_index')
def generate_index():
    # 生成 transaction index
    subprocess.run(
        ['python', 'scripts/data_loader/build_transaction_index.py'],
        check=True
    )

    # 生成 balance index
    subprocess.run(
        ['python', 'scripts/data_loader/build_balance_index.py'],
        check=True
    )

    return jsonify({"status": "ok"})


@app.route('/save_csv_file', methods=['POST'])
def save_csv_file():
    data = request.json

    transactions = data.get("data")
    file_path = data.get("filepath")

    if transactions is None or file_path is None:
        return jsonify({"status": "error", "message": "Missing data or filepath"}), 400

    # 确保目录存在
    try:
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
    except Exception as e:
        return jsonify({"status": "error", "message": f"Failed to create directories: {e}"}), 500

    try:
        # 将列表字典转 DataFrame，再保存为 CSV
        df = pd.DataFrame(transactions)

        # 保存 CSV
        df.to_csv(file_path, index=False, encoding='utf-8-sig')  # 中文可读

        print(f"💾 Saved CSV: {file_path}")

        return jsonify({"status": "ok", "file": file_path})

    except Exception as e:
        print("❌ Save failed:", e)
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/update_transactions', methods=['POST'])
def update_transactions():
    payload = request.get_json(silent=True) or {}
    account = str(payload.get('account', '')).strip()
    transactions = payload.get('transactions')

    try:
        year = f"{int(payload.get('year')):04d}"
        month = f"{int(payload.get('month')):02d}"
        if not 1 <= int(month) <= 12:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({"status": "error", "message": "Invalid year or month"}), 400

    account_file_name = secure_filename(account)
    if not account_file_name or not isinstance(transactions, list) or not transactions:
        return jsonify({"status": "error", "message": "Account and transactions are required"}), 400

    required_fields = {
        'date', 'transaction_detail', 'amount',
        'l0_category', 'l1_category', 'l2_category', 'l3_category',
    }
    for transaction in transactions:
        if not isinstance(transaction, dict) or not required_fields.issubset(transaction):
            return jsonify({"status": "error", "message": "Invalid transaction data"}), 400
        try:
            transaction_date = datetime.strptime(transaction['date'], '%Y-%m-%d')
            float(transaction['amount'])
        except (TypeError, ValueError):
            return jsonify({"status": "error", "message": "Invalid transaction date or amount"}), 400
        if transaction_date.strftime('%Y-%m') != f"{year}-{month}" or not transaction['transaction_detail'].strip():
            return jsonify({"status": "error", "message": "Transaction does not match the selected month"}), 400
        transaction['account'] = account

    relative_path = os.path.join(
        'static', 'data', 'transaction_history', year, month,
        f"{year}_{month}_{account_file_name}.csv",
    )
    file_path = os.path.join(app.root_path, relative_path)

    try:
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        new_rows = pd.DataFrame(transactions)
        if os.path.exists(file_path):
            old_rows = pd.read_csv(file_path, encoding='utf-8-sig')
            new_rows = pd.concat([old_rows, new_rows], ignore_index=True)
        new_rows.to_csv(file_path, index=False, encoding='utf-8-sig')
        return jsonify({"status": "ok", "file": relative_path.replace(os.sep, '/')})
    except Exception as error:
        app.logger.exception('Failed to append transaction history')
        return jsonify({"status": "error", "message": str(error)}), 500


@app.route('/api/update_balance', methods=['POST'])
def update_balance():
    payload = request.get_json(silent=True) or {}
    try:
        year = f"{int(payload.get('year')):04d}"
        month = f"{int(payload.get('month')):02d}"
        if not 1 <= int(month) <= 12:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({"status": "error", "message": "Invalid year or month"}), 400

    balances = payload.get('data')
    if not isinstance(balances, list) or not balances:
        return jsonify({"status": "error", "message": "Balance data is required"}), 400
    if any(
        not isinstance(item, dict)
        or not isinstance(item.get('name'), str)
        or not item['name'].strip()
        or isinstance(item.get('balance'), bool)
        or not isinstance(item.get('balance'), (int, float))
        for item in balances
    ):
        return jsonify({"status": "error", "message": "Invalid balance data"}), 400

    relative_path = os.path.join('static', 'data', 'balance', year, f'{month}.json')
    file_path = os.path.join(app.root_path, relative_path)
    try:
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, 'w', encoding='utf-8') as balance_file:
            json.dump(balances, balance_file, indent=4, ensure_ascii=False)

        index_path = os.path.join(app.root_path, 'static', 'data', 'balance_index.json')
        with open(index_path, encoding='utf-8') as index_file:
            index = json.load(index_file)
        months = set(index.get(year, []))
        months.add(month)
        index[year] = sorted(months)
        with open(index_path, 'w', encoding='utf-8') as index_file:
            json.dump(index, index_file, indent=2)

        return jsonify({"status": "ok", "file": relative_path.replace(os.sep, '/')})
    except Exception as error:
        app.logger.exception('Failed to save balance history')
        return jsonify({"status": "error", "message": str(error)}), 500
    


@app.route('/save_json_file', methods=['POST'])
def save_json_file():
    data = request.json

    # 获取参数
    content = data.get("data")
    file_path = data.get("filepath")

    if content is None or file_path is None:
        return jsonify({"status": "error", "message": "Missing data or filepath"}), 400

    #  写入 JSON
    try:
        with open(file_path, 'w') as f:
            json.dump(content, f, indent=4)

        print(f"💾 Saved: {file_path}")

        return jsonify({"status": "ok", "file": file_path})

    except Exception as e:
        print("❌ Save failed:", e)
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/upload_appdata', methods=['POST'])
def upload_appdata():
    global AppData
    AppData = request.json

    # 这里你就拿到完整 AppData 了
    print("Received AppData")

    # 你可以：
    # - 存缓存
    # - 存文件
    # - 或直接返回给网页B

    return jsonify({"status": "ok"})

@app.route('/get_appdata', methods=['GET'])
def get_appdata():
    global AppData

    if AppData is None:
        return jsonify({"error": "No data"}), 404

    return jsonify(AppData)


if __name__ == "__main__":
    SERVER_NAME = "0.0.0.0"

    app.run(
        host = SERVER_NAME,
        debug=True
    )
