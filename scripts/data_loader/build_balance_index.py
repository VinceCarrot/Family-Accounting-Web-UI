import os
import json

# balance 数据目录路径
DATA_DIR = 'static/data/balance/'
OUTPUT_FILE = 'static/data/balance_index.json'

index = {}

# 扫描合理年份范围（可按需调整）
for year in range(2009, 2091):
    year_str = str(year)
    year_path = os.path.join(DATA_DIR, year_str)

    if not os.path.isdir(year_path):
        continue

    months = []

    for mm in sorted(os.listdir(year_path)):
        if mm.endswith('.json'):
            months.append(mm.replace('.json', ''))

    if months:
        index[year_str] = months


# 确保 static/data 目录存在
os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

with open(OUTPUT_FILE, 'w') as f:
    json.dump(index, f, indent=2)

print(f"balance_index.json generated with {len(index)} years")
