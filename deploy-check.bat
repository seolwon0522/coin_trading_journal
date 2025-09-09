@echo off
setlocal enabledelayedexpansion

echo ===================================
echo Railway 배포 전 체크리스트
echo ===================================

set EXIT_CODE=0

echo.
echo 1. 필수 파일 체크
echo -----------------------------------

if exist "Dockerfile" (
    echo [O] Dockerfile 존재
) else (
    echo [X] Dockerfile 없음
    set EXIT_CODE=1
)

if exist "railway.toml" (
    echo [O] railway.toml 존재
) else (
    echo [X] railway.toml 없음
    set EXIT_CODE=1
)

if exist "build.gradle" (
    echo [O] build.gradle 존재
) else (
    echo [X] build.gradle 없음
    set EXIT_CODE=1
)

if exist "settings.gradle" (
    echo [O] settings.gradle 존재
) else (
    echo [X] settings.gradle 없음
    set EXIT_CODE=1
)

if exist "src\main\resources\application-railway.yaml" (
    echo [O] application-railway.yaml 존재
) else (
    echo [X] application-railway.yaml 없음
    set EXIT_CODE=1
)

echo.
echo 2. Gradle 빌드 테스트
echo -----------------------------------

call gradlew.bat clean build --no-daemon > nul 2>&1
if %errorlevel% equ 0 (
    echo [O] Gradle 빌드 성공
) else (
    echo [X] Gradle 빌드 실패
    set EXIT_CODE=1
)

echo.
echo 3. Docker 빌드 테스트 (선택사항)
echo -----------------------------------
echo Docker 빌드를 테스트하려면 다음 명령을 실행하세요:
echo   docker build -t trading-bot-test .

echo.
echo 4. 환경 변수 체크리스트
echo -----------------------------------
echo Railway 대시보드에서 다음 환경 변수들을 설정했는지 확인하세요:
echo.
echo 필수 환경 변수:
echo   [ ] JWT_SECRET (최소 512비트 이상의 보안 키)
echo   [ ] CRYPTO_SECRET_KEY (Base64 인코딩된 32바이트 키)
echo   [ ] GOOGLE_CLIENT_ID (Google OAuth2 클라이언트 ID)
echo   [ ] GOOGLE_CLIENT_SECRET (Google OAuth2 시크릿)
echo   [ ] CORS_ALLOWED_ORIGINS (프론트엔드 URL)
echo.
echo 선택 환경 변수:
echo   [ ] BINANCE_API_KEY (Binance API 키)
echo   [ ] BINANCE_SECRET_KEY (Binance 시크릿 키)
echo   [ ] USE_BINANCE_TESTNET (테스트넷 사용 여부, 기본: true)

echo.
echo 5. 데이터베이스 설정
echo -----------------------------------
echo Railway에서 PostgreSQL 서비스를 추가했는지 확인하세요.
echo DATABASE_URL은 Railway가 자동으로 제공합니다.

echo.
echo 6. 배포 준비 상태
echo -----------------------------------

if !EXIT_CODE! equ 0 (
    echo.
    echo ✅ 모든 체크를 통과했습니다! Railway로 배포할 준비가 되었습니다.
    echo.
    echo 다음 단계:
    echo 1. git add .
    echo 2. git commit -m "Railway 배포 설정 완료"
    echo 3. git push origin main
    echo 4. Railway 대시보드에서 배포 상태 확인
) else (
    echo.
    echo ❌ 일부 체크에 실패했습니다. 위의 문제를 해결한 후 다시 시도하세요.
    exit /b !EXIT_CODE!
)

endlocal