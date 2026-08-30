@echo off
REM Stop all DIH services started by start.bat
echo [run] Stopping all DIH services...

taskkill /fi "WINDOWTITLE eq DIH-MQTT-Broker*" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq DIH-Sim-Publisher*" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq DIH-ML-Subscriber*" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq DIH-Backend*" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq DIH-Frontend*" /f >nul 2>&1

echo [run] All services stopped.
pause
