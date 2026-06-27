@echo off
title Compass - AI Life OS
echo.
echo  ╔══════════════════════════════════════╗
echo  ║     Compass - AI Life OS            ║
echo  ║     Starting development server...  ║
echo  ╚══════════════════════════════════════╝
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

:: Check if node_modules exists
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    call npm install
    echo.
)

:: Start the development server
echo [INFO] Starting Next.js development server...
echo [INFO] Press Ctrl+C to stop the server
echo.
start "" "http://localhost:3000"
call npm run dev
