@echo off
setlocal

echo =============================================
echo   Social Media Downloader + Tunnel
echo =============================================
echo.

set CLOUDFLARED="C:\Program Files (x86)\cloudflared\cloudflared.exe"

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
echo [INFO] Memulai Social Media Downloader di port 8001
start /B python social_downloader.py

timeout /t 3 /nobreak > nul
echo [OK] Backend berjalan di http://localhost:8001
echo.

echo =============================================
echo   CLOUDFLARE TUNNEL
echo =============================================
echo [PENTING] Salin URL tunnel untuk Vercel!
echo.

%CLOUDFLARED% tunnel --url http://localhost:8001

pause
