# Vercel 모노레포 설정 가이드

## ⚠️ 중요: Vercel 대시보드 설정

### 1. Project Settings → General 에서 설정

#### Root Directory 설정
- **값**: `frontend`
- **중요**: 슬래시(/) 없이 입력 (❌ `/frontend` ✅ `frontend`)

#### Framework Preset
- **값**: `Next.js`

#### Node.js Version
- **값**: `18.x`

### 2. Build & Development Settings

#### Build Command
- **기본값 사용** (비워두면 자동으로 `npm run build` 사용)
- 또는 명시적으로: `npm run build`

#### Output Directory  
- **기본값 사용** (비워두면 자동으로 `.next` 사용)
- 또는 명시적으로: `.next`

#### Install Command
- **기본값 사용** (비워두면 자동으로 `npm ci` 사용)

### 3. Ignored Build Step (중요!)

Build & Development Settings 페이지 하단:

**옵션 1: Vercel 자동 감지 사용 (권장)**
1. **"Ignored Build Step"** 섹션 찾기
2. **토글 스위치 활성화** ✅
3. **커스텀 명령어는 비워두기** (Vercel이 자동으로 frontend 폴더 변경 감지)

**옵션 2: 수동 설정 (필요한 경우)**
- 대시보드에서 커스텀 명령어 입력란을 비워두고 Vercel의 자동 감지에 의존
- Vercel은 Root Directory가 설정된 경우 해당 폴더의 변경사항만 자동으로 추적

### 4. 환경 변수 설정

Environment Variables 페이지에서 직접 값 입력:

#### 필수 환경 변수:
```
 
```

#### 선택 환경 변수:
```
NEXT_PUBLIC_MONITORING_API_BASE=http://127.0.0.1:5001
NEXT_PUBLIC_PUBLIC_API_TOKEN=public-readonly
```

**중요**: 
- vercel.json의 `env` 섹션은 제거됨 (Secret 참조 오류 방지)
- Vercel 대시보드에서 직접 환경 변수 입력
- Production, Preview, Development 환경에 모두 적용하려면 각 환경 체크박스 선택

## 🔍 문제 해결

### "Root Directory does not exist" 오류가 발생하는 경우:

1. **GitHub 저장소 확인**
   - GitHub에서 `frontend` 폴더가 있는지 확인
   - main 브랜치에 최신 코드가 푸시되었는지 확인

2. **Vercel에서 재배포**
   - Deployments 탭에서 "Redeploy" 클릭
   - "Use existing Build Cache" 체크 해제
   - Redeploy 실행

3. **Vercel 프로젝트 재연결** (최후의 수단)
   - Settings → Git → Disconnect
   - 다시 GitHub 저장소 연결
   - Root Directory를 `frontend`로 설정

## 📝 체크리스트

- [ ] Root Directory: `frontend` (슬래시 없이)
- [ ] Framework Preset: Next.js
- [ ] Node.js Version: 18.x
- [ ] Ignored Build Step: 활성화
- [ ] 환경 변수: 모두 설정
- [ ] GitHub main 브랜치: 최신 상태

## 🚀 배포 확인

설정 완료 후:
1. Deployments 탭에서 새 배포 확인
2. Build Logs에서 오류 확인
3. 성공 시 Preview URL로 접속 테스트

## 📌 참고사항

- Vercel은 설정 변경 후 다음 배포부터 적용됩니다
- Root Directory 설정은 대소문자를 구분합니다
- 모노레포에서는 반드시 Ignored Build Step을 활성화해야 효율적입니다