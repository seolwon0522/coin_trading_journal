# 🚀 Backend 완전 분석 - 실행용 프롬프트 가이드

이 파일의 각 프롬프트를 **순서대로 복사해서 Claude Code에 붙여넣고 실행**하세요.

---

## 📋 Step 1: 전체 구조 매핑 [5분]

다음을 복사해서 실행:

```
backend 폴더의 전체 Java 파일 구조를 분석해주세요. Glob과 Grep 도구를 사용하여:

1. src/**/*.java 패턴으로 모든 Java 파일 찾기
2. @Controller, @Service, @Repository, @Entity 어노테이션 검색
3. 패키지별 클래스 수 계산
4. Spring 컴포넌트 분류

결과를 다음 형식으로 정리해서 analysis-reports/01-structure-map.md 파일로 저장:
- 패키지 트리 구조
- 레이어별 클래스 목록
- 컴포넌트 통계
- 주요 도메인 식별
```

---

## 🏗️ Step 2: Spring 아키텍처 분석 [10분]

다음을 복사해서 실행:

```
analysis-reports/01-structure-map.md 파일을 읽고, Spring 아키텍처를 심층 분석해주세요:

1. Controller → Service → Repository 계층 매핑
2. @Autowired, @RequiredArgsConstructor로 의존성 그래프 생성
3. @Transactional 트랜잭션 경계 확인
4. Spring Security 필터 체인 분석
5. Bean 순환 의존성 체크

Mermaid 다이어그램으로 시각화하고 analysis-reports/02-architecture-analysis.md로 저장해주세요.
```

---

## 🔐 Step 3: Auth 도메인 보안 심층 분석 [20분]

다음을 복사해서 실행:

```
backend/src/main/java/com/example/trading_bot/auth 패키지를 보안 관점에서 완전 분석해주세요:

분석 대상 파일들을 모두 Read 도구로 읽고:
1. auth/jwt/JwtTokenProvider.java - 모든 메서드 라인별 분석
2. auth/jwt/JwtAuthenticationFilter.java - 필터링 로직 검증
3. auth/service/OAuth2Service.java - OAuth2 통합 보안
4. auth/config/SecurityConfig.java - 보안 설정 검토

다음을 중점 체크:
- JWT 알고리즘 (HS256 vs RS256)
- 토큰 만료 시간 설정
- Refresh Token 저장 방식
- SQL Injection 가능성
- 민감정보 노출 (로그, 응답)
- OWASP Top 10 체크리스트

발견된 취약점마다:
- CVSS 점수
- 공격 시나리오
- 수정 코드 예시

analysis-reports/03-auth-security-report.md로 저장해주세요.
```

---

## 💼 Step 4: Trade 비즈니스 로직 분석 [15분]

다음을 복사해서 실행:

```
backend/src/main/java/com/example/trading_bot/trade 패키지의 비즈니스 로직을 완전 분석해주세요:

Read 도구로 다음 파일들 분석:
1. trade/service/TradeService.java - 모든 public 메서드
2. trade/repository/TradeRepository.java - 쿼리 메서드
3. trade/entity/Trade.java, UserApiKey.java - 엔티티 관계

메서드별 분석 항목:
- 트랜잭션 경계 (@Transactional)
- 동시성 제어 (락 전략)
- 입력 검증
- 에러 처리
- N+1 쿼리 가능성
- 복잡도 측정

표 형식으로 정리:
| 메서드 | 트랜잭션 | 복잡도 | 동시성 | 성능이슈 | 개선안 |

analysis-reports/04-trade-logic-report.md로 저장해주세요.
```

---

## 🌐 Step 5: Binance API 통합 분석 [10분]

다음을 복사해서 실행:

```
backend/src/main/java/com/example/trading_bot/binance 패키지의 API 통합 안정성을 분석해주세요:

Read 도구로 분석:
1. binance/client/BinanceApiClient.java - 전체 메서드
2. binance/config/BinanceApiConfig.java - 설정

체크 항목:
- HTTP 타임아웃 설정
- 재시도 로직 (exponential backoff)
- Circuit Breaker 패턴
- Rate Limiting 대응
- 에러 코드 처리
- API 키 보안
- 동기/비동기 처리

안정성 점수 (0-100) 산출하고 개선안 제시.
analysis-reports/05-binance-integration-report.md로 저장해주세요.
```

---

## 🔬 Step 6: 핵심 메서드 라인별 분석 [30분]

다음을 복사해서 실행:

```
이전 단계에서 파악한 가장 중요한 메서드 10개를 라인별로 정밀 분석해주세요:

우선순위 메서드:
1. JwtTokenProvider.generateAccessToken()
2. JwtTokenProvider.validateToken()
3. TradeService.executeTrade() (또는 주요 거래 메서드)
4. BinanceApiClient의 API 호출 메서드
5. OAuth2Service.processOAuth2Login()

각 메서드마다:
- 5줄씩 끊어서 분석
- 각 라인의 의도와 잠재 버그
- null 체크, 경계값 처리
- 예외 처리 충분성
- 성능 영향 (시간/공간 복잡도)
- 개선 코드 제시

analysis-reports/06-method-analysis-detailed.md로 저장해주세요.
```

