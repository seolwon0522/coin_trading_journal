@echo off
echo ========================================
echo Nautilus Trading Service 시작
echo ========================================
echo.

REM 환경 변수 확인
echo [확인] 환경 변수 체크...
cd nautilus-service
if not exist .env (
    echo [오류] .env 파일이 없습니다!
    echo        .env.example을 복사하여 .env 파일을 생성하세요.
    pause
    exit /b 1
)

echo [OK] .env 파일 존재
echo.

REM Python 버전 확인
echo [확인] Python 버전...
python --version
if %errorlevel% neq 0 (
    echo [오류] Python이 설치되지 않았습니다.
    pause
    exit /b 1
)
echo.

REM 의존성 확인
echo [확인] 필수 패키지 설치 확인...
python -c "import fastapi; import nautilus_trader" 2>nul
if %errorlevel% neq 0 (
    echo [경고] 필수 패키지가 설치되지 않았을 수 있습니다.
    echo [설치] pip install -r requirements.txt 실행 중...
    pip install -r requirements.txt
)
echo.

REM Redis 확인
echo [확인] Redis 연결...
docker ps | findstr redis > nul
if %errorlevel% neq 0 (
    echo [경고] Redis 컨테이너가 실행되지 않았습니다.
    echo [시작] Redis 시작 중...
    docker-compose up -d redis
    timeout /t 5 /nobreak > nul
)
echo [OK] Redis 준비됨
echo.

REM Nautilus 서비스 시작
echo ========================================
echo Nautilus Trading Service 실행 중...
echo ========================================
echo.
echo API: http://localhost:8001
echo Docs: http://localhost:8001/docs
echo Health: http://localhost:8001/health
echo.

python -m app.main

cd ..






