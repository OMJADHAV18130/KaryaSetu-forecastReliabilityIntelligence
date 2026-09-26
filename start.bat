@echo off
echo ============================================================
echo   KaryaSetu - Forecast Reliability Intelligence
echo   Research Prototype
echo ============================================================
echo.

REM Start Backend
echo [1/2] Starting Backend API on port 8000...
cd /d "%~dp0backend"
if exist ".venv\Scripts\python.exe" (
    start "KaryaSetu Backend" .venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
) else (
    start "KaryaSetu Backend" python -m uvicorn app.main:app --port 8000
)

REM Wait for backend to start
timeout /t 5 /nobreak > nul

REM Start Frontend
echo [2/2] Starting Frontend on port 5173...
cd /d "%~dp0frontend"
start "KaryaSetu Frontend" npm run dev

echo.
echo ============================================================
echo   KaryaSetu is starting...
echo.
echo   Backend API:  http://localhost:8000
echo   Frontend:     http://localhost:5173
echo   API Docs:     http://localhost:8000/docs
echo.
echo   Press Ctrl+C in each window to stop the services.
echo ============================================================
pause
