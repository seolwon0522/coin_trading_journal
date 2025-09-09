# Vercel Frontend - Railway Backend 통합 가이드

## 🚀 빠른 설정

### 1. Railway Backend URL 확인
Railway Dashboard에서 Backend 서비스의 URL을 확인합니다.
- 예: `https://your-backend.railway.app`

### 2. Vercel 환경 변수 설정

Vercel Dashboard → Settings → Environment Variables에서 추가:

```bash
# Railway 백엔드 URL (끝에 슬래시 없이)
NEXT_PUBLIC_API_URL=https://your-backend.railway.app

# 또는 (프레임워크에 따라)
REACT_APP_API_URL=https://your-backend.railway.app
VITE_API_URL=https://your-backend.railway.app
```

### 3. Frontend 코드에서 API URL 사용

#### Next.js 예시
```javascript
// utils/api.js
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const fetchData = async (endpoint) => {
  const response = await fetch(`${API_URL}${endpoint}`);
  return response.json();
};
```

#### React (Create React App) 예시
```javascript
// config/api.js
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

export default API_URL;
```

#### Vue/Vite 예시
```javascript
// config/api.js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export default API_URL;
```

## 🔧 Railway Backend CORS 설정 확인

`application-railway.yaml`에 이미 설정되어 있습니다:

```yaml
cors:
  allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:3000}
  allowed-methods: GET,POST,PUT,DELETE,OPTIONS
  allowed-headers: "*"
  allow-credentials: true
```

Railway Variables에서 `CORS_ALLOWED_ORIGINS` 업데이트:
```
CORS_ALLOWED_ORIGINS=https://autotradings.vercel.app,http://localhost:3000
```

## 📋 통합 체크리스트

### Backend (Railway)
- [ ] Railway에 백엔드 배포 완료
- [ ] DATABASE_URL 연결 확인
- [ ] Health check 엔드포인트 작동 확인 (`/actuator/health`)
- [ ] CORS_ALLOWED_ORIGINS에 Vercel URL 추가

### Frontend (Vercel)
- [ ] Vercel에 프론트엔드 배포 완료
- [ ] 환경 변수에 Railway Backend URL 설정
- [ ] API 호출 코드에서 환경 변수 사용
- [ ] 빌드 후 재배포

## 🧪 연결 테스트

### 1. Backend Health Check
```bash
curl https://your-backend.railway.app/actuator/health
```

### 2. Frontend에서 Backend 호출 테스트
브라우저 콘솔에서:
```javascript
fetch('https://your-backend.railway.app/api/test')
  .then(res => res.json())
  .then(data => console.log(data));
```

## 🐛 문제 해결

### CORS 에러
```
Access to fetch at 'https://backend.railway.app' from origin 'https://frontend.vercel.app' has been blocked by CORS policy
```

**해결방법**:
1. Railway Backend Variables에서 CORS_ALLOWED_ORIGINS 확인
2. Vercel 도메인이 포함되어 있는지 확인
3. Backend 재배포

### 연결 실패
```
Failed to fetch
```

**해결방법**:
1. Railway Backend가 실행 중인지 확인
2. Backend URL이 올바른지 확인 (https 사용)
3. Railway 로그 확인: `railway logs --service=backend`

### 401 Unauthorized
인증이 필요한 엔드포인트 접근 시

**해결방법**:
1. JWT 토큰이 올바르게 전송되는지 확인
2. Frontend의 Authorization 헤더 설정 확인
```javascript
headers: {
  'Authorization': `Bearer ${token}`
}
```

## 📱 로컬 개발 환경 설정

### Frontend `.env.local`
```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### 로컬에서 Railway Backend 사용하기
```bash
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

## 🎉 완료!

이제 Vercel Frontend와 Railway Backend가 연결되었습니다.

### 최종 확인사항
- ✅ Frontend에서 Backend API 호출 성공
- ✅ 로그인/회원가입 기능 작동
- ✅ 데이터 CRUD 작업 정상 동작
- ✅ WebSocket 연결 (필요한 경우)