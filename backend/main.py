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
def get_sensor_data(start: float = None, end: float = None, limit: int = 1000):
    try:
        con = get_db_connection()
        query = "SELECT * FROM sensors LIMIT ?"
        params = [limit]
        
        # Simple query for now
        # In real implementation: We would use LTTB downsampling here
        
        df = con.execute(query, params).fetch_df()
        con.close()
        
        # Convert to uPlot format (array of arrays)
        # Assuming table has 'time' column
        # This is a placeholder since we don't know exact CSV schema yet
        return df.to_dict(orient="records")
        
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
