@echo off
setlocal
cd /d "%~dp0"

set "APP_URL=http://127.0.0.1:8000/"
set "PYTHON=%~dp0venv\Scripts\python.exe"

if not exist "%PYTHON%" (
    echo Pin2Pin is not set up yet. Run setup.bat once, then start this file again.
    exit /b 1
)

curl.exe --fail --silent --show-error --max-time 3 "%APP_URL%" >nul 2>nul
if not errorlevel 1 (
    echo Pin2Pin is already running at %APP_URL%
    start "" "%APP_URL%"
    exit /b 0
)

powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }" >nul 2>nul
if not errorlevel 1 (
    echo Port 8000 is occupied, but the dashboard did not respond.
    powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { 'Listening process ID: ' + $_.OwningProcess }"
    echo Inspect that process before stopping it; do not terminate an unknown process.
    exit /b 1
)

echo Starting Pin2Pin...
start "Pin2Pin Server" "%PYTHON%" backend\main.py

for /l %%i in (1,1,20) do (
    curl.exe --fail --silent --max-time 2 "%APP_URL%" >nul 2>nul
    if not errorlevel 1 goto ready
    timeout /t 1 /nobreak >nul
)

echo The dashboard did not respond after startup. Check the server window for errors.
exit /b 1

:ready
echo Dashboard is ready at %APP_URL%
start "" "%APP_URL%"
exit /b 0
