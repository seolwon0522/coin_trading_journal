# 🚀 Deployment Guide

## 📋 Overview

이 프로젝트는 **모노레포 구조**로 단일 `main` 브랜치에서 관리되며, 각 서비스는 독립적으로 배포됩니다.

- **Frontend**: Vercel (자동 배포)
- **Backend**: Railway (자동 배포)
- **Branch Strategy**: GitHub Flow (main 브랜치만 사용)

## 🏗️ Architecture

```
main branch
├── /frontend → Vercel (자동 감지 및 배포)
├── /backend → Railway (자동 감지 및 배포)
└── /.github/workflows → CI/CD 파이프라인
```

## 🔧 Deployment Configuration

### Frontend (Vercel)

**자동 배포 설정:**
- Branch: `main`
- Root Directory: `frontend` (Vercel 대시보드에서 설정)
- Framework: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
- Ignored Build Step: 활성화 (frontend 폴더 변경시에만 빌드)

**환경 변수 (Vercel Dashboard에서 설정):**
```env
NEXT_PUBLIC_API_URL=https://coin-trading-journal-production.up.railway.app
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```ㅌ

### Backend (Railway)

**자동 배포 설정:**
- Branch: `main`
- Root Directory: `/backend`
- Build Command: `./gradlew build`
- Start Command: `java -Dspring.profiles.active=railway -jar build/libs/*.jar`

**환경 변수 (Railway Dashboard에서 설정):**
```env
PORT=8080
SPRING_PROFILES_ACTIVE=railway
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
JWT_SECRET=your-jwt-secret
```

## 📝 Deployment Workflow

### 1. Development
```bash
# 기능 개발
git checkout -b feature/your-feature
# 코드 작성 및 테스트
git add .
git commit -m "feat: add new feature"
git push origin feature/your-feature
```

### 2. Pull Request
- GitHub에서 PR 생성
- 자동으로 CI 테스트 실행 (GitHub Actions)
- 코드 리뷰 진행
- Vercel이 PR용 프리뷰 URL 자동 생성

### 3. Merge to Main
```bash
# PR 승인 후 main에 머지
git checkout main
git pull origin main
```

### 4. Automatic Deployment
- **Frontend**: Vercel이 `/frontend` 변경 감지 → 자동 빌드 및 배포
- **Backend**: Railway가 `/backend` 변경 감지 → 자동 빌드 및 배포
- 각 서비스는 독립적으로 배포되므로 다른 서비스에 영향 없음

## 🔍 Deployment Monitoring

### Health Checks
- Frontend: `https://your-app.vercel.app/api/health`
- Backend: `https://your-api.railway.app/health`

### Logs
- **Vercel**: Dashboard → Functions → Logs
- **Railway**: Dashboard → Deployments → View Logs

## 🚨 Rollback Strategy

### Vercel (Frontend)
1. Vercel Dashboard → Deployments
2. 이전 배포 선택
3. "Promote to Production" 클릭

### Railway (Backend)
1. Railway Dashboard → Deployments
2. 이전 배포 선택
3. "Redeploy" 클릭

## 📊 Performance Optimization

### Build Time Optimization
- **Vercel**: `ignoreCommand`로 불필요한 빌드 방지
- **Railway**: `watchPatterns`로 관련 파일만 감시

### Runtime Optimization
- **Frontend**: Edge Functions, ISR 활용
- **Backend**: JVM 메모리 설정, Connection Pool 최적화

## 🔒 Security

### Environment Variables
- 절대 코드에 하드코딩하지 않음
- 각 플랫폼의 환경 변수 관리 기능 사용
- 민감한 정보는 Secret으로 관리

### CORS Settings
- Production 도메인만 허용
- 개발 환경과 프로덕션 환경 분리

## 📈 Scaling

### Vercel
- 자동 스케일링 (Serverless)
- Edge Network 활용
- 필요시 Pro/Enterprise 플랜 업그레이드

### Railway
- Horizontal Scaling: `numReplicas` 증가
- Vertical Scaling: 더 큰 인스턴스로 업그레이드
- Database: Read Replica 추가 고려

## 🆘 Troubleshooting

### Common Issues

**Frontend 빌드 실패:**
```bash
# 로컬에서 빌드 테스트
cd frontend
npm run build
```

**Backend 빌드 실패:**
```bash
# 로컬에서 빌드 테스트
cd backend
./gradlew clean build
```

**환경 변수 누락:**
- 각 플랫폼 대시보드에서 환경 변수 확인
- `.env.example` 파일과 비교

## 📞 Support

- **Vercel Status**: https://vercel.com/status
- **Railway Status**: https://railway.app/status
- **Project Issues**: GitHub Issues 활용