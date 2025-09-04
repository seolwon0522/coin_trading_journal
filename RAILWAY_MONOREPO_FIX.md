# 🔥 Railway Monorepo 배포 문제 해결 가이드

## 문제 상황
Railway가 monorepo의 backend 폴더를 찾지 못하고 무한 initializing 상태

## ⚡ 빠른 해결 방법

### 1️⃣ 현재 Railway 프로젝트 취소
1. Railway 대시보드에서 현재 프로젝트 선택
2. Settings → Delete Project
3. 또는 프로젝트에서 나가기

### 2️⃣ 방법 A: Railway 대시보드에서 직접 설정 (권장)

1. **새 프로젝트 생성**
   - New Project → Empty Project (GitHub 연결 안함!)
   
2. **PostgreSQL 추가**
   - New → Database → PostgreSQL

3. **GitHub 리포지토리 연결**
   - New → GitHub Repo
   - 리포지토리 선택 후 "Configure" 클릭
   
4. **Service Settings에서 Root Directory 설정**
   - Service 클릭 → Settings 탭
   - `Root Directory` 항목에 `backend` 입력
   - `Save` 클릭

5. **환경 변수 설정**
   - Variables 탭에서 필수 환경 변수 추가:
   ```
   RAILWAY_DOCKERFILE_PATH=Dockerfile
   JWT_SECRET=your-secure-jwt-secret
   CRYPTO_SECRET_KEY=your-crypto-key
   GOOGLE_CLIENT_ID=your-google-id
   GOOGLE_CLIENT_SECRET=your-google-secret
   CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app
   ```

### 2️⃣ 방법 B: railway.json 사용 (이미 생성됨)

1. **Git 푸시**
   ```bash
   git add railway.json
   git commit -m "fix: Railway monorepo 설정 추가"
   git push origin main
   ```

2. **새 프로젝트 생성**
   - New Project → Deploy from GitHub repo
   - 리포지토리 선택 (railway.json이 자동 인식됨)

### 3️⃣ 방법 C: Railway CLI 사용

```bash
# Railway CLI 설치 (없으면)
npm install -g @railway/cli

# 로그인
railway login

# 새 프로젝트 생성
railway init

# backend 디렉토리로 이동
cd backend

# Railway 링크
railway link

# 환경 변수 설정
railway variables set JWT_SECRET="your-secret"
railway variables set CRYPTO_SECRET_KEY="your-key"
railway variables set GOOGLE_CLIENT_ID="your-id"
railway variables set GOOGLE_CLIENT_SECRET="your-secret"
railway variables set CORS_ALLOWED_ORIGINS="https://your-frontend.vercel.app"

# 배포
railway up
```

## 🔧 문제 해결 체크리스트

### Railway 대시보드 확인 사항
- [ ] Service Settings → Root Directory가 `backend`로 설정됨
- [ ] Build Logs에서 Dockerfile을 찾았는지 확인
- [ ] PostgreSQL이 연결되었는지 확인 (DATABASE_URL 자동 생성)
- [ ] 환경 변수가 모두 설정되었는지 확인

### 빌드 로그 확인
```
✅ 정상 로그:
- "Using Dockerfile at backend/Dockerfile"
- "Building Docker image..."
- "Successfully built..."

❌ 문제 로그:
- "No Dockerfile found"
- "Cannot find build configuration"
- "Initializing..." (5분 이상)
```

## 🚨 자주 발생하는 문제

### 1. "No Dockerfile found"
- **해결**: Root Directory를 `backend`로 설정
- **또는**: `RAILWAY_DOCKERFILE_PATH=Dockerfile` 환경 변수 추가

### 2. "Build failed"
- **해결**: gradle wrapper 권한 문제
- **수정**: Git Bash에서:
  ```bash
  cd backend
  git update-index --chmod=+x gradlew
  git commit -m "fix: gradlew 실행 권한 추가"
  git push
  ```

### 3. "Port binding failed"
- **해결**: PORT 환경 변수 확인
- Railway가 자동으로 PORT를 할당하므로 직접 설정하지 않음

### 4. Database connection failed
- **해결**: PostgreSQL 서비스 확인
- DATABASE_URL이 자동으로 주입되는지 확인

## 💡 Railway 프로젝트 구조 (올바른 설정)

```
Railway Project/
├── PostgreSQL Service
└── Backend Service
    ├── Root Directory: backend
    ├── Dockerfile Path: Dockerfile (또는 ./Dockerfile)
    └── Start Command: (railway.toml에서 읽음)
```

## 📞 추가 도움

1. Railway 대시보드 로그 확인
2. Railway Discord: https://discord.gg/railway
3. 프로젝트 Settings → Support 탭에서 도움 요청

## ✅ 성공 확인
- Build Logs에 "Successfully deployed" 메시지
- 생성된 URL로 접속 가능
- `/actuator/health` 엔드포인트 응답 확인