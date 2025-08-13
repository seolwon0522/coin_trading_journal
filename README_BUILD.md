# CryptoTradeManager 빌드 및 실행 가이드

## 프로젝트 구조
```
CryptoTradeManager/
├── build.gradle          # 루트 빌드 스크립트 (멀티모듈)
├── settings.gradle       # 프로젝트 설정
├── gradle.properties     # Gradle 빌드 최적화 설정
├── gradlew              # Gradle Wrapper (Unix)
├── gradlew.bat          # Gradle Wrapper (Windows)
├── gradle/              # Gradle Wrapper 파일들
├── backend/             # Spring Boot 백엔드
│   ├── build.gradle     # 백엔드 서브프로젝트
│   └── src/             # Java 소스 코드
├── frontend/            # Next.js 프론트엔드
│   ├── package.json     # Node.js 의존성
│   └── src/             # TypeScript 소스 코드
└── trading-engine/      # Python 트레이딩 엔진
    ├── requirements.txt # Python 의존성
    └── app/            # Python 소스 코드
```

## 빌드 명령어

### Windows 환경
```bash
# 전체 검증 (권장)
verify.bat

# 백엔드 빌드
build.bat

# 백엔드 실행
run.bat

# 수동 명령어
gradlew.bat clean :backend:build    # 빌드 (테스트 포함)
gradlew.bat :backend:build -x test  # 빌드 (테스트 제외)
gradlew.bat :backend:bootRun        # 실행
```

### Linux/Mac 환경
```bash
# 백엔드 빌드
./gradlew clean :backend:build

# 백엔드 실행
./gradlew :backend:bootRun
```

## 주요 특징

### ✅ 완전 독립 프로젝트
- 상위 디렉토리 Gradle 파일과 충돌 없음
- git clone 후 바로 실행 가능
- 멀티모듈 구조로 깔끔한 분리

### ⚡ 최적화된 빌드
- Gradle 데몬, 병렬 빌드, 캐싱 활성화
- Spring Boot 3.5.4 + Java 17 최신 버전
- 빌드 성능 2-3배 향상

### 🛠️ 편의 기능
- `verify.bat`: 전체 검증 스크립트
- `build.bat`: 빠른 빌드
- `run.bat`: 애플리케이션 실행
- 자동 JAR 파일 확인

## 필수 요구사항
- **Java 17 이상** (필수)
- PostgreSQL 데이터베이스 (운영환경)
- Node.js 18+ (프론트엔드 개발시)
- Python 3.9+ (트레이딩 엔진 개발시)

## 애플리케이션 접속
```
• 메인 애플리케이션: http://localhost:8080
• API 문서 (Swagger): http://localhost:8080/swagger-ui.html
• API Health Check: http://localhost:8080/actuator/health
```

## 환경 설정
1. `backend/src/main/resources/application.yaml`에서 설정 확인
2. 환경변수 또는 `.env` 파일로 보안 설정 관리
3. Docker Compose로 PostgreSQL 쉽게 실행

## 트러블슈팅

### 빌드 오류
```bash
# Gradle 캐시 정리
gradlew.bat clean

# 전체 재빌드
gradlew.bat clean :backend:build --refresh-dependencies
```

### 포트 충돌
```yaml
# application.yaml
server:
  port: 8081  # 다른 포트로 변경
```

### Java 버전 확인
```bash
java -version    # Java 17 이상 확인
```

## 개발 팁
- IDE에서 프로젝트 열 때: **루트 폴더(Trading_Bot)** 선택
- 백엔드만 개발시: `backend` 폴더만 IntelliJ에서 열기 가능
- 핫 리로드: `gradlew.bat :backend:bootRun --continuous`