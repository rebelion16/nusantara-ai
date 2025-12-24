@echo off
title Nusantara AI - All Backend Services
color 0E

echo.
echo  ===========================================================
echo        NUSANTARA AI - ALL BACKEND SERVICES
echo  ===========================================================
echo.
echo   [1] Social Media Downloader : https://api.nusantara-ai.fun
echo   [2] YT Short Maker          : https://ytshort.nusantara-ai.fun
echo.
echo  ===========================================================
echo.

set BACKEND_DIR=C:\Users\Rebelion16\Documents\Workspace\nusantara-ai\social_backend
set PYTHON_EXE=%BACKEND_DIR%\venv\Scripts\python.exe
set CLOUDFLARED="C:\Program Files (x86)\cloudflared\cloudflared.exe"

:: Check if Python venv exists
if not exist "%PYTHON_EXE%" (
    echo [ERROR] Python venv tidak ditemukan!
    pause
    exit /b 1
)

echo [1/4] Starting Social Media Downloader (port 8001)...
start "Backend - Social Downloader" cmd /k "cd /d %BACKEND_DIR% && %PYTHON_EXE% social_downloader.py"

echo [2/4] Starting YT Short Maker (port 8000)...
start "Backend - YT Short Maker" cmd /k "cd /d %BACKEND_DIR% && %PYTHON_EXE% main.py"

timeout /t 3 /nobreak > nul

echo [3/4] Starting Tunnel - Social (api.nusantara-ai.fun)...
start "Tunnel - Social" cmd /k "%CLOUDFLARED% tunnel --config C:\Users\Rebelion16\.cloudflared\config-social.yml run"

echo [4/4] Starting Tunnel - YTShort (ytshort.nusantara-ai.fun)...
start "Tunnel - YTShort" cmd /k "%CLOUDFLARED% tunnel --config C:\Users\Rebelion16\.cloudflared\config-ytshort.yml run"

timeout /t 5 /nobreak > nul

echo.
echo  ===========================================================
echo                    ALL SERVICES RUNNING!
echo  ===========================================================
echo.
echo   Social Media Downloader:
echo     Local:  http://localhost:8001
echo     Public: https://api.nusantara-ai.fun
echo.
echo   YT Short Maker:
echo     Local:  http://localhost:8000
echo     Public: https://ytshort.nusantara-ai.fun
echo.
echo  ===========================================================
echo   4 windows terbuka untuk masing-masing service.
echo   Tutup window ini TIDAK akan menghentikan service.
echo  ===========================================================
echo.

pause
