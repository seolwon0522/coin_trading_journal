# 📋 단계별 실행 가이드 - 짧은 명령어 버전

각 단계를 개별적으로 복사해서 실행하세요. 너무 긴 프롬프트 때문에 잘리지 않도록 간결하게 만들었습니다.

---

## 🚀 빠른 전체 분석 (한번에)
```
coin_trading_journal 프로젝트를 완전 분석해줘. backend와 frontend의 API 불일치, 타입 불일치, 보안 취약점을 모두 찾아서 analysis_results/ 폴더에 저장하고 critical 이슈는 자동 수정해줘.
```

---

## 📌 PHASE 1: 프로젝트 구조 분석

### Step 1.1: 백엔드 구조 분석
```
backend 폴더의 모든 Controller, Service, Repository를 분석해줘. 
- 모든 API 엔드포인트 추출
- 보안 설정 확인
- 데이터베이스 연결 상태
결과를 analysis_results/backend_structure.md에 저장해줘.
```

### Step 1.2: 프론트엔드 구조 분석
```
frontend 폴더의 모든 컴포넌트와 API 호출을 분석해줘.
- 모든 API 서비스 파일 검색
- 상태관리 분석
- 타입 정의 확인
결과를 analysis_results/frontend_structure.md에 저장해줘.
```

### Step 1.3: 데이터베이스 스키마 분석
```
backend의 모든 Entity 클래스를 분석해서 데이터베이스 구조를 파악해줘.
- JPA Entity 관계 매핑
- 인덱스 최적화 기회
결과를 analysis_results/database_schema.md에 저장해줘.
```

---

## 📌 PHASE 2: API 매핑 및 불일치 수정

### Step 2.1: API 엔드포인트 완전 매핑
```
backend의 모든 @Controller 파일에서 API 엔드포인트를 추출해줘.
각 엔드포인트의 HTTP 메서드, URL, 파라미터, 응답 타입을 문서화하고
analysis_results/api_endpoints.md에 저장해줘.
```

### Step 2.2: 프론트엔드 API 호출 매핑
```
frontend의 모든 API 호출 지점을 찾아줘.
services/*.ts 파일과 컴포넌트의 API 호출을 모두 찾아서
analysis_results/frontend_api_calls.md에 저장해줘.
```

### Step 2.3: API 불일치 자동 수정
```
백엔드와 프론트엔드의 API 불일치를 모두 찾아서 자동 수정해줘.
- 잘못된 엔드포인트 경로 수정
- HTTP 메서드 수정
- 파라미터 매칭
수정 내역을 analysis_results/api_fixes.md에 기록해줘.
```

---

## 📌 PHASE 3: 타입 동기화

### Step 3.1: Java DTO vs TypeScript 타입 비교
```
backend의 모든 DTO와 frontend의 TypeScript 타입을 비교해줘.
불일치하는 필드와 타입을 모두 찾아서
analysis_results/type_comparison.md에 저장해줘.
```

### Step 3.2: TypeScript 타입 자동 생성
```
Java DTO를 기반으로 TypeScript 타입을 자동 생성해줘.
누락된 타입은 frontend/src/types/generated/에 생성하고
기존 타입은 수정해줘.
```

---

## 📌 PHASE 4: 보안 및 인증

### Step 4.1: JWT 인증 분석
```
JWT 인증 플로우를 완전히 분석해줘.
- 백엔드 JWT 구현 확인
- 프론트엔드 토큰 관리
- 보안 취약점 스캔
결과를 analysis_results/auth_flow.md에 저장해줘.
```

### Step 4.2: 보안 취약점 수정
```
발견된 모든 보안 취약점을 자동 수정해줘.
- JWT Secret 환경변수화
- XSS 방지
- SQL Injection 방지
수정 내역을 analysis_results/security_patches.md에 기록해줘.
```

---

## 📌 PHASE 5: 성능 최적화

### Step 5.1: 성능 병목 분석
```
백엔드와 프론트엔드의 성능 병목 지점을 분석해줘.
- N+1 쿼리 문제
- 불필요한 리렌더링
- Bundle 크기
결과를 analysis_results/performance_analysis.md에 저장해줘.
```

### Step 5.2: 성능 최적화 적용
```
발견된 성능 문제를 자동 최적화해줘.
- 쿼리 최적화
- React.memo 적용
- Code splitting
결과를 analysis_results/performance_optimized.md에 기록해줘.
```

---

## 📌 PHASE 6: 에러 처리

### Step 6.1: 에러 처리 분석
```
프로젝트 전체의 에러 처리를 분석해줘.
- 백엔드 Exception Handler
- 프론트엔드 Error Boundary
- 에러 처리 누락 지점
결과를 analysis_results/error_handling.md에 저장해줘.
```

### Step 6.2: 통합 에러 시스템 구현
```
통합 에러 처리 시스템을 구현해줘.
- Global Exception Handler 생성
- Error Service 구현
- Error Boundary 추가
구현 내역을 analysis_results/error_system.md에 기록해줘.
```

---

## 📌 PHASE 7: 최종 리포트 및 테스트

### Step 7.1: 종합 리포트 생성
```
모든 분석 결과를 종합해서 최종 리포트를 생성해줘.
- 발견된 이슈 요약
- 자동 수정된 항목
- 추가 권장사항
analysis_results/FINAL_REPORT.md에 저장해줘.
```

### Step 7.2: Critical 이슈 자동 수정
```
Critical 등급의 모든 이슈를 자동 수정해줘.
- 보안 취약점
- API 불일치
- 타입 에러
수정 내역을 analysis_results/critical_fixes.md에 기록해줘.
```

---

## 💡 사용 방법

1. **개별 실행**: 각 Step을 하나씩 복사해서 실행
2. **Phase별 실행**: 같은 Phase의 Step들을 모아서 실행
3. **전체 실행**: 맨 위의 "빠른 전체 분석" 명령어 사용

## 📁 결과 확인

모든 분석 결과는 `analysis_results/` 폴더에 저장됩니다:
- `backend_structure.md` - 백엔드 구조 분석
- `frontend_structure.md` - 프론트엔드 구조 분석
- `api_endpoints.md` - API 엔드포인트 목록
- `api_fixes.md` - API 수정 내역
- `type_comparison.md` - 타입 비교 결과
- `security_patches.md` - 보안 패치 내역
- `performance_analysis.md` - 성능 분석 결과
- `FINAL_REPORT.md` - 최종 종합 리포트

## 🎯 예상 소요 시간

- 개별 Step: 1-3분
- Phase별: 5-10분  
- 전체 분석: 30-45분