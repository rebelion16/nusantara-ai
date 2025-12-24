@echo off
title Nusantara AI - Backend + Cloudflare Tunnel

echo =============================================
echo   Nusantara AI Backend + Cloudflare Tunnel
echo   Domain: api.nusantara-ai.fun
echo =============================================
echo.

set CLOUDFLARED="C:\Program Files (x86)\cloudflared\cloudflared.exe"
set BACKEND_DIR=C:\Users\Rebelion16\Documents\Workspace\nusantara-ai\social_backend
set TUNNEL_NAME=nusantara-backend

cd /d %BACKEND_DIR%

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python tidak ditemukan!
    pause
    exit /b 1
)

:: Check venv
if not exist "venv" (
    echo [INFO] Membuat virtual environment...
    python -m venv venv
)

call venv\Scripts\activate.bat
pip install -r requirements.txt -q

echo.
echo [1/2] Memulai Backend di port 8001...
start "Backend Server" cmd /k "cd /d %BACKEND_DIR% && venv\Scripts\activate.bat && python social_downloader.py"

:: Wait for backend to start
timeout /t 3 /nobreak > nul

echo [2/2] Memulai Cloudflare Tunnel...
echo.
echo =============================================
echo   Tunnel URL: https://api.nusantara-ai.fun
echo =============================================
echo.

%CLOUDFLARED% tunnel run --url http://localhost:8001 %TUNNEL_NAME%

pause
