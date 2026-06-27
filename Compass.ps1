# Compass - AI Life OS Launcher
# Quick start script for development

$Host.UI.RawUI.WindowTitle = "Compass - AI Life OS"

Write-Host ""
Write-Host "  ╔══════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║     Compass - AI Life OS             ║" -ForegroundColor Cyan
Write-Host "  ║     Starting development server...   ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "  [OK] Node.js $nodeVersion detected" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "  Please install Node.js from https://nodejs.org" -ForegroundColor Yellow
    Read-Host "  Press Enter to exit"
    exit 1
}

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "  [INFO] Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

# Start the development server
Write-Host "  [INFO] Starting Next.js development server..." -ForegroundColor Cyan
Write-Host "  [INFO] Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

# Open browser after a short delay
Start-Process -FilePath "http://localhost:3000" -ErrorAction SilentlyContinue

# Start the dev server
npm run dev
