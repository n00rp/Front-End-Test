import duckdb
import glob
import os
import time

DB_PATH = "sensor_data.duckdb"
CSV_PATTERN = "data/*.csv" # User can adjust this

def ingest_data():
    print(f"Initializing DuckDB at {DB_PATH}...")
    con = duckdb.connect(DB_PATH)

    # Check if we have files
    files = glob.glob(CSV_PATTERN)
    if not files:
        print(f"No CSV files found matching {CSV_PATTERN}")
        # Create a dummy table for the API to not crash
        con.execute("CREATE TABLE IF NOT EXISTS sensors (time DOUBLE, sensor_id VARCHAR, value DOUBLE)")
        return

    print(f"Found {len(files)} CSV files. Starting ingestion...")
    start_time = time.time()

    # Create table schema (using the first file as template)
    # Assuming CSV structure: time, sensor_id, value (or similar)
    # For this PoC, we'll try to use DuckDB's auto-detect schema from all files
    try:
        con.execute(f"""
            CREATE TABLE IF NOT EXISTS sensors AS 
            SELECT * FROM read_csv_auto('{CSV_PATTERN}', filename=True)
        """)
        
        # Optimize table for read performance
        print("Indexing data...")
        # Assuming the time column is named 'time' or we find it. 
        # In a real scenario we'd be more explicit.
        # con.execute("CREATE INDEX IF NOT EXISTS idx_time ON sensors(time)")
        
    except Exception as e:
        print(f"Ingestion failed: {e}")
        return

    duration = time.time() - start_time
    print(f"Ingestion complete in {duration:.2f} seconds.")
    
    # Verify count
    count = con.execute("SELECT count(*) FROM sensors").fetchone()[0]
    print(f"Total rows in DB: {count}")
    
    con.close()

if __name__ == "__main__":
    # Create data directory if not exists
    if not os.path.exists("data"):
        os.makedirs("data")
        print("Created 'data' directory. Please place your CSV files there.")
    
    ingest_data()
