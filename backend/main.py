from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import duckdb
import os

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, set to specific domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "sensor_data.duckdb"

def get_db_connection():
    if not os.path.exists(DB_PATH):
        raise HTTPException(status_code=500, detail="Database not initialized. Run ingest_csv.py first.")
    return duckdb.connect(DB_PATH, read_only=True)

@app.get("/")
def read_root():
    return {"status": "online", "system": "Sensor Platform Backend (DuckDB)"}

@app.get("/api/status")
def get_status():
    try:
        con = get_db_connection()
        count = con.execute("SELECT count(*) FROM sensors").fetchone()[0]
        # Get time range
        # time_range = con.execute("SELECT min(time), max(time) FROM sensors").fetchone()
        con.close()
        return {"row_count": count, "db_engine": "DuckDB"}
    except Exception as e:
        return {"error": str(e), "hint": "Have you put CSV files in 'backend/data' and ran ingest_csv.py?"}

@app.get("/api/data")
def get_sensor_data(start: float = None, end: float = None, width: int = 1000):
    try:
        con = get_db_connection()
        
        # 1. Determine time range if not provided
        if start is None or end is None:
            range_row = con.execute("SELECT min(time), max(time) FROM sensors").fetchone()
            if not range_row or range_row[0] is None:
                return [[], []] # Empty DB
            db_min, db_max = range_row
            
            print(f"DEBUG: RAW DB Min: {db_min} Type: {type(db_min)}")
            print(f"DEBUG: RAW DB Max: {db_max} Type: {type(db_max)}")
            
            # Helper to ensure we work with floats (Unix Epoch)
            def to_epoch(val):
                if hasattr(val, 'timestamp'): return val.timestamp()
                # Handle pandas Timestamp specifically if needed, though hasattr timestamp covers it
                if type(val) is int or type(val) is float: return val
                return float(val) # Try casting
                
            start = start if start is not None else to_epoch(db_min)
            end = end if end is not None else to_epoch(db_max)

        print(f"DEBUG: Final Start: {start} Type: {type(start)}")
        print(f"DEBUG: Final End: {end} Type: {type(end)}")

        # 2. Calculate dynamic bucket size based on screen width (pixels)
        duration = end - start
        
        # Avoid division by zero
        if width <= 0: width = 1000
        
        bucket_size = duration / width
        
        print(f"DEBUG: Duration: {duration}")
        print(f"DEBUG: Width: {width}")
        print(f"DEBUG: Bucket Size: {bucket_size}")
        
        if duration <= 0: return [[], []]
        
        # 3. Optimized Aggregation Query (The "Magic" Part)
        
        # 3. Optimized Aggregation Query (The "Magic" Part)
        # Instead of SELECT *, we bucketize the data.
        # We fetch MIN and MAX for each bucket to keep the visual "shape" of the noisy data (M4-like approach)
        
        # TIME HANDLING: 
        # Frontend (uPlot) expects Unix Timestamp in SECONDS (float).
        # DuckDB stores 'time' as TIMESTAMP. We must use epoch(time) to convert to seconds.
        
        query = f"""
            SELECT 
                (FLOOR((epoch(time) - {start}) / {bucket_size}) * {bucket_size} + {start}) as time_bucket,
                avg(value) as avg_val,
                min(value) as min_val,
                max(value) as max_val
            FROM sensors 
            WHERE epoch(time) >= ? AND epoch(time) <= ?
            GROUP BY time_bucket
            ORDER BY time_bucket ASC
        """
        
        # Fetch directly as result set (iterator), do NOT fetch_df() which is memory heavy
        result = con.execute(query, [start, end]).fetchall()
        con.close()
        
        # 4. Transform to uPlot format: [ [time_series], [value_series_1], ... ]
        # We simulate "3 series" here: Average, Min, Max (optional, or just return Avg)
        # For simplicity in this PoC, let's just return the Average as the main line.
        # If specific sensors are requested, we would add WHERE sensor_id = '..'
        
        times = []
        values = []
        
        for row in result:
            times.append(row[0])
            values.append(row[1]) # Using Average for visualisation
            
        return [times, values]
        
    except Exception as e:
         print(f"Error: {e}")
         raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