---

## 🛡️ Step 7: 전체 보안 종합 스캔 [20분]

다음을 복사해서 실행:

```
Step 1-6의 모든 발견사항을 종합하여 전체 보안을 재스캔해주세요:

1단계: 패턴 인식
- 이전 보고서에서 보안 취약 패턴 추출

2단계: 전체 스캔
- Grep으로 위험 패턴 전체 검색
  * "password|secret|key" 하드코딩
  * "log.*password|token" 로그 노출
  * SQLException SQL 인젝션
  * TODO|FIXME 미완성 코드

3단계: 공격 시뮬레이션
- JWT 토큰 탈취 시나리오
- SQL 인젝션 경로
- API 남용 가능성

4단계: 종합 평가
- OWASP Top 10 체크리스트 작성
- 보안 점수 (현재 vs 개선후)
- P0/P1/P2/P3 우선순위

analysis-reports/07-security-final-report.md로 저장해주세요.
```

---

## ⚡ Step 8: 성능 병목 탐지 [15분]

다음을 복사해서 실행:

```
누적된 분석 결과를 바탕으로 성능 병목을 찾아주세요:

Repository 클래스들에서:
- N+1 쿼리 패턴 찾기
- 페이징 없는 findAll()
- EAGER 페칭 남용

Service 클래스들에서:
- 동기 처리 병목
- 불필요한 루프
- 캐싱 미활용

API 통합에서:
- 동기 HTTP 호출
- 배치 처리 미활용

성능 개선 매트릭스 작성:
| 문제 | 위치 | 현재(ms) | 개선후(ms) | 난이도 | ROI |

analysis-reports/08-performance-report.md로 저장해주세요.
```

---

## 🎯 Step 9: 영향도 분석 [15분]

다음을 복사해서 실행:

```
모든 분석 보고서를 읽고 변경 영향도를 분석해주세요:

1. analysis-reports/ 폴더의 01~08 보고서 모두 읽기
2. 발견된 이슈 통합 (중복 제거)
3. 이슈 간 의존성 분석
4. 수정 순서 최적화

영향도 매트릭스:
| 변경사항 | 영향 컴포넌트 | 위험도 | 테스트 범위 |

의존성 그래프와 함께 analysis-reports/09-impact-analysis.md로 저장해주세요.
```

---

## 📋 Step 10: 실행 계획 수립 [10분]

다음을 복사해서 실행:

```
모든 분석을 종합하여 즉시 실행 가능한 개선 계획을 작성해주세요:

P0 - 24시간 내 (Critical 보안/장애)
P1 - 1주일 내 (High 성능/버그)
P2 - 2주일 내 (Medium 품질)
P3 - 1개월 내 (Low 리팩토링)

각 태스크마다:
- 제목과 이유
- 현재 코드 (Before)
- 수정 코드 (After)
- 테스트 방법
- 예상 시간
- 담당자 제안

주간 실행 일정:
Week 1: P0 전체 + P1 일부
Week 2: P1 완료 + P2 시작
Week 3: P2 완료 + P3 시작
Week 4: P3 완료 + 검증

성공 지표:
- 보안 점수: 60 → 95
- API 응답: 500ms → 100ms
- 코드 품질: B → A+

analysis-reports/10-MASTER-PLAN.md와 
analysis-reports/00-EXECUTIVE-SUMMARY.md (1페이지 요약)를 작성해주세요.
```

---

## ✅ 완료 확인

모든 단계 완료 후:

```
analysis-reports 폴더의 파일 목록을 보여주고,
00-EXECUTIVE-SUMMARY.md의 핵심 지표를 요약해주세요:
- 발견된 이슈 총 개수
- Critical 이슈 개수
- 예상 개선 효과
- 1주차 우선 작업
```

---

## 💡 사용 팁

1. **각 단계는 순서대로** 실행 (이전 결과를 다음 단계에서 참조)
2. **중간 저장** 권장 (브라우저 새로고침 대비)
3. **특정 단계만** 재실행 가능
4. **토큰 부족시** "--uc" 추가하여 압축 모드 사용

---

## 🚨 트러블슈팅

**Q: 파일을 찾을 수 없다고 나올 때**
```
ls backend/src/main/java/com/example/trading_bot
```
로 경로 확인 후 경로 수정

**Q: 분석이 너무 오래 걸릴 때**
각 단계 프롬프트 앞에 "--uc --delegate" 추가

**Q: 메모리 부족 에러**
단계를 더 작게 나누어 실행

---

> 📌 이 파일을 북마크하고 정기적으로 (월 1회) 실행하여 코드 품질을 관리하세요!