import duckdb
import os
import time
from datetime import datetime

DB_PATH = "sensor_data.duckdb"

def to_epoch(val):
    if hasattr(val, 'timestamp'): return val.timestamp()
    if type(val) is int or type(val) is float: return val
    return float(val)

def debug_query():
    print(f"Connecting to {DB_PATH}...")
    con = duckdb.connect(DB_PATH, read_only=True)
    
    # Simulate params
    width = 1440
    start = None
    end = None
    sensor_filter = []
    
    with open("debug_output.txt", "w", encoding="utf-8") as f:
        def log(msg):
            print(msg)
            f.write(str(msg) + "\n")

        # 1. Range
        log("Fetching Range...")
        # COMPARE: Raw datetime vs Epoch from DB
        range_row = con.execute("SELECT min(time), max(time), min(epoch(time)), max(epoch(time)) FROM sensors").fetchone()
        db_min, db_max, db_min_epoch, db_max_epoch = range_row
        
        log(f"Raw DB Min: {db_min} ({type(db_min)})")
        log(f"DB Min Epoch: {db_min_epoch}")
        
        py_epoch = to_epoch(db_min)
        log(f"Python Converted Epoch: {py_epoch}")
        
        diff = db_min_epoch - py_epoch
        log(f"Difference (DB - Python): {diff} seconds")

        # USE DB EPOCH for correctness
        start = db_min_epoch
        end = db_max_epoch
        
        # 2. Bucket
        duration = end - start
        if width <= 0: width = 1000
        bucket_size = duration / width
        log(f"Duration: {duration}")
        log(f"Width: {width}")
        log(f"Bucket Size: {bucket_size}")
        
        if duration <= 0:
            log("Duration is <= 0!")
            return

        # 3. Query
        f_start = f"{start:.6f}"
        f_end = f"{end:.6f}"
        f_bucket = f"{bucket_size:.6f}"
        
        log(f"Query Params: f_start={f_start}, f_end={f_end}, f_bucket={f_bucket}")
        
        where_clause = f"epoch(time) >= {f_start} AND epoch(time) <= {f_end}"
        
        query = f"""
            SELECT 
                CAST(FLOOR((epoch(time) - {f_start}) / {f_bucket}) AS INTEGER) as bucket_idx,
                avg(value) as avg_val,
                count(*) as count,
                min(epoch(time)) as min_t,
                max(epoch(time)) as max_t
            FROM sensors 
            WHERE {where_clause}
            GROUP BY bucket_idx
            ORDER BY bucket_idx ASC
        """
        
        log("Executing Query...")
        rows = con.execute(query).fetchall()
        log(f"Result Rows: {len(rows)}")
        
        if len(rows) < 20:
            for r in rows:
                log(f"Row: {r}")
        else:
            log(f"First 5: {rows[:5]}")
            log(f"Last 5: {rows[-5:]}")

if __name__ == "__main__":
    debug_query()
