# Start LAN Saturn Crypto Lab (Development Mode)
$ErrorActionPreference = "Stop"

Write-Host "Starting LAN Saturn Crypto Lab..." -ForegroundColor Cyan

if (-not (Test-Path ".venv")) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Yellow
    py -m venv .venv
    .\.venv\Scripts\python.exe -m pip install -r requirements.txt
}

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing Node dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "Running Crypto Lab automated tests..." -ForegroundColor Green
npm run test:crypto

Write-Host "Launching Frontend (http://localhost:5173/crypto-lab) and Flask Relay (http://localhost:5000)..." -ForegroundColor Cyan
npm run dev
