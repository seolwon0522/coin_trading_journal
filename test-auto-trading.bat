@echo off
echo ========================================
echo Nautilus 자동매매 시스템 상태 확인
echo ========================================
echo.

echo [1/5] Docker 서비스 확인...
docker ps --filter "name=nautilus-service" --filter "name=trading-postgres" --filter "name=trading-redis" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo.

echo [2/5] Nautilus 서비스 헬스체크...
curl -s http://localhost:8002/health | python -m json.tool 2>nul || echo Nautilus 서비스 응답 없음
echo.

echo [3/5] Backend API 상태 확인...
curl -s http://localhost:8080/actuator/health 2>nul || echo Backend 서비스 응답 없음
echo.

echo [4/5] PostgreSQL 연결 확인...
docker exec trading-postgres pg_isready -U postgres
echo.

echo [5/5] Redis 연결 확인...
docker exec trading-redis redis-cli ping
echo.

echo ========================================
echo 상태 확인 완료!
echo.
echo Frontend: http://localhost:3000
echo Backend API: http://localhost:8080
echo Nautilus API: http://localhost:8002
echo.
echo 자동매매 페이지: http://localhost:3000/admin/auto-trading
echo ========================================
pause






