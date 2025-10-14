@echo off
echo ========================================
echo Crypto Trading Journal - Service Start
echo ========================================
echo.

REM 1. Docker 컨테이너 시작 (PostgreSQL + Redis)
echo [1/4] Starting PostgreSQL and Redis...
docker-compose up -d postgres redis
if %errorlevel% neq 0 (
    echo Error: Docker Compose failed
    pause
    exit /b 1
)
echo PostgreSQL and Redis started successfully!
echo.

REM 2분 대기 (DB 초기화 시간)
echo Waiting for database initialization (30 seconds)...
timeout /t 30 /nobreak > nul
echo.

REM 2. Nautilus 서비스 시작
echo [2/4] Starting Nautilus Trading Service...
start "Nautilus Service" cmd /k "cd nautilus-service && python -m app.main"
echo Nautilus Service starting on http://localhost:8001
echo.

REM 20초 대기 (Nautilus 시작 시간)
echo Waiting for Nautilus startup (20 seconds)...
timeout /t 20 /nobreak > nul
echo.

REM 3. Backend 시작
echo [3/4] Starting Backend (Spring Boot)...
start "Backend Server" cmd /k "cd backend && gradlew.bat bootRun"
echo Backend starting on http://localhost:8080
echo.

REM 30초 대기 (Backend 시작 시간)
echo Waiting for backend startup (30 seconds)...
timeout /t 30 /nobreak > nul
echo.

REM 4. Frontend 시작
echo [4/4] Starting Frontend (Next.js)...
start "Frontend Server" cmd /k "cd frontend && npm run dev"
echo Frontend starting on http://localhost:3000
echo.

echo ========================================
echo All services started!
echo ========================================
echo.
echo Services:
echo - Frontend: http://localhost:3000
echo - Backend API: http://localhost:8080
echo - Nautilus API: http://localhost:8001
echo - Nautilus Docs: http://localhost:8001/docs
echo - API Docs: http://localhost:8080/swagger-ui.html
echo - PostgreSQL: localhost:5432
echo - Redis: localhost:6379
echo.
echo Auto-Trading Monitor:
echo - http://localhost:3000/admin/auto-trading
echo.
echo Press any key to exit this window...
pause > nul
