@echo off
setlocal

echo =============================================
echo   Social Media Downloader Backend + Tunnel
echo =============================================
echo.

set CLOUDFLARED="C:\Program Files (x86)\cloudflared\cloudflared.exe"

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python tidak ditemukan!
    pause
    exit /b 1
)

:: Check if cloudflared exists
if not exist %CLOUDFLARED% (
    echo [ERROR] cloudflared tidak ditemukan!
    pause
    exit /b 1
)

:: Check if venv exists
if not exist "venv" (
    echo [INFO] Membuat virtual environment...
    python -m venv venv
)

:: Activate venv
call venv\Scripts\activate.bat

:: Install dependencies
echo [INFO] Menginstall dependencies...
pip install -r requirements.txt -q

echo.
echo =============================================
echo   Memulai Backend Server dan Cloudflare Tunnel
echo =============================================
echo.

:: Start Python backend in background
echo [INFO] Memulai backend server di http://localhost:8000
start /B python main.py

:: Wait for backend to start
echo [INFO] Menunggu backend siap...
timeout /t 4 /nobreak > nul

echo [OK] Backend dijalankan!
echo.

echo =============================================
echo   QUICK TUNNEL
echo =============================================
echo.
echo [INFO] Memulai Cloudflare Quick Tunnel...
echo [INFO] URL tunnel akan muncul di bawah ini.
echo.
echo [PENTING] Salin URL https://xxxx.trycloudflare.com
echo [PENTING] Update di Vercel Environment Variables
echo.
echo =============================================
echo.

%CLOUDFLARED% tunnel --url http://localhost:8000

:: Cleanup on exit
echo.
echo [INFO] Selesai.
pause
