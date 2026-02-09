# Technical Specification: Sensor Data Visualization Platform

## Overview

This project is a high-performance sensor data visualization platform designed to handle large datasets (20+ million data points) with real-time interactivity. It consists of a **FastAPI backend** for data aggregation and a **React frontend** for interactive charting.

---

## Technology Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Python** | 3.11+ | Core runtime |
| **FastAPI** | Latest | High-performance async REST API framework |
| **Uvicorn** | Latest | ASGI server for running FastAPI |
| **DuckDB** | Latest | Embedded analytical database optimized for OLAP queries |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.x | UI component library |
| **TypeScript** | 5.x | Type-safe JavaScript |
| **Vite** | 5.x | Fast development server and build tool |
| **uPlot** | Latest | High-performance time-series charting library |
| **TailwindCSS** | 3.x | Utility-first CSS framework |
| **Lucide React** | Latest | Icon library |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ SensorGraph │  │  Dashboard  │  │    SensorSelector       │  │
│  │   (uPlot)   │  │   Layout    │  │   (Sidebar + Filter)    │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                     │                │
│         └────────────────┼─────────────────────┘                │
│                          │                                      │
│                     fetch() API                                 │
└──────────────────────────┼──────────────────────────────────────┘
                           │ HTTP (REST)
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Backend (FastAPI)                           │
│  ┌────────────────┐  ┌─────────────────┐  ┌───────────────────┐  │
│  │  /api/sensors  │  │   /api/data     │  │  /api/ingest-csv  │  │
│  │  (List all)    │  │  (Aggregated)   │  │  (Upload data)    │  │
│  └────────┬───────┘  └────────┬────────┘  └─────────┬─────────┘  │
│           │                   │                     │            │
│           └───────────────────┼─────────────────────┘            │
│                               │                                  │
│                          DuckDB                                  │
│                    (sensor_data.duckdb)                          │
└──────────────────────────────────────────────────────────────────┘
```

---

## Key Features & How They Work

### 1. Server-Side Downsampling

**Problem**: Rendering 20 million points in a browser causes lag and crashes.

**Solution**: The backend aggregates data into `N` buckets (where N = screen width in pixels, typically ~1440).

```sql
SELECT 
    CAST(FLOOR((epoch(time) - start) / bucket_size) AS INTEGER) as bucket_idx,
    sensor_id,
    avg(value) as avg_val
FROM sensors 
WHERE epoch(time) >= start AND epoch(time) <= end
GROUP BY bucket_idx, sensor_id
ORDER BY bucket_idx ASC
```

**Result**: Only ~1500 points per sensor are sent to the frontend, regardless of the underlying data density.

---

### 2. Smart Zoom (Server-Side Data Fetch)

**Problem**: Client-side zoom only stretches the already-aggregated data, losing detail.

**Solution**: When the user zooms in:
1.  `SensorGraph.tsx` captures the selection via uPlot's `setSelect` hook.
2.  The new time range (`start`, `end`) is sent to the backend.
3.  The backend re-aggregates data *only for that range*, again to ~1440 buckets.
4.  The frontend receives high-resolution data for the zoomed window.

```
User Zooms: [T0 ─────────────────────────────────────── T1]  (1 hour)
                        ↓ Select Region ↓
            [T0+20min ─────────── T0+25min]  (5 minutes)

Backend Recalculates: 5 minutes / 1440 buckets = ~0.2 sec/bucket (vs 2.5 sec/bucket before)
```

---

### 3. Pan Mode

**Problem**: After zooming, users need to explore adjacent time periods.

**Solution**: Toggle between "Zoom" and "Pan" modes.
-   **Zoom Mode**: Drag to select a region.
-   **Pan Mode**: Drag to shift the time window left/right.

The `handlePan` function calculates the pixel delta, converts it to a time delta, and updates the `timeRange` state, triggering a data refetch.

---

### 4. Multi-Sensor Visualization

**Problem**: Initially, all selected sensors were averaged into a single line.

**Solution**: The backend groups by `sensor_id` AND `bucket_idx`, then pivots the data:

```json
{
  "time": [1700000000, 1700000100, ...],
  "series": [
    { "id": "sensor_001", "data": [12.5, 13.0, ...] },
    { "id": "sensor_002", "data": [8.2, 8.5, ...] }
  ]
}
```

The frontend dynamically creates uPlot series configurations with distinct colors for each sensor.

---

### 5. DuckDB for Analytics

**Why DuckDB?**
-   **Columnar Storage**: Optimized for aggregation queries (`AVG`, `GROUP BY`).
-   **Embedded**: No external database server needed.
-   **Fast**: Handles 20M+ rows with sub-second query times.

---

## Data Flow

1.  **Ingest**: CSV files are parsed and inserted into DuckDB via `ingest_csv.py`.
2.  **List Sensors**: Frontend calls `/api/sensors` to populate the sidebar.
3.  **Fetch Data**: Frontend calls `/api/data?width=1440&ids=sensor_001,sensor_002`.
4.  **Zoom/Pan**: User interaction updates `timeRange` state, triggering a new fetch with `&start=...&end=...`.
5.  **Render**: uPlot renders the aggregated data with minimal overhead.

---

## File Structure

```
Lia-Spring/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── ingest_csv.py        # Data ingestion script
│   ├── generate_signals.py  # Mock data generator
│   └── sensor_data.duckdb   # Embedded database
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── graph/
│   │   │   │   └── SensorGraph.tsx   # uPlot wrapper
│   │   │   ├── controls/
│   │   │   │   └── SensorSelector.tsx # Sidebar filter
│   │   │   └── layout/
│   │   │       └── MainLayout.tsx
│   │   ├── pages/
│   │   │   └── LiveDashboard.tsx     # Main dashboard
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
│
└── TECHNICAL_SPECIFICATION.md
```

---

## Running the Project

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install fastapi uvicorn duckdb
python main.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Performance Considerations

| Metric | Value |
|--------|-------|
| Max Data Points | 20,000,000+ |
| Downsampled Points | ~1,440 per sensor |
| Query Time (20M rows) | < 500ms |
| Frontend Render Time | < 50ms |

---

## Future Improvements

- [ ] WebSocket for real-time streaming
- [ ] Data caching layer (Redis)
- [ ] Export to PNG/CSV
- [ ] Annotations and markers
- [ ] User authentication
