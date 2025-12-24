@echo off
setlocal

echo =============================================
echo   Social Media Downloader Backend + Tunnel
echo =============================================
echo.

set CLOUDFLARED="C:\Program Files (x86)\cloudflared\cloudflared.exe"
set TUNNEL_NAME=nusantara-social-downloader

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

:: Check if named tunnel exists
%CLOUDFLARED% tunnel list 2>nul | findstr /C:"%TUNNEL_NAME%" >nul 2>&1
if errorlevel 1 (
    echo =============================================
    echo   QUICK TUNNEL (URL akan berubah)
    echo =============================================
    echo.
    echo [INFO] Named tunnel belum di-setup.
    echo [INFO] Untuk URL permanen, jalankan: setup_permanent_tunnel.bat
    echo.
    echo [INFO] Menggunakan Quick Tunnel...
    echo.
    %CLOUDFLARED% tunnel --url http://localhost:8000
) else (
    echo =============================================
    echo   NAMED TUNNEL (URL permanen)
    echo =============================================
    echo.
    echo [INFO] Menggunakan Named Tunnel: %TUNNEL_NAME%
    echo [INFO] URL Anda akan tetap sama setiap kali dijalankan.
    echo.
    %CLOUDFLARED% tunnel run --url http://localhost:8000 %TUNNEL_NAME%
)

:: Cleanup on exit
echo.
echo [INFO] Selesai.
pause
