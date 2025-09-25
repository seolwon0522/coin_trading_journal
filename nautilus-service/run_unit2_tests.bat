@echo off
echo ==========================================
echo Unit 2 API Gateway 검증 테스트 실행
echo ==========================================

REM Python 환경 활성화 (필요시)
REM call venv\Scripts\activate

REM 필요 패키지 설치
echo Installing test dependencies...
pip install pytest pytest-asyncio httpx websockets

REM API 서버 시작 (백그라운드)
echo Starting API server...
start /B python app/api/main.py

REM 서버 시작 대기
timeout /t 3 /nobreak > nul

REM 테스트 실행
echo Running tests...
python -m pytest tests/test_unit2_api.py -v --tb=short -s --asyncio-mode=auto

REM 서버 종료
echo Stopping API server...
taskkill /F /IM python.exe 2>nul

echo ==========================================
echo 테스트 완료!
echo ==========================================
pause