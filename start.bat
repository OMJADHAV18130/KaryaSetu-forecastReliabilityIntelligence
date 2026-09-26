@echo off
echo ========================================================
echo Starting KaryaSetu Forecast Reliability Intelligence MVP
echo ========================================================
echo.

echo Starting FastAPI Backend on http://localhost:8000 ...
start "KaryaSetu Backend (FastAPI)" cmd /k "python -m uvicorn backend.main:app --port 8000 --reload"

echo Starting Vite Frontend on http://localhost:5173 ...
cd frontend
start "KaryaSetu Frontend (Vite)" cmd /k "npm run dev"

echo.
echo Both servers are launching!
echo Backend API docs: http://localhost:8000/docs
echo Frontend URL:     http://localhost:5174/ (or 5173)
echo ========================================================
