#!/bin/bash

echo "==================================="
echo "Railway 배포 전 체크리스트"
echo "==================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check function
check() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
        EXIT_CODE=1
    fi
}

EXIT_CODE=0

echo -e "\n${YELLOW}1. 필수 파일 체크${NC}"
echo "-----------------------------------"

# Check required files
[ -f "Dockerfile" ] && check 0 "Dockerfile 존재" || check 1 "Dockerfile 없음"
[ -f "railway.toml" ] && check 0 "railway.toml 존재" || check 1 "railway.toml 없음"
[ -f "build.gradle" ] && check 0 "build.gradle 존재" || check 1 "build.gradle 없음"
[ -f "settings.gradle" ] && check 0 "settings.gradle 존재" || check 1 "settings.gradle 없음"
[ -f "src/main/resources/application-railway.yaml" ] && check 0 "application-railway.yaml 존재" || check 1 "application-railway.yaml 없음"

echo -e "\n${YELLOW}2. Gradle 빌드 테스트${NC}"
echo "-----------------------------------"

# Test gradle build
./gradlew clean build --no-daemon > /dev/null 2>&1
check $? "Gradle 빌드 성공"

echo -e "\n${YELLOW}3. Docker 빌드 테스트 (선택사항)${NC}"
echo "-----------------------------------"
echo "Docker 빌드를 테스트하려면 다음 명령을 실행하세요:"
echo "  docker build -t trading-bot-test ."

echo -e "\n${YELLOW}4. 환경 변수 체크리스트${NC}"
echo "-----------------------------------"
echo "Railway 대시보드에서 다음 환경 변수들을 설정했는지 확인하세요:"
echo ""
echo "필수 환경 변수:"
echo "  □ JWT_SECRET (최소 512비트 이상의 보안 키)"
echo "  □ CRYPTO_SECRET_KEY (Base64 인코딩된 32바이트 키)"
echo "  □ GOOGLE_CLIENT_ID (Google OAuth2 클라이언트 ID)"
echo "  □ GOOGLE_CLIENT_SECRET (Google OAuth2 시크릿)"
echo "  □ CORS_ALLOWED_ORIGINS (프론트엔드 URL)"
echo ""
echo "선택 환경 변수:"
echo "  □ BINANCE_API_KEY (Binance API 키)"
echo "  □ BINANCE_SECRET_KEY (Binance 시크릿 키)"
echo "  □ USE_BINANCE_TESTNET (테스트넷 사용 여부, 기본: true)"

echo -e "\n${YELLOW}5. 데이터베이스 설정${NC}"
echo "-----------------------------------"
echo "Railway에서 PostgreSQL 서비스를 추가했는지 확인하세요."
echo "DATABASE_URL은 Railway가 자동으로 제공합니다."

echo -e "\n${YELLOW}6. 배포 준비 상태${NC}"
echo "-----------------------------------"

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ 모든 체크를 통과했습니다! Railway로 배포할 준비가 되었습니다.${NC}"
    echo ""
    echo "다음 단계:"
    echo "1. git add ."
    echo "2. git commit -m \"Railway 배포 설정 완료\""
    echo "3. git push origin main"
    echo "4. Railway 대시보드에서 배포 상태 확인"
else
    echo -e "${RED}❌ 일부 체크에 실패했습니다. 위의 문제를 해결한 후 다시 시도하세요.${NC}"
    exit $EXIT_CODE
fi