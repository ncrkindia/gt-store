import json
import uuid

with open('products.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

ids = [line.strip() for line in lines if len(line.strip()) == 24]

if not ids:
    print("No products found.")
    exit(0)

sql = "INSERT INTO inventory (id, product_id, stock) VALUES \n"
values = []
for pid in ids:
    values.append(f"('{uuid.uuid4()}', '{pid}', 100)")

sql += ",\n".join(values) + "\nON CONFLICT DO NOTHING;\n"

with open('insert_stock.sql', 'w', encoding='utf-8') as f:
    f.write(sql)

print(f"Generated SQL for {len(ids)} products.")
