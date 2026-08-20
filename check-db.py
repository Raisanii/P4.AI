import sqlite3
conn = sqlite3.connect("prisma/dev.db")
tables = [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
print("prisma/dev.db tables:", tables)
for t in tables:
    if t.startswith("_"):
        continue
    cnt = conn.execute(f"SELECT COUNT(*) FROM [{t}]").fetchone()[0]
    print(f"  {t}: {cnt} rows")
conn.close()

print()
conn2 = sqlite3.connect("dev.db")
tables2 = [r[0] for r in conn2.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
print("dev.db tables:", tables2)
conn2.close()
