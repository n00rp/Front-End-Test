# High-Performance Sensor Dashboard - Walkthrough & Setup

## Project Overview
This project is a high-performance data visualization platform designed to handle massive amounts of sensor data (100M+ rows) with 60FPS rendering. It uses **React (Vite) + uPlot** for the frontend and **FastAPI + DuckDB** for a portable, high-speed backend.

---

## Installation Guide (New Machine)
Follow these steps to set up the project on a fresh computer.

### 1. Clone & Frontend Setup
```bash
git clone https://github.com/n00rp/Front-End-Test.git
cd Front-End-Test/frontend

# Install dependencies
npm install

# Start Development Server
npm run dev
```
The frontend is now running at `http://localhost:5173`.

### 2. Backend Setup (Local Power-PoC)
The backend uses **DuckDB** for massive performance without needing to install a database server like PostgreSQL.

**Prerequisites:** Python 3.10+ installed.

```bash
# Open a new terminal in the project root
cd backend

# Create virtual environment
python -m venv venv

# Activate venv (Windows)
..\venv\Scripts\activate
# Activate venv (Mac/Linux)
# source ../venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Load Your Data (The 100M Row Test)
To verify performance with your real dataset (5000+ CSVs):

1.  Create a folder named `data` inside the `backend` folder.
2.  Copy your **5000+ CSV files** into `backend/data/`.
3.  Run the ingestion script:
    ```bash
    python ingest_csv.py
    ```
    *This will create a `sensor_data.duckdb` file (single-file database). It may take a few minutes depending on disk speed.*

### 4. Run the Backend API
```bash
# Still inside backend/ folder with venv activated:
python main.py
```
The API is now running at `http://localhost:8000`.

---

## Features & Verification
### 1. Performance Testing (Frontend Only - CSV)
You can test the frontend rendering engine without the backend:
1.  Click the **"Upload CSV"** button in the top toolbar of the dashboard.
2.  Select one of your raw CSV files.
3.  The graph will instantly render the data client-side.
    *   *Note: Headers must include a 'time', 'timestamp', or 't' column.*

### 2. Architecture Notes
*   **Frontend**: React + uPlot (Canvas) + WebGL Heatmap.
*   **Backend**: FastAPI + DuckDB (Local Embeddable SQL).
*   **Data Flow**: CSVs -> DuckDB -> API (Aggregated) -> Frontend.
