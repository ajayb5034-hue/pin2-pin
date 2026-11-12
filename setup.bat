@echo off
setlocal
cd /d "%~dp0"

set "PY_CMD=python"
where python >nul 2>nul
if errorlevel 1 (
    where py >nul 2>nul
    if errorlevel 1 (
        echo Python 3.10 or newer is required. Install Python and run setup.bat again.
        exit /b 1
    )
    set "PY_CMD=py -3"
)

if not exist "venv\Scripts\python.exe" (
    echo Creating a local Python environment...
    %PY_CMD% -m venv venv
    if errorlevel 1 exit /b 1
)

echo Installing Pin2Pin dependencies...
"venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 (
    echo Dependency installation failed. Review the error above and try again.
    exit /b 1
)

echo Setup complete. Run start_app.bat to launch Pin2Pin.
exit /b 0
