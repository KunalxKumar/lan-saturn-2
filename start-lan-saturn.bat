@echo off
setlocal
title LAN Saturn Server
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment not found. Please run install-lan-saturn.bat first.
    pause
    exit /b 1
)

echo Starting LAN Saturn Server...
echo Host admin URL: http://127.0.0.1:5000
echo.

:: Open browser after short delay
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://127.0.0.1:5000"

.venv\Scripts\python.exe run.py
pause
