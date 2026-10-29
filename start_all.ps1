# DoorGuard - Start All Services (PowerShell)
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "   DoorGuard - Smart Gate & Door Monitoring System" -ForegroundColor Green
Write-Host "             Starting All Local Services..." -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $rootDir

# 1. Start PostgreSQL
Write-Host "[1/4] Starting PostgreSQL 16 container..." -ForegroundColor Cyan
docker compose up -d postgres
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Docker failed to start PostgreSQL container. Ensure Docker Desktop is running." -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 3

# 2. Start Flask Backend
Write-Host "[2/4] Starting Python Flask backend (port 5000)..." -ForegroundColor Cyan
Start-Process cmd.exe -ArgumentList "/k cd /d `"$rootDir\backend`" && .venv\Scripts\python.exe run.py" -WindowStyle Normal

Start-Sleep -Seconds 2

# 3. Start Frontend Vite
Write-Host "[3/4] Starting React Vite frontend (port 5173)..." -ForegroundColor Cyan
Start-Process cmd.exe -ArgumentList "/k cd /d `"$rootDir\frontend`" && npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 3

# 4. Open Browser
Write-Host "[4/4] Opening dashboard in browser..." -ForegroundColor Cyan
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "   ALL DOORDGUARD SERVICES ARE RUNNING!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " * React Dashboard:     http://localhost:5173" -ForegroundColor Yellow
Write-Host " * Flask REST API:      http://localhost:5000" -ForegroundColor Yellow
Write-Host " * Local Network IP:    http://192.168.1.8:5000" -ForegroundColor Yellow
Write-Host " * PostgreSQL Database: localhost:5432" -ForegroundColor Yellow
Write-Host " * Alert Siren Sound:   ENABLED (Web Audio Synthesizer)" -ForegroundColor Yellow
Write-Host ""

