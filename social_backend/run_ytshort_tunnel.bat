@echo off
setlocal

echo =============================================
echo   YT Short Maker + Cloudflare Tunnel
echo =============================================
echo.

set CLOUDFLARED="C:\Program Files (x86)\cloudflared\cloudflared.exe"
set CONFIG_FILE="C:\Users\Rebelion16\.cloudflared\config-ytshort.yml"

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python tidak ditemukan!
    pause
    exit /b 1
)

:: Check FFmpeg
where ffmpeg >nul 2>&1
if errorlevel 1 (
    echo [WARNING] FFmpeg tidak ditemukan di PATH!
    echo [INFO] Pastikan FFmpeg sudah terinstall di C:\ffmpeg\bin
)

:: Check venv
if not exist "venv" (
    echo [INFO] Membuat virtual environment...
    python -m venv venv
)

call venv\Scripts\activate.bat
pip install -r requirements.txt -q

echo.
echo [INFO] Memulai YT Short Maker di port 8000
start /B python main.py

timeout /t 3 /nobreak > nul
echo [OK] Backend berjalan di http://localhost:8000
echo.

echo =============================================
echo   CLOUDFLARE TUNNEL
echo =============================================
echo [INFO] URL: https://ytshort.nusantara-ai.fun
echo.

%CLOUDFLARED% tunnel --config %CONFIG_FILE% run

pause
