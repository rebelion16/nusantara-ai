@echo off
echo =============================================
echo   SETUP YT SHORT MAKER CLOUDFLARE TUNNEL
echo =============================================
echo.

set CLOUDFLARED="C:\Program Files (x86)\cloudflared\cloudflared.exe"

echo [STEP 1] Login ke Cloudflare (jika belum)
%CLOUDFLARED% tunnel login

echo.
echo [STEP 2] Membuat tunnel baru: ytshort-api
%CLOUDFLARED% tunnel create ytshort-api

echo.
echo [STEP 3] Lihat credentials tunnel
%CLOUDFLARED% tunnel list

echo.
echo =============================================
echo   LANGKAH SELANJUTNYA:
echo =============================================
echo.
echo 1. Buka Cloudflare Dashboard: https://one.dash.cloudflare.com/
echo 2. Pilih domain nusantara-ai.fun
echo 3. Go to: Networks ^> Tunnels
echo 4. Klik tunnel "ytshort-api" ^> Configure
echo 5. Di tab "Public Hostname", tambah:
echo    - Subdomain: ytshort
echo    - Domain: nusantara-ai.fun
echo    - Type: HTTP
echo    - URL: localhost:8000
echo.
echo 6. Tambahkan di Vercel Environment Variables:
echo    VITE_YTSHORT_BACKEND_URL=https://ytshort.nusantara-ai.fun
echo.
echo 7. Jalankan: run_ytshort_tunnel.bat
echo.

pause
