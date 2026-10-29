@echo off
title DoorGuard - Starting All Services
color 0A

echo ==========================================================
echo    DoorGuard - Smart Gate ^& Door Monitoring System
echo              Starting All Local Services...
echo ==========================================================
echo.

:: 1. Ensure we are in the project root directory
cd /d "%~dp0"

:: 2. Start PostgreSQL Container
echo [1/4] Starting PostgreSQL 16 container...
docker compose up -d postgres
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to start Docker PostgreSQL container!
    echo Please make sure Docker Desktop is running and try again.
    pause
    exit /b %ERRORLEVEL%
)

:: Wait 3 seconds for database ready
timeout /t 3 /nobreak >nul

:: 3. Start Flask Backend Server in a new window
echo [2/4] Starting Python Flask backend (port 5000)...
start "DoorGuard Backend [Port 5000]" cmd /k "cd /d "%~dp0backend" && .venv\Scripts\python.exe run.py"

:: Wait 2 seconds for backend initialization
timeout /t 2 /nobreak >nul

:: 4. Start React Frontend Server in a new window
echo [3/4] Starting React Vite frontend (port 5173)...
start "DoorGuard Frontend [Port 5173]" cmd /k "cd /d "%~dp0frontend" && npm run dev"

:: Wait 3 seconds for Vite server startup
timeout /t 3 /nobreak >nul

:: 5. Open Dashboard in Default Browser
echo [4/4] Opening dashboard in browser...
start http://localhost:5173

echo.
echo ==========================================================
echo    ALL DOORDGUARD SERVICES ARE RUNNING!
echo ==========================================================
echo.
echo   * React Dashboard:     http://localhost:5173
echo   * Flask REST API:      http://localhost:5000
echo   * Local Network IP:    http://192.168.1.8:5000
echo   * PostgreSQL Database: localhost:5432
echo   * Alert Siren Sound:   ENABLED (synthesizer audio)
echo.
echo Leave the Backend and Frontend command windows open while using.
echo To stop all services later, run: stop_all.bat
echo.
pause

