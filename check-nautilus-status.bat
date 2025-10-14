@echo off
echo ====================================
echo Nautilus 자동매매 상태 확인
echo ====================================
echo.

echo [1] Nautilus 서비스 상태 확인...
curl -s http://localhost:8001/health 2>nul
if %errorlevel% neq 0 (
    echo [오류] Nautilus 서비스가 실행되지 않았습니다.
    echo        nautilus-service 폴더에서 'python -m app.main' 실행 필요
) else (
    echo [OK] Nautilus 서비스 실행 중
)
echo.

echo [2] Node 상태 확인...
curl -s http://localhost:8001/api/node/status 2>nul
if %errorlevel% neq 0 (
    echo [오류] Node 상태를 확인할 수 없습니다.
) else (
    echo [OK] Node 상태 확인 완료
)
echo.

echo [3] 백엔드 서버 상태 확인...
curl -s http://localhost:8080/actuator/health 2>nul
if %errorlevel% neq 0 (
    echo [오류] Spring Boot 백엔드가 실행되지 않았습니다.
    echo        backend 폴더에서 './gradlew bootRun' 실행 필요
) else (
    echo [OK] 백엔드 서버 실행 중
)
echo.

echo [4] 프론트엔드 서버 상태 확인...
curl -s http://localhost:3000 >nul 2>nul
if %errorlevel% neq 0 (
    echo [오류] Next.js 프론트엔드가 실행되지 않았습니다.
    echo        frontend 폴더에서 'npm run dev' 실행 필요
) else (
    echo [OK] 프론트엔드 서버 실행 중
)
echo.

echo ====================================
echo 테스트넷 연결 상태 확인
echo ====================================
echo.
cd nautilus-service
python -c "import os; from dotenv import load_dotenv; load_dotenv(); print(f'테스트넷 모드: {os.getenv(\"BINANCE_TESTNET\", \"true\")}'); print(f'API Key: {os.getenv(\"BINANCE_API_KEY\", \"없음\")[:20]}...')" 2>nul
cd ..
echo.

echo ====================================
echo 자동매매 페이지: http://localhost:3000/admin/auto-trading
echo API 문서: http://localhost:8001/docs
echo ====================================
pause






