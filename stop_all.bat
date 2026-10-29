@echo off
title DoorGuard - Stopping All Services
color 0C

echo ==========================================================
echo    DoorGuard - Stopping All Local Services...
echo ==========================================================
echo.

cd /d "%~dp0"

echo [1/3] Stopping React Frontend (Vite)...
taskkill /F /FI "WINDOWTITLE eq DoorGuard Frontend*" >nul 2>&1

echo [2/3] Stopping Flask Backend...
taskkill /F /FI "WINDOWTITLE eq DoorGuard Backend*" >nul 2>&1

echo [3/3] Stopping Docker PostgreSQL container...
docker compose stop postgres

echo.
echo ==========================================================
echo    All DoorGuard services have been stopped.
echo ==========================================================
echo.
timeout /t 3

