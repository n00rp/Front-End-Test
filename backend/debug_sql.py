import duckdb
import math

DB_PATH = "sensor_data.duckdb"

print(f"Connecting to {DB_PATH}...")
con = duckdb.connect(DB_PATH, read_only=True)

# 1. Get Limits
times = con.execute("SELECT min(time), max(time) FROM sensors").fetchone()
db_min, db_max = times
print(f"DB Range: {db_min} -> {db_max}")

# 2. Simulate Params from Log
start = db_min.timestamp()
end = db_max.timestamp()
width = 1000
duration = end - start
bucket_size = duration / width

print(f"Params: start={start}, end={end}, bucket_size={bucket_size}")

# 3. Test Bucket Query Logic (Simplified)
# Just check bucket IDs for first 10 rows
test_query = f"""
    SELECT 
        time,
        epoch(time) as ep,
        (FLOOR((epoch(time) - {start}) / {bucket_size}) * {bucket_size} + {start}) as bucket_start
    FROM sensors 
    LIMIT 10
"""
print("\n--- Bucket Calculation Check (First 10 rows) ---")
res = con.execute(test_query).fetchall()
for r in res:
    print(r)

# 4. Run the Full Aggregate Query
agg_query = f"""
    SELECT 
        (FLOOR((epoch(time) - {start}) / {bucket_size}) * {bucket_size} + {start}) as time_bucket,
        avg(value) as avg_val
    FROM sensors 
    WHERE epoch(time) >= {start} AND epoch(time) <= {end}
    GROUP BY time_bucket
    ORDER BY time_bucket ASC
"""
print("\n--- Full Aggregate Check ---")
agg_res = con.execute(agg_query).fetchall()
print(f"Row Count: {len(agg_res)}")
if len(agg_res) > 0:
    print(f"First Row: {agg_res[0]}")
    print(f"Last Row: {agg_res[-1]}")
else:
    print("Zero rows returned!")

con.close()
