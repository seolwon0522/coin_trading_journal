# 코인 트레이딩 저널 프로젝트

## 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI
- **State Management**: React Query (TanStack Query)
- **HTTP Client**: Axios
- **Code Quality**: ESLint + Prettier + Husky

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 프로덕션 서버 실행
npm run start
```

## 🛠 개발 도구

```bash
# ESLint 검사
npm run lint

# ESLint 자동 수정
npm run lint:fix

# Prettier 검사
npm run prettier

# Prettier 자동 포맷팅
npm run prettier:fix

# TypeScript 타입 검사
npm run type-check
```

## 📁 프로젝트 구조

```
src/
├── app/                    # Next.js App Router 페이지
├── components/             # 재사용 가능한 컴포넌트
│   ├── ui/                # Shadcn UI 컴포넌트
│   └── providers/         # Context Provider들
├── hooks/                  # 커스텀 React Hook들
├── lib/                    # 유틸리티 및 설정
│   ├── api/               # API 호출 함수들
│   ├── axios.ts           # Axios 설정
│   ├── query-client.ts    # React Query 설정
│   └── utils.ts           # 공통 유틸리티
```

## 주요 설정

### React Query

- 기본 staleTime: 5분
- 자동 재시도: 1회
- 개발자 도구 포함

### Axios

- 기본 타임아웃: 10초
- 요청/응답 인터셉터 설정
- 에러 처리 및 로깅

### ESLint + Prettier

- TypeScript 규칙 적용
- 코드 포맷팅 자동화
- Husky를 통한 pre-commit hook

## 환경변수

```bash
# .env.local 파일 생성
NEXT_PUBLIC_API_BASE_URL=your_api_base_url
NEXT_PUBLIC_API_KEY=your_api_key
```

## 주요 기능

- Next.js 14 + TypeScript 설정
- Tailwind CSS 스타일링 (다크 모드 지원)
- Shadcn UI 컴포넌트 시스템
- React Query 데이터 페칭
- Axios HTTP 클라이언트
- ESLint + Prettier 코드 품질
- Husky Git Hook 자동화
- 반응형 레이아웃 (Header + Sidebar + Content)
- 다크 모드 토글 기능
- Toast 알림 시스템 (Sonner)
- 모바일 친화적 네비게이션
- 실시간 비트코인 가격 예제

## 개발 가이드

1. **컴포넌트 생성**: `src/components/` 폴더에 생성
2. **API 함수**: `src/lib/api/` 폴더에 생성
3. **커스텀 Hook**: `src/hooks/` 폴더에 생성
4. **유틸리티**: `src/lib/` 폴더에 생성

## 참고 링크

- [Next.js 문서](https://nextjs.org/docs)
- [TypeScript 문서](https://www.typescriptlang.org/docs)
- [Tailwind CSS 문서](https://tailwindcss.com/docs)
- [Shadcn UI 문서](https://ui.shadcn.com)
- [React Query 문서](https://tanstack.com/query/latest)
