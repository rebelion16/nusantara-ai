@echo off
setlocal

echo =============================================
echo   Setup Named Tunnel (URL Permanen)
echo =============================================
echo.
echo [INFO] Proses ini hanya perlu dilakukan SEKALI.
echo [INFO] Setelah selesai, gunakan run_with_tunnel.bat
echo.

set CLOUDFLARED="C:\Program Files (x86)\cloudflared\cloudflared.exe"
set TUNNEL_NAME=nusantara-social-downloader

:: Check if cloudflared exists
if not exist %CLOUDFLARED% (
    echo [ERROR] cloudflared tidak ditemukan!
    pause
    exit /b 1
)

echo =============================================
echo   STEP 1: Login ke Cloudflare
echo =============================================
echo.
echo [INFO] Browser akan terbuka untuk login.
echo [INFO] Login dengan akun Cloudflare Anda (gratis).
echo [INFO] Jika belum punya akun, buat di https://cloudflare.com
echo.
pause

%CLOUDFLARED% login

if errorlevel 1 (
    echo [ERROR] Login gagal!
    pause
    exit /b 1
)

echo.
echo [OK] Login berhasil!
echo.

echo =============================================
echo   STEP 2: Membuat Named Tunnel
echo =============================================
echo.

%CLOUDFLARED% tunnel create %TUNNEL_NAME%

if errorlevel 1 (
    echo [WARNING] Tunnel mungkin sudah ada. Mencoba melanjutkan...
)

echo.
echo [OK] Named tunnel "%TUNNEL_NAME%" siap!
echo.

echo =============================================
echo   SETUP SELESAI!
echo =============================================
echo.
echo [INFO] Tunnel URL Anda akan berformat:
echo        https://[TUNNEL_ID].cfargotunnel.com
echo.
echo [INFO] Atau jika Anda punya domain di Cloudflare,
echo        jalankan perintah berikut untuk membuat subdomain:
echo.
echo        %CLOUDFLARED% tunnel route dns %TUNNEL_NAME% api.yourdomain.com
echo.
echo [NEXT] Jalankan: run_with_tunnel.bat
echo.
pause
