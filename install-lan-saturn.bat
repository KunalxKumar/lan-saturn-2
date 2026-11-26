@echo off
setlocal enabledelayedexpansion
title LAN Saturn - Installer

echo ==================================================
echo   LAN Saturn - Automated Installer ^& Updater
echo ==================================================
echo.

:: Check prerequisites
where git >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Git is not installed or not in PATH.
    pause
    exit /b 1
)
where python >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Python 3 is not installed or not in PATH.
    pause
    exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js / npm is not installed or not in PATH.
    pause
    exit /b 1
)

:: Clone or pull from GitHub
if exist ".git" (
    echo [1/5] Updating existing repository from origin/main...
    git pull origin main
) else if exist "lan-saturn-2\.git" (
    cd lan-saturn-2
    echo [1/5] Updating existing lan-saturn-2 repository...
    git pull origin main
) else (
    echo [1/5] Cloning https://github.com/KunalxKumar/lan-saturn-2.git ...
    git clone https://github.com/KunalxKumar/lan-saturn-2.git
    if errorlevel 1 (
        echo [ERROR] Failed to clone repository.
        pause
        exit /b 1
    )
    cd lan-saturn-2
)

:: Python virtual environment & dependencies
echo.
echo [2/5] Setting up Python virtual environment (.venv)...
if not exist ".venv\Scripts\python.exe" (
    python -m venv .venv
)
.venv\Scripts\python.exe -m pip install --upgrade pip >nul
.venv\Scripts\pip.exe install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install Python dependencies.
    pause
    exit /b 1
)

:: Node dependencies & production build
echo.
echo [3/5] Installing Node dependencies and building frontend...
call npm install
if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
)
call npm run build
if errorlevel 1 (
    echo [ERROR] Frontend build failed.
    pause
    exit /b 1
)

:: Windows Firewall rule for port 5000 (best-effort if Admin)
echo.
echo [4/5] Configuring Windows Firewall rule for port 5000...
net session >nul 2>nul
if %errorlevel%==0 (
    powershell -NoProfile -Command "if (-not (Get-NetFirewallRule -DisplayName 'LAN Saturn Port 5000' -ErrorAction SilentlyContinue)) { New-NetFirewallRule -DisplayName 'LAN Saturn Port 5000' -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow -Profile Private,Public | Out-Null }"
    echo Firewall rule ready.
) else (
    echo [INFO] Not running as Administrator - skipping firewall rule.
    echo        Run as Administrator if LAN/hotspot devices cannot reach port 5000.
)

:: Create Desktop shortcut
echo.
echo [5/5] Creating Desktop shortcut...
set "REPO_DIR=%CD%"
powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\LAN Saturn.lnk'); $s.TargetPath = '%REPO_DIR%\start-lan-saturn.bat'; $s.WorkingDirectory = '%REPO_DIR%'; $s.Description = 'Start LAN Saturn Server'; $s.Save()"

echo.
echo ==================================================
echo   Installation Complete!
echo   Shortcut created on Desktop: LAN Saturn
echo ==================================================
echo.
set /p LAUNCH="Start LAN Saturn server now? (Y/N): "
if /i "%LAUNCH%"=="Y" (
    call start-lan-saturn.bat
)
