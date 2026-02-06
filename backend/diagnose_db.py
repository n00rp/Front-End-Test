import duckdb
import math

DB_PATH = "sensor_data.duckdb"

try:
    print(f"Connecting to {DB_PATH}...")
    con = duckdb.connect(DB_PATH, read_only=True)
    
    print("\n--- General Stats ---")
    count = con.execute("SELECT count(*) FROM sensors").fetchone()[0]
    print(f"Total Rows: {count}")
    
    print("\n--- Time Range Stats ---")
    # stats
    times = con.execute("SELECT min(time), max(time), min(epoch(time)), max(epoch(time)) FROM sensors").fetchone()
    min_time_s, max_time_s, min_epoch, max_epoch = times
    
    print(f"Min Time: {min_time_s} (Epoch: {min_epoch})")
    print(f"Max Time: {max_time_s} (Epoch: {max_epoch})")
    
    if min_epoch and max_epoch:
        diff = max_epoch - min_epoch
        print(f"Duration (sec): {diff}")
        print(f"Duration (hours): {diff / 3600}")
        print(f"Duration (years): {diff / (3600*24*365)}")
        
        # Test Bucketing Logic
        width = 1440
        bucket_size = diff / 1440
        print(f"\n--- Bucketing Simulation (Width={width}) ---")
        print(f"Bucket Size: {bucket_size} seconds")
        
        if bucket_size > 3600:
             print("⚠️  WARNING: Bucket size is larger than 1 hour!")
             print("   If your actual data is only 1 hour long, it will all fit in ONE bucket.")
             
    # Check for Outliers
    print("\n--- Distribution Check ---")
    # Check counts by year
    years = con.execute("SELECT year(time), count(*) FROM sensors GROUP BY year(time)").fetchall()
    print("Rows per Year:")
    for y in years:
        print(f"  {y[0]}: {y[1]} rows")
        
except Exception as e:
    print(f"Error: {e}")
finally:
    if 'con' in locals(): con.close()
