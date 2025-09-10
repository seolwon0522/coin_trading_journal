# 🚀 Vercel 배포 가이드 (간단 버전)

## 📋 Vercel 대시보드 설정

### 1. Project Settings → General

#### Root Directory
- **비워두기** (아무것도 입력하지 않음)
- Vercel이 프로젝트 루트의 vercel.json을 읽음

#### Framework Preset
- **Other** 선택 (자동 감지 비활성화)

#### Node.js Version
- **18.x**

### 2. Environment Variables 설정

Vercel 대시보드 → Settings → Environment Variables에서 추가:

```
NEXT_PUBLIC_API_BASE_URL=https://coin-trading-journal-production.up.railway.app
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_GOOGLE_CLIENT_ID=25307816741-gbf2qretmo0m5il4ao4ke89g2o4fkig4.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

### 3. 재배포

1. Deployments 탭 → Redeploy
2. "Use existing Build Cache" **체크 해제**
3. Redeploy 클릭

## ✅ 이 설정의 장점

- **가장 단순**: 복잡한 설정 없이 기본값 사용
- **안정적**: Git 컨텍스트 문제 없음
- **유지보수 쉬움**: 모든 설정이 vercel.json 한 곳에

## 📝 vercel.json 설명

```json
{
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/.next",
  "installCommand": "echo 'Install handled by buildCommand'",
  "framework": null
}
```

- `buildCommand`: frontend 폴더로 이동 후 빌드
- `outputDirectory`: 빌드 결과물 위치
- `installCommand`: buildCommand에서 처리하므로 echo 사용
- `framework`: null로 설정하여 자동 감지 비활성화

## 🔍 문제 해결

### 빌드 실패 시
1. 로컬에서 테스트:
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. 빌드 캐시 삭제:
   - Vercel 대시보드 → Settings → Advanced → Delete Build Cache

### 환경 변수 확인
- 모든 환경 변수가 설정되었는지 확인
- Production, Preview, Development 모두 선택

## 🎯 체크리스트

- [ ] Root Directory 비워둠
- [ ] Framework Preset: Other
- 
- [ ] vercel.json이 프로젝트 루트에 있음
- [ ] 환경 변수 모두 설정
- [ ] GitHub main 브랜치에 최신 코드 푸시