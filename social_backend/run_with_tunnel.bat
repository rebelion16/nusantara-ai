@echo off
setlocal

echo =============================================
echo   Social Media Downloader Backend + Tunnel
echo =============================================
echo.

:: Set cloudflared path (dengan quotes yang benar)
set CLOUDFLARED="C:\Program Files (x86)\cloudflared\cloudflared.exe"

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python tidak ditemukan!
    echo Silakan install Python dari https://www.python.org/downloads/
    pause
    exit /b 1
)

:: Check if cloudflared exists
if not exist %CLOUDFLARED% (
    echo [ERROR] cloudflared tidak ditemukan!
    echo Silakan install via: winget install Cloudflare.cloudflared
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

:: Start cloudflare tunnel
echo =============================================
echo   CLOUDFLARE TUNNEL
echo =============================================
echo.
echo [INFO] Memulai Cloudflare Tunnel...
echo [INFO] URL tunnel akan muncul di bawah ini.
echo [INFO] Salin URL https://xxxx.trycloudflare.com untuk Vercel!
echo.
echo [TIP] Untuk menggunakan URL ini di Vercel:
echo       1. Buka https://vercel.com/dashboard
echo       2. Pilih proyek nusantara-ai-six
echo       3. Settings - Environment Variables
echo       4. Tambah: VITE_SOCIAL_BACKEND_URL = URL tunnel
echo       5. Redeploy
echo.
echo =============================================
echo.

%CLOUDFLARED% tunnel --url http://localhost:8000

:: Cleanup on exit
echo.
echo [INFO] Selesai.
pause
