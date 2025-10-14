@echo off
setlocal enabledelayedexpansion

echo ========================================
echo 서비스 연결 테스트
echo ========================================
echo.

set "ALL_OK=1"

REM Nautilus 서비스 테스트
echo [1/3] Nautilus Service (포트 8001)...
curl -s http://localhost:8001/health > nul 2>&1
if !errorlevel! equ 0 (
    echo [OK] Nautilus Service 실행 중
    curl -s http://localhost:8001/health
    echo.
) else (
    echo [FAIL] Nautilus Service 실행되지 않음
    echo        실행: start-nautilus-only.bat
    set "ALL_OK=0"
)
echo.

REM 백엔드 테스트
echo [2/3] Backend Service (포트 8080)...
curl -s http://localhost:8080/actuator/health > nul 2>&1
if !errorlevel! equ 0 (
    echo [OK] Backend Service 실행 중
) else (
    echo [FAIL] Backend Service 실행되지 않음
    echo        실행: cd backend ^&^& gradlew bootRun
    set "ALL_OK=0"
)
echo.

REM 프론트엔드 테스트
echo [3/3] Frontend Service (포트 3000)...
curl -s http://localhost:3000 > nul 2>&1
if !errorlevel! equ 0 (
    echo [OK] Frontend Service 실행 중
) else (
    echo [FAIL] Frontend Service 실행되지 않음
    echo        실행: cd frontend ^&^& npm run dev
    set "ALL_OK=0"
)
echo.

REM WebSocket 테스트
echo [추가] WebSocket 연결 테스트...
echo        ws://localhost:8001/ws/trading
echo        (브라우저에서 자동 테스트됩니다)
echo.

REM 최종 결과
echo ========================================
if !ALL_OK! equ 1 (
    echo 결과: 모든 서비스 정상 ✓
    echo.
    echo 자동매매 모니터:
    echo http://localhost:3000/admin/auto-trading
) else (
    echo 결과: 일부 서비스 실행되지 않음 ✗
    echo.
    echo 모든 서비스 시작:
    echo start-services.bat
)
echo ========================================
echo.
pause






