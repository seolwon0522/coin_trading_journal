# 🔄 Vercel 배포 대체 방법 가이드

## 문제가 계속되는 경우 사용할 대체 방법

### 방법 B: Root Directory를 사용하지 않는 설정

이 방법은 Root Directory 설정 없이 프로젝트 루트에서 모든 것을 처리합니다.

## 📋 설정 단계

### 1. 파일 준비
```bash
# vercel.alternative.json을 vercel.json으로 이름 변경
mv vercel.alternative.json vercel.json

# frontend 폴더의 vercel.json 삭제 (옵션)
rm frontend/vercel.json
```

### 2. Vercel 대시보드 설정

#### Project Settings → General
- **Root Directory**: **비워두기** (아무것도 입력하지 않음)
- **Framework Preset**: `Next.js`
- **Node.js Version**: `18.x`

#### Build & Development Settings
- **Build Command**: 자동 감지 (vercel.json 사용)
- **Output Directory**: 자동 감지 (vercel.json 사용)
- **Install Command**: 자동 감지

#### Ignored Build Step
- **활성화** ✅
- 커스텀 명령어는 자동으로 설정됨 (`git diff HEAD^ HEAD --quiet frontend/`)

### 3. 환경 변수 설정
Vercel 대시보드에서 직접 입력:
```
NEXT_PUBLIC_API_BASE_URL=https://coin-trading-journal-production.up.railway.app
NEXT_PUBLIC_APP_URL=https://coin-trading-journal.vercel.app
NEXT_PUBLIC_GOOGLE_CLIENT_ID=25307816741-gbf2qretmo0m5il4ao4ke89g2o4fkig4.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

## 🎯 이 방법의 장점

1. **Git 컨텍스트 유지**: 프로젝트 루트에서 실행되므로 git 명령어가 정상 작동
2. **더 나은 제어**: 빌드 프로세스를 직접 제어 가능
3. **모노레포 친화적**: 다른 서비스와의 통합이 쉬움
4. **ignoreCommand 작동**: frontend 폴더 변경 감지가 정상 작동

## 🔍 문제 해결

### 빌드 실패 시
1. 로컬에서 테스트:
   ```bash
   cd frontend
   npm ci
   npm run build
   ```

2. node_modules 캐시 초기화:
   - Vercel 대시보드 → Settings → Advanced → Delete Build Cache

### 환경 변수 문제
- 모든 환경 변수가 Vercel 대시보드에 설정되었는지 확인
- Production, Preview, Development 환경 모두 체크

## 📌 최종 체크리스트

- [ ] vercel.json이 프로젝트 루트에 있음
- [ ] Root Directory 설정이 비어있음
- [ ] Ignored Build Step 활성화됨
- [ ] 환경 변수가 모두 설정됨
- [ ] GitHub main 브랜치에 최신 코드 푸시됨

## 🚀 재배포

1. Deployments 탭으로 이동
2. "Redeploy" 클릭
3. "Use existing Build Cache" **체크 해제**
4. "Redeploy" 실행

이 방법은 Vercel의 모노레포 처리에서 가장 안정적인 방법 중 하나입니다.