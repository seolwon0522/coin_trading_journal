# Vercel 배포 가이드

## 🚀 Vercel 환경 변수 설정

### 1. Vercel Dashboard 접속
[https://vercel.com](https://vercel.com) → 프로젝트 선택

### 2. Environment Variables 설정
Settings → Environment Variables → Add New

```bash
# Railway Backend URL (실제 URL로 변경하세요!)
NEXT_PUBLIC_API_BASE_URL=https://coin-trading-journal-production.up.railway.app

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=617965160441-duhprvkkvvhgifgp12osligng8scp8bd.apps.googleusercontent.com

# 기타 (선택사항)
NEXT_PUBLIC_MONITORING_API_BASE=http://127.0.0.1:5001
NEXT_PUBLIC_PUBLIC_API_TOKEN=public-readonly
```

### 3. 재배포 (중요!)
Deployments → 최신 배포 → Redeploy → Use existing Build Cache: **No**

## 🏠 로컬 개발 환경

`frontend/.env.local` 파일:
```bash
# 로컬 백엔드 사용
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080

# 또는 Railway 백엔드 사용
NEXT_PUBLIC_API_BASE_URL=https://coin-trading-journal-production.up.railway.app
```

## ✅ Railway Backend 설정 확인

Railway Variables에 다음이 설정되어 있는지 확인:
```bash
CORS_ALLOWED_ORIGINS=https://autotradings.vercel.app,http://localhost:3000
```

Vercel 도메인이 다르면 추가:
```bash
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app,https://autotradings.vercel.app,http://localhost:3000
```

## 🧪 연결 테스트

### 1. Backend Health Check
```javascript
// 브라우저 콘솔에서
fetch('https://coin-trading-journal-production.up.railway.app/actuator/health')
  .then(res => res.json())
  .then(data => console.log('Backend 연결 성공:', data));
```

### 2. 회원가입 테스트
1. Vercel 앱 접속
2. 회원가입 버튼 클릭
3. 개발자 도구(F12) → Network 탭에서 요청 확인
4. `/api/auth/register` 요청이 Railway URL로 가는지 확인

## ⚠️ 문제 해결

### localhost:8080 에러
- **원인**: 환경 변수 미설정
- **해결**: Vercel에 `NEXT_PUBLIC_API_BASE_URL` 추가 후 재배포

### CORS 에러
- **원인**: Railway CORS 설정에 Vercel 도메인 없음
- **해결**: Railway의 `CORS_ALLOWED_ORIGINS`에 Vercel 도메인 추가

### 404 Not Found
- **원인**: Backend API 경로 오류
- **해결**: Railway 로그 확인, API 경로 검증