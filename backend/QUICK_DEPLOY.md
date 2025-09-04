# 🚀 Railway 빠른 배포 가이드

## 1. 배포 전 체크
```bash
# Windows
deploy-check.bat

# Linux/Mac
chmod +x deploy-check.sh
./deploy-check.sh
```

## 2. Railway 설정

### 2.1 Railway 프로젝트 생성
1. [Railway.app](https://railway.app) 로그인
2. `New Project` → `Deploy from GitHub repo`
3. GitHub 리포지토리 연결 → `backend` 폴더 선택

### 2.2 PostgreSQL 추가
1. `New` → `Database` → `PostgreSQL`
2. 자동으로 `DATABASE_URL` 연결됨

### 2.3 환경 변수 설정 (Railway Variables 탭)

```bash
# 필수 환경 변수 (복사해서 사용)
JWT_SECRET=your-very-long-secure-jwt-secret-key-here-minimum-512-bits
CRYPTO_SECRET_KEY=your-base64-encoded-32-byte-key-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app

# 선택 환경 변수
USE_BINANCE_TESTNET=true
BINANCE_API_KEY=your-binance-api-key
BINANCE_SECRET_KEY=your-binance-secret-key
```

#### 🔑 키 생성 명령어
```powershell
# JWT Secret 생성 (PowerShell)
[System.Convert]::ToBase64String((1..64 | ForEach-Object {Get-Random -Maximum 256}))

# Crypto Key 생성 (PowerShell)
[System.Convert]::ToBase64String((1..32 | ForEach-Object {Get-Random -Maximum 256}))
```

## 3. 배포 실행
```bash
# Git 푸시
git add .
git commit -m "Railway 배포 설정"
git push origin main
```

## 4. 배포 확인
- Railway 대시보드에서 빌드 로그 확인
- 생성된 URL로 접속: `https://your-app.up.railway.app/actuator/health`
- Swagger UI 확인: `https://your-app.up.railway.app/swagger-ui/index.html`

## 5. 프론트엔드 연결 (Vercel)
Vercel 환경 변수에 추가:
```bash
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
```

## 📞 문제 발생 시
1. Railway 대시보드 → Logs 탭 확인
2. `DATABASE_URL` 자동 연결 확인
3. 환경 변수 오타 확인
4. CORS 설정에 프론트엔드 URL 포함 확인

## ✅ 체크리스트
- [ ] deploy-check 스크립트 실행 성공
- [ ] Railway 프로젝트 생성
- [ ] PostgreSQL 추가
- [ ] 환경 변수 모두 설정
- [ ] Git 푸시 완료
- [ ] 헬스체크 URL 접속 성공
- [ ] 프론트엔드 연결 완료