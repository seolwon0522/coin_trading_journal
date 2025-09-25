@echo off
REM Nautilus Trading Service - Local Development Runner for Windows
REM This script starts the service locally for development and testing

echo.
echo ======================================
echo   Nautilus Trading Service Launcher
echo ======================================
echo.

REM Check Python version
python --version 2>NUL
if %errorlevel% NEQ 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.11 or later
    pause
    exit /b 1
)

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -q --upgrade pip
pip install -q -r requirements.txt

REM Check environment variables
if exist "..\\.env" (
    echo Loading environment variables from .env
    for /f "delims=" %%i in ('type ..\\.env ^| findstr /v "^#"') do set %%i
) else (
    echo WARNING: No .env file found. Using defaults.
    echo Create .env file from .env.example for API keys
)

REM Set default environment variables if not set
if not defined BINANCE_TESTNET set BINANCE_TESTNET=true
if not defined LOG_LEVEL set LOG_LEVEL=INFO
if not defined MAX_STRATEGIES set MAX_STRATEGIES=10
if not defined DEFAULT_CAPITAL set DEFAULT_CAPITAL=10000

REM Display configuration
echo.
echo Configuration:
echo   - Port: 8002
echo   - Testnet: %BINANCE_TESTNET%
echo   - Log Level: %LOG_LEVEL%
echo   - Max Strategies: %MAX_STRATEGIES%
echo.

REM Start the service
echo Starting FastAPI server...
echo ======================================
echo API Docs: http://localhost:8002/docs
echo Health: http://localhost:8002/health
echo WebSocket: ws://localhost:8002/ws/{client_id}
echo ======================================
echo.
echo Press Ctrl+C to stop the server
echo.

REM Run with auto-reload for development
uvicorn app.main:app --reload --host 0.0.0.0 --port 8002 --log-level info