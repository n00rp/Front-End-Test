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

@app.get("/api/sensors")
def get_sensors():
    try:
        con = get_db_connection()
        # Fetch distinct sensor IDs (assuming we have a sensor_id column or implicitly file-based)
        # In our schema, we have 'sensor_id' column or we can assume filenames from ingest.
        # Let's check schema first. The ingest script adds 'sensor_id'.
        sensors = con.execute("SELECT DISTINCT sensor_id FROM sensors ORDER BY sensor_id").fetchall()
        con.close()
        
        # Flatten list of tuples [('s1',), ('s2',)] -> ['s1', 's2']
        sensor_list = [s[0] for s in sensors]
        
        # Group them for the UI (Mock grouping for now based on name)
        # e.g. signal_0001 -> "Group A"
        grouped = {
            "Generated Signals": sensor_list
        }
        
        return grouped
    except Exception as e:
        print(f"Error fetching sensors: {e}")
        return {"error": str(e)}

@app.get("/api/data")
def get_sensor_data(start: float = None, end: float = None, width: int = 1000, ids: str = ""):
    try:
        con = get_db_connection()
        
        # Parse IDs
        sensor_filter = []
        if ids and ids.strip():
            sensor_filter = [s.strip() for s in ids.split(',') if s.strip()]
        
        print(f"DEBUG: Request Params -> Width: {width}, Sensors: {len(sensor_filter)}")

        # 1. Determine time range if not provided
        if start is None or end is None:
            # Optimize: Get range only for selected sensors if specified
            if sensor_filter:
                # Use parameterized query for safety
                placeholders = ', '.join(['?'] * len(sensor_filter))
                range_query = f"SELECT min(epoch(time)), max(epoch(time)) FROM sensors WHERE sensor_id IN ({placeholders})"
                range_row = con.execute(range_query, sensor_filter).fetchone()
            else:
                range_row = con.execute("SELECT min(epoch(time)), max(epoch(time)) FROM sensors").fetchone()
                
            if not range_row or range_row[0] is None:
                return [[], []] # Empty DB or no match
            db_min, db_max = range_row
            
            # Helper to ensure we work with floats (Unix Epoch)
            def to_epoch(val):
                if hasattr(val, 'timestamp'): return val.timestamp()
                if type(val) is int or type(val) is float: return val
                return float(val)

            start = start if start is not None else db_min
            end = end if end is not None else db_max

        # 2. Calculate dynamic bucket size
        duration = end - start
        if width <= 0: width = 1000
        bucket_size = duration / width
        
        if duration <= 0: return {"time": [], "series": []}
        
        # 3. Optimized Aggregation Query
        # We group by integer bucket index AND sensor_id.
        
        f_start = f"{start:.6f}"
        f_end = f"{end:.6f}"
        f_bucket = f"{bucket_size:.6f}"
        
        where_clause = f"epoch(time) >= {f_start} AND epoch(time) <= {f_end}"
        params = []
        
        if sensor_filter:
            # Add sensor filter
            placeholders = ', '.join(['?'] * len(sensor_filter))
            where_clause += f" AND sensor_id IN ({placeholders})"
            params = sensor_filter

        query = f"""
            SELECT 
                CAST(FLOOR((epoch(time) - {f_start}) / {f_bucket}) AS INTEGER) as bucket_idx,
                sensor_id,
                avg(value) as avg_val
            FROM sensors 
            WHERE {where_clause}
            GROUP BY bucket_idx, sensor_id
            ORDER BY bucket_idx ASC
        """
        
        rows = con.execute(query, params).fetchall()
        # print(f"DEBUG: Aggregated {len(rows)} points.")
        con.close()
        
        # 4. Pivot Data for Frontend (Unified Time Axis)
        # We need a dense array of times, and sparse arrays for each sensor (filling gaps with None or NaN)
        # However, uPlot expects aligned data. We will fill gaps with None (null in JSON).
        
        # Calculate expected number of buckets
        num_buckets = int(width)
        
        # Create master time array
        times = []
        start_float = float(start)
        bucket_float = float(bucket_size)
        for i in range(num_buckets + 1): # +1 to include end
             times.append(start_float + i * bucket_float)
             
        # Organize data by sensor
        # sensor_data = { "sensor_id": { bucket_idx: value } }
        sensor_map = {}
        distinct_sensors = set()
        
        for r in rows:
            b_idx = r[0]
            s_id = r[1]
            val = r[2]
            
            if s_id not in sensor_map:
                sensor_map[s_id] = {}
                distinct_sensors.add(s_id)
            
            sensor_map[s_id][b_idx] = val
            
        # Build final response structure
        # Sort sensors for consistent order
        sorted_sensors = sorted(list(distinct_sensors))
        
        series_list = []
        for s_id in sorted_sensors:
            data_points = []
            s_data = sensor_map[s_id]
            
            for i in range(num_buckets + 1):
                # If we have a value for this bucket, use it. Otherwise None/Null
                val = s_data.get(i, None)
                data_points.append(val)
            
            series_list.append({
                "id": s_id,
                "data": data_points
            })
            
        return {
            "time": times,
            "series": series_list
        }
        
    except Exception as e:
         print(f"Error: {e}")
         raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
