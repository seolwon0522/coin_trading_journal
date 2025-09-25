@echo off
setlocal enabledelayedexpansion

REM Phase 1: Infrastructure Tests (Windows version)
REM This script tests the basic infrastructure setup after cleanup

echo =========================================
echo Phase 1: Infrastructure Validation Tests
echo =========================================
echo.

REM Test counters
set TOTAL_TESTS=0
set PASSED_TESTS=0
set FAILED_TESTS=0

echo Step 1: Starting Docker services
echo ---------------------------------
docker-compose down >nul 2>&1
docker-compose up -d

REM Wait for services to start
echo Waiting for services to initialize (30 seconds)...
timeout /t 30 /nobreak >nul

echo.
echo Step 2: Service Health Checks
echo -----------------------------

REM Test 1: PostgreSQL
set /a TOTAL_TESTS+=1
echo Testing: PostgreSQL connection ...
docker exec trading-postgres pg_isready -U trader -d trading >nul 2>&1
if !errorlevel! equ 0 (
    echo [PASSED]
    set /a PASSED_TESTS+=1
) else (
    echo [FAILED]
    set /a FAILED_TESTS+=1
)

REM Test 2: Redis
set /a TOTAL_TESTS+=1
echo Testing: Redis connection ...
docker exec trading-redis redis-cli ping 2>nul | findstr /C:"PONG" >nul
if !errorlevel! equ 0 (
    echo [PASSED]
    set /a PASSED_TESTS+=1
) else (
    echo [FAILED]
    set /a FAILED_TESTS+=1
)

REM Test 3: Backend Spring Boot
set /a TOTAL_TESTS+=1
echo Testing: Backend health check ...
curl -f http://localhost:8080/actuator/health >nul 2>&1
if !errorlevel! equ 0 (
    echo [PASSED]
    set /a PASSED_TESTS+=1
) else (
    echo [FAILED]
    set /a FAILED_TESTS+=1
)

REM Test 4: Nautilus Service
set /a TOTAL_TESTS+=1
echo Testing: Nautilus service health ...
curl -f http://localhost:8002/health >nul 2>&1
if !errorlevel! equ 0 (
    echo [PASSED]
    set /a PASSED_TESTS+=1
) else (
    echo [FAILED]
    set /a FAILED_TESTS+=1
)

REM Test 5: ML Service
set /a TOTAL_TESTS+=1
echo Testing: ML service health ...
curl -f http://localhost:8001/health >nul 2>&1
if !errorlevel! equ 0 (
    echo [PASSED]
    set /a PASSED_TESTS+=1
) else (
    echo [FAILED]
    set /a FAILED_TESTS+=1
)

REM Test 6: Frontend
set /a TOTAL_TESTS+=1
echo Testing: Frontend availability ...
curl -f http://localhost:3000 >nul 2>&1
if !errorlevel! equ 0 (
    echo [PASSED]
    set /a PASSED_TESTS+=1
) else (
    echo [FAILED]
    set /a FAILED_TESTS+=1
)

echo.
echo Step 3: Container Status Checks
echo -------------------------------

REM Test 7: All containers running
set /a TOTAL_TESTS+=1
echo Testing: All containers running ...
for /f %%i in ('docker-compose ps ^| findstr /C:"Up" ^| find /c /v ""') do set RUNNING_COUNT=%%i
if !RUNNING_COUNT! geq 6 (
    echo [PASSED]
    set /a PASSED_TESTS+=1
) else (
    echo [FAILED] - Only !RUNNING_COUNT! containers running
    set /a FAILED_TESTS+=1
)

echo.
echo Step 4: Environment Check
echo -------------------------

REM Test 8: Check if .env exists
set /a TOTAL_TESTS+=1
echo Testing: Environment configuration ...
if exist ".env" (
    echo [PASSED] - .env file exists
    set /a PASSED_TESTS+=1
) else if exist ".env.example" (
    echo [WARNING] - Using .env.example (copy to .env for production)
    set /a PASSED_TESTS+=1
) else (
    echo [FAILED] - No environment configuration found
    set /a FAILED_TESTS+=1
)

echo.
echo =========================================
echo Test Results Summary
echo =========================================
echo Total Tests: !TOTAL_TESTS!
echo Passed: !PASSED_TESTS!
echo Failed: !FAILED_TESTS!
echo.

if !FAILED_TESTS! equ 0 (
    echo ✅ Phase 1 COMPLETE: All infrastructure tests passed!
    echo You can now proceed to Phase 2: Nautilus Core Integration
    exit /b 0
) else (
    echo ❌ Phase 1 INCOMPLETE: Some tests failed
    echo Please fix the issues above before proceeding to Phase 2
    echo.
    echo Troubleshooting Tips:
    echo --------------------
    echo 1. Check Docker logs: docker-compose logs [service-name]
    echo 2. Verify .env configuration
    echo 3. Ensure ports are not already in use
    echo 4. Check Docker Desktop is running
    exit /b 1
)