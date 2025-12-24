@echo off
echo =============================================
echo   Social Media Downloader Backend
echo =============================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python tidak ditemukan!
    echo Silakan install Python dari https://www.python.org/downloads/
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

:: Run the server
echo.
echo [INFO] Menjalankan server di http://localhost:8000
echo [INFO] Tekan Ctrl+C untuk menghentikan server
echo.
python main.py
