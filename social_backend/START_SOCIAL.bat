@echo off
title Social Media Downloader + Tunnel
color 0B

echo.
echo  =============================================
echo    SOCIAL MEDIA DOWNLOADER - CLOUDFLARE TUNNEL
echo  =============================================
echo.
echo  URL: https://api.nusantara-ai.fun
echo.
echo  =============================================
echo.

set BACKEND_DIR=C:\Users\Rebelion16\Documents\Workspace\nusantara-ai\social_backend
set PYTHON_EXE=%BACKEND_DIR%\venv\Scripts\python.exe
set CLOUDFLARED="C:\Program Files (x86)\cloudflared\cloudflared.exe"
set CONFIG_FILE="C:\Users\Rebelion16\.cloudflared\config-social.yml"

:: Check if Python venv exists
if not exist "%PYTHON_EXE%" (
    echo [ERROR] Python venv tidak ditemukan!
    echo [INFO] Jalankan: cd social_backend ^&^& python -m venv venv
    pause
    exit /b 1
)

echo [1/2] Memulai Social Media Downloader Backend (port 8001)...
start "Social Media Downloader Backend" cmd /k "cd /d %BACKEND_DIR% && %PYTHON_EXE% social_downloader.py"

timeout /t 3 /nobreak > nul

echo [2/2] Memulai Cloudflare Tunnel...
start "Cloudflare Tunnel - social" cmd /k "%CLOUDFLARED% tunnel --config %CONFIG_FILE% run"

timeout /t 3 /nobreak > nul

echo.
echo  =============================================
echo         SEMUA SERVICE BERJALAN!
echo  =============================================
echo.
echo  Backend: http://localhost:8001
echo  Tunnel:  https://api.nusantara-ai.fun
echo.
echo  =============================================
echo.

pause
