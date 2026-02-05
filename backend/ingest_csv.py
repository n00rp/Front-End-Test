import duckdb
import glob
import os
import time

DB_PATH = "sensor_data.duckdb"
DATA_DIR = "data"
CSV_PATTERN = f"{DATA_DIR}/*.csv"

# --- CONFIGURATION (Match this to your CSV file headers!) ---
# Input Component (What are the headers in your CSV files?)
CSV_TIME_HEADER = "time"   # e.g., 'time', 'timestamp', 'Date'
CSV_VALUE_HEADER = "value" # e.g., 'value', 'voltage', 'data'
HAS_HEADER = True          # Set to False if files have no header row

# Output Component (Schema in DuckDB) - Do not change these unless you update main.py
DB_TIME_COL = "time"
DB_VALUE_COL = "value"
DB_SENSOR_COL = "sensor_id" 
# ------------------------------------------------------------

def ingest_data():
    print(f"Initializing DuckDB at {DB_PATH}...")
    con = duckdb.connect(DB_PATH)

    files = glob.glob(CSV_PATTERN)
    if not files:
        print(f"No CSV files found matching {CSV_PATTERN}")
        print(f"Please put your .csv files in the '{DATA_DIR}' folder.")
        # Create table anyway to avoid API crash
        con.execute(f"CREATE TABLE IF NOT EXISTS sensors ({DB_TIME_COL} TIMESTAMP, {DB_SENSOR_COL} VARCHAR, {DB_VALUE_COL} DOUBLE)")
        return

    print(f"Found {len(files)} CSV files. Starting ingestion...")
    start_time = time.time()

    try:
        # 1. Reset Database
        con.execute("DROP TABLE IF EXISTS sensors")
        
        # 2. Create Normalized Schema
        # We store everything in ONE efficient table, but with a 'sensor_id' column to distinguish them.
        con.execute(f"""
            CREATE TABLE sensors (
                {DB_TIME_COL} TIMESTAMP, 
                {DB_SENSOR_COL} VARCHAR, 
                {DB_VALUE_COL} DOUBLE
            )
        """)
        
        print("Importing and normalizing data...")
        # 3. Smart Insert with Filename Extraction
        # We read all CSVs at once using read_csv_auto
        # We map your CSV headers to our standardized DB columns
        # We extract 'sensor_id' from the filename (e.g. data/sensor_01.csv -> sensor_01.csv)
        
        # TIME FIX: User data is relative (0.0, 0.1...). 
        # We need to anchor this to a real date (e.g., NOW) so it shows up on the calendar.
        # We add the current epoch (time.time()) to the relative value.
        current_epoch = time.time()
        
        # TIME FIX: User data is relative (0.0, 0.1...). 
        # We need to anchor this to a real date (e.g., NOW) so it shows up on the calendar.
        # We add the current epoch (time.time()) to the relative value.
        current_epoch = time.time()
        
        query = f"""
            INSERT INTO sensors 
            SELECT 
                to_timestamp({current_epoch} + "{CSV_TIME_HEADER}") as {DB_TIME_COL}, 
                regexp_replace(filename, '.*[\\\\/]', '') as {DB_SENSOR_COL}, 
                "{CSV_VALUE_HEADER}" as {DB_VALUE_COL}
            FROM read_csv('{CSV_PATTERN}', filename=True, header={HAS_HEADER}, union_by_name=True, auto_detect=True)
        """
        
        print(f"Executing: {query}")
        con.execute(query)

        # 4. Create Indexes for Performance
        print("Indexing time column...")
        con.execute(f"CREATE INDEX idx_time ON sensors({DB_TIME_COL})")
        print("Indexing sensor_id...")
        con.execute(f"CREATE INDEX idx_sensor ON sensors({DB_SENSOR_COL})")

        duration = time.time() - start_time
        count = con.execute("SELECT count(*) FROM sensors").fetchone()[0]
        print(f"SUCCESS: Ingested {count} rows in {duration:.2f}s.")
        
    except Exception as e:
        print(f"\n!!! INGESTION FAILED !!!")
        print(f"Error: {e}")
        print("-" * 50)
        print(f"Check the CONFIGURATION section at the top of this script.")
        print(f"1. Does your CSV have a header row? (Current setting: HAS_HEADER={HAS_HEADER})")
        print(f"2. Does the time column header match '{CSV_TIME_HEADER}'?")
        print(f"3. Does the value column header match '{CSV_VALUE_HEADER}'?")
        print("-" * 50)
        return
    finally:
        con.close()

if __name__ == "__main__":
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
        print(f"Created '{DATA_DIR}' directory. Please copy your CSVs here.")
    else:
        ingest_data()
