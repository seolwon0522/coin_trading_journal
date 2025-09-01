# Backend 코드 분석 및 개선 가이드

## 🎯 목적
백엔드 코드의 비즈니스 로직을 검토하고, 불필요한 코드를 제거하며, 프론트엔드와의 통합을 검증합니다.

---

## Step 1: 프로젝트 구조 파악

### 명령
```
backend/src/main/java 폴더 구조를 보여주고, 각 패키지의 역할을 설명해주세요.
특히 controller, service, repository, entity, dto 패키지를 중점적으로 확인해주세요.
```

### 확인 사항
- 전체 패키지 구조
- 주요 도메인 식별 (auth, trade, user 등)
- 각 계층의 클래스 수와 역할

---

## Step 2: Controller 분석

### 명령
```
backend/src/main/java의 모든 Controller 파일을 찾아서 다음을 분석해주세요:

1. 각 Controller의 엔드포인트 목록 (URL, HTTP 메서드)
2. Request/Response DTO 구조
3. 불필요하거나 중복된 엔드포인트
4. 에러 처리 방식

각 Controller 파일을 읽고 문제점을 찾아주세요.
```

### 체크리스트
- [ ] 모든 엔드포인트가 사용되고 있는가?
- [ ] Request/Response 구조가 명확한가?
- [ ] 적절한 HTTP 상태 코드를 반환하는가?
- [ ] 입력 검증이 되어 있는가?

---

## Step 3: Service 비즈니스 로직 검토

### 명령
```
Service 클래스들의 비즈니스 로직을 분석해주세요:

1. 각 Service 클래스의 주요 메서드를 읽어주세요
2. 복잡한 메서드(30줄 이상)를 찾아주세요
3. 중복된 로직이나 불필요한 코드를 식별해주세요
4. 트랜잭션 처리가 적절한지 확인해주세요

특히 TradeService, AuthService, UserService를 중점적으로 봐주세요.
```

### 개선 포인트
- 너무 긴 메서드는 분리 필요
- 중복 코드는 공통 메서드로 추출
- 불필요한 null 체크 제거
- 사용하지 않는 메서드 제거

---

## Step 4: Repository 쿼리 검토

### 명령
```
Repository 인터페이스들을 확인해주세요:

1. 모든 Repository 파일을 읽어주세요
2. 실제로 Service에서 사용되는 메서드인지 확인해주세요
3. N+1 문제가 있을 만한 쿼리를 찾아주세요
4. 불필요한 커스텀 쿼리가 있는지 확인해주세요
```

### 확인 사항
- 미사용 쿼리 메서드
- 비효율적인 쿼리
- EAGER/LAZY 페칭 전략

---

## Step 5: DTO와 Entity 매핑 확인

### 명령
```
DTO와 Entity 간의 매핑을 확인해주세요:

1. Request/Re sponse DTO의 필드를 확인해주세요
2. Entity와 DTO 간 변환 로직을 찾아주세요
3. 불필요한 필드나 누락된 필드를 찾아주세요
4. Frontend에서 실제로 사용하는 필드인지 확인해주세요
```

### 체크 포인트
- DTO의 모든 필드가 사용되는가?
- Entity → DTO 변환에서 누락된 정보는 없는가?
- 불필요한 데이터를 전송하고 있지 않은가?

---

## Step 6: Frontend API 호출과 Backend 엔드포인트 매칭

### 명령
```
Frontend와 Backend의 API 통합을 확인해주세요:

1. frontend/src/api 폴더의 API 호출 코드를 확인해주세요
2. Backend Controller의 엔드포인트와 매칭해주세요
3. Request/Response 타입이 일치하는지 확인해주세요
4. 불일치하는 부분을 리스트업해주세요
```

### 매칭 확인
```
Frontend API 호출 → Backend 엔드포인트
- POST /api/auth/login → AuthController.login()
- GET /api/trades → TradeController.getTrades()
...
```

---

## Step 7: 불필요한 코드 정리

### 명령
```
불필요한 코드를 찾아서 제거해주세요:

1. 사용하지 않는 import 문
2. 주석 처리된 코드
3. 사용하지 않는 private 메서드
4. Controller에서 호출하지 않는 Service 메서드
5. Service에서 호출하지 않는 Repository 메서드

각 파일별로 제거할 코드를 보여주고 삭제해주세요.
```

### 정리 대상
- 미사용 코드
- 중복 코드
- 주석 처리된 코드
- 디버깅용 코드 (System.out.println 등)

---

## Step 8: 개선 사항 적용

### 명령
```
발견된 문제들을 수정해주세요:

1. 누락된 DTO 필드 추가
2. 불필요한 코드 제거
3. 복잡한 메서드 분리
4. API 응답 구조 통일

각 수정 사항에 대해 설명하고 적용해주세요.
```

### 수정 우선순위
1. **긴급 (바로 수정)**
   - Frontend와 맞지 않는 API 응답
   - 누락된 필수 필드
   - 명백한 버그

2. **중요 (이번 작업에서 수정)**
   - 불필요한 코드 제거
   - 중복 코드 정리
   - 복잡한 메서드 개선

3. **개선 (추후 작업)**
   - 코드 스타일 통일
   - 성능 최적화
   - 테스트 코드 추가

---

## Step 9: 최종 검증

### 명령
```
수정 사항을 최종 확인해주세요:

1. 컴파일 에러가 없는지 확인
2. 주요 비즈니스 로직이 변경되지 않았는지 확인
3. Frontend API 호출이 정상 작동할지 검증
4. 제거된 코드 목록과 수정 사항 요약
```

### 최종 체크리스트
- [ ] 모든 Controller 엔드포인트 동작 확인
- [ ] Service 비즈니스 로직 보존
- [ ] Repository 쿼리 정상 작동
- [ ] Frontend 요구사항 충족
- [ ] 불필요한 코드 제거 완료

---

## 📊 예상 결과

### 개선 지표
- 코드 라인 수: 10-15% 감소
- 중복 코드: 80% 제거
- API 불일치: 100% 해결
- 복잡도: 30% 개선

### 작업 시간
- 분석: 1-2시간
- 수정: 1-2시간
- 검증: 30분

---

## 💡 실제 실행 예시

```bash
# Step 1 - 구조 파악
"backend/src/main/java 폴더 구조를 분석해주세요"

# Step 2 - Controller 분석
"AuthController.java를 읽고 문제점을 찾아주세요"

# Step 3 - Service 검토
"TradeService.java의 executeTrade 메서드를 분석해주세요"

# Step 4 - Repository 확인
"TradeRepository의 모든 메서드가 사용되는지 확인해주세요"

# Step 5 - DTO 매핑
"LoginResponse DTO와 Frontend 요구사항을 비교해주세요"

# Step 6 - API 매칭
"frontend/src/api/auth.ts와 AuthController를 비교해주세요"

# Step 7 - 코드 정리
"TradeService.java의 불필요한 코드를 제거해주세요"

# Step 8 - 수정 적용
"LoginResponse에 userInfo 필드를 추가해주세요"

# Step 9 - 최종 확인
"수정된 내용을 요약하고 문제가 없는지 확인해주세요"
```

---

이 가이드를 따라 단계별로 진행하면 백엔드 코드를 체계적으로 분석하고 개선할 수 있습니다.