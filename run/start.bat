@echo off
REM Start the full DIH stack on Windows (CMD).
REM Usage: run\start.bat
REM Stop:  Close this window or press Ctrl+C

setlocal
cd /d "%~dp0\.."
set ROOT_DIR=%cd%

echo ============================================
echo   DIH — Digital Twin Full Stack Launcher
echo ============================================
echo.
echo [run] Root: %ROOT_DIR%
echo.

echo [run] Starting MQTT broker...
start "DIH-MQTT-Broker" /min cmd /c "cd /d %ROOT_DIR% && python -m integration.broker"
timeout /t 2 /nobreak >nul

echo [run] Starting simulation publisher...
start "DIH-Sim-Publisher" /min cmd /c "cd /d %ROOT_DIR% && python integration/sim_publisher.py --speed 10"
timeout /t 1 /nobreak >nul

echo [run] Starting ML subscriber...
start "DIH-ML-Subscriber" /min cmd /c "cd /d %ROOT_DIR% && python -m integration.ml_subscriber"
timeout /t 1 /nobreak >nul

echo [run] Starting FastAPI backend on :8000...
start "DIH-Backend" /min cmd /c "cd /d %ROOT_DIR% && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"
timeout /t 1 /nobreak >nul

echo [run] Starting frontend dev server...
start "DIH-Frontend" /min cmd /c "cd /d %ROOT_DIR%\frontend && npm run dev"

echo.
echo ============================================
echo   All services running in background windows.
echo   Close them individually or run run\stop.bat
echo ============================================
echo.
pause
