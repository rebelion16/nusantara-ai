@echo off
title YT Short Maker + Tunnel
color 0A

echo.
echo  =============================================
echo       YT SHORT MAKER - CLOUDFLARE TUNNEL
echo  =============================================
echo.
echo  URL: https://ytshort.nusantara-ai.fun
echo.
echo  =============================================
echo.

set BACKEND_DIR=C:\Users\Rebelion16\Documents\Workspace\nusantara-ai\social_backend
set PYTHON_EXE=%BACKEND_DIR%\venv\Scripts\python.exe
set CLOUDFLARED="C:\Program Files (x86)\cloudflared\cloudflared.exe"
set CONFIG_FILE="C:\Users\Rebelion16\.cloudflared\config-ytshort.yml"

:: Check if Python venv exists
if not exist "%PYTHON_EXE%" (
    echo [ERROR] Python venv tidak ditemukan!
    echo [INFO] Jalankan: cd social_backend ^&^& python -m venv venv
    pause
    exit /b 1
)

echo [1/2] Memulai YT Short Maker Backend (port 8000)...
start "YT Short Maker Backend" cmd /k "cd /d %BACKEND_DIR% && %PYTHON_EXE% main.py"

timeout /t 3 /nobreak > nul

echo [2/2] Memulai Cloudflare Tunnel...
start "Cloudflare Tunnel - ytshort" cmd /k "%CLOUDFLARED% tunnel --config %CONFIG_FILE% run"

timeout /t 3 /nobreak > nul

echo.
echo  =============================================
echo         SEMUA SERVICE BERJALAN!
echo  =============================================
echo.
echo  Backend: http://localhost:8000
echo  Tunnel:  https://ytshort.nusantara-ai.fun
echo.
echo  Tutup window ini tidak akan menghentikan service.
echo  Untuk stop, tutup window "YT Short Maker Backend" 
echo  dan "Cloudflare Tunnel - ytshort"
echo.
echo  =============================================
echo.

pause
