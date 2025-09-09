# 🚀 빠른 설정 가이드

## 현재 상태
- ✅ **Railway Backend**: 배포 완료, PostgreSQL 연결됨
- ⏳ **Vercel Frontend**: 별도 리포지토리에 있음 (설정 필요)

## Vercel Frontend 설정 (3단계)

### 1️⃣ Vercel Dashboard에서 환경 변수 추가

[Vercel Dashboard](https://vercel.com) → 프로젝트 선택 → Settings → Environment Variables

```bash
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

### 2️⃣ Railway Backend URL 확인

Railway Dashboard에서 Backend 서비스 URL 복사
- 예: `https://coin-trading-backend.railway.app`

### 3️⃣ Vercel 재배포

Environment Variables 추가 후 반드시 재배포:
- Deployments → 최신 배포 → Redeploy

## Railway Backend 환경 변수 (이미 설정됨)

```bash
SPRING_PROFILES_ACTIVE=railway
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=LbUiGeQhj4mQWfKtl9SzSf4O5hB3ewHoqckB6o0owJcLnZKGPGxzo98zcUWzWVafXoCQWVq26PcKQiB2g
CRYPTO_SECRET_KEY=8pTUVbSP5kSmtWuR4YoDOAwxoivNcZhzERUfHl4iVNY=
CORS_ALLOWED_ORIGINS=https://autotradings.vercel.app,http://localhost:3000
```

## ⚠️ 중요

**CORS_ALLOWED_ORIGINS**에 실제 Vercel URL이 포함되어 있는지 확인:
- 현재: `https://autotradings.vercel.app`
- 다른 URL이면 Railway Variables에서 수정 필요

## 테스트

브라우저에서 Vercel 앱 접속 → 개발자 도구(F12) → Console:

```javascript
// API 연결 테스트
fetch('https://your-backend.railway.app/actuator/health')
  .then(res => res.json())
  .then(data => console.log('Backend 연결 성공:', data));
```

## 문제 발생 시

1. **CORS 에러**: Railway의 CORS_ALLOWED_ORIGINS 확인
2. **연결 실패**: Backend URL이 https://로 시작하는지 확인
3. **401 에러**: JWT 토큰 설정 확인

## 완료 체크리스트

- [ ] Vercel에 NEXT_PUBLIC_API_URL 환경 변수 추가
- [ ] Railway Backend URL로 설정
- [ ] Vercel 재배포
- [ ] 브라우저에서 연결 테스트
- [ ] 로그인/회원가입 기능 테스트