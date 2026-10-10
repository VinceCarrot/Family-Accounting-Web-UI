import os
import json
import re

# data 目录路径
DATA_DIR = 'static/data/transaction_history/'
OUTPUT_FILE = 'static/data/transaction_index.json'

index = {}

for year in range(2009, 2091):
    year_str = str(year)
    year_path = os.path.join(DATA_DIR, year_str)

    if not os.path.isdir(year_path):
        continue

    # print(year_path)

    months = {}
    for entry in sorted(os.scandir(year_path), key=lambda item: item.name):
        if entry.is_dir():
            csv_files = [
                f"{entry.name}/{filename}"
                for filename in sorted(os.listdir(entry.path))
                if filename.lower().endswith('.csv')
                and os.path.isfile(os.path.join(entry.path, filename))
            ]
            if csv_files:
                months[entry.name] = csv_files
        elif entry.is_file() and entry.name.lower().endswith('.csv'):
            stem = os.path.splitext(entry.name)[0]
            account_file = re.match(rf"^{year_str}_(\d{{2}})_", stem)
            month = account_file.group(1) if account_file else stem
            months.setdefault(month, []).append(entry.name)

    if months:
        index[year_str] = months

# 确保 static/data 目录存在
os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

with open(OUTPUT_FILE, 'w') as f:
    json.dump(index, f, indent=2)

print(f"transaction_index.json generated with {len(index)} years")
