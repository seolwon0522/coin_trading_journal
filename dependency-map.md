# 📊 CryptoTradeManager 의존성 맵

## 🔄 의존성 개요

### Backend 의존성 그래프
```
Controller Layer → Service Layer → Repository Layer → Entity Layer
     ↓                  ↓                ↓               ↓
    DTO            BusinessLogic      Database        Domain
```

### Frontend 의존성 그래프  
```
Pages → Components → Hooks → API Layer → Types
  ↓         ↓          ↓        ↓          ↓
Routes   UI/Logic   State    Backend    Interface
```

## 🔗 Backend 의존성 상세

### 1. **Controller 레이어**
| Controller | 의존하는 Service | 사용하는 DTO | 영향 범위 |
|------------|-----------------|--------------|-----------|
| AuthController.java | AuthService | LoginRequest, LoginResponse, RegisterRequest | 인증 API |
| OAuth2Controller.java | OAuth2Service, AuthService | OAuth2LoginRequest, TokenResponse | OAuth API |
| TradeController.java | TradeService | TradeRequest, TradeResponse | 거래 API |

### 2. **Service 레이어**
| Service | 의존하는 Repository | 의존하는 Component | 영향받는 Controller |
|---------|-------------------|-------------------|-------------------|
| AuthService.java | UserRepository | JwtTokenProvider, PasswordEncoder, TokenValidator | AuthController, OAuth2Controller |
| OAuth2Service.java | UserRepository | AuthService, HttpClient | OAuth2Controller |
| TradeService.java | TradeRepository, UserRepository | - | TradeController |
| CustomUserDetailsService.java | UserRepository | - | Security Config |

### 3. **Repository 레이어**
| Repository | Entity | 사용처 |
|------------|--------|--------|
| UserRepository | User | AuthService, OAuth2Service, TradeService, CustomUserDetailsService |
| TradeRepository | Trade | TradeService |
| UserApiKeyRepository | UserApiKey | (현재 미사용) |

### 4. **핵심 의존성 체인**
```
TradeController 
  → TradeService (강한 결합)
    → TradeRepository (강한 결합)
    → UserRepository (약한 결합)
      → User Entity (강한 결합)
      → Trade Entity (강한 결합)
```

## 🔗 Frontend 의존성 상세

### 1. **페이지 → 컴포넌트 의존성**
| Page | 주요 Component | Hook 사용 | API 호출 |
|------|---------------|-----------|----------|
| /trades/page.tsx | TradeForm, TradesTable | useTrades | trade-api |
| /login/page.tsx | - | - | auth-api |
| /register/page.tsx | - | - | auth-api |

### 2. **컴포넌트 의존성**
| Component | 의존 Component | Utils/Hooks | 크기(줄) |
|-----------|---------------|-------------|----------|
| TradeForm.tsx | BinanceSymbolSelector, UI Components | useExchangeRate | **488** 🚨 |
| TradesTable.tsx | UI Components | - | 200 |
| BinanceSymbolSelector.tsx | Command, Popover | useCoinPrice | 150 |

### 3. **Hook → API 의존성**
| Hook | API Layer | 상태 관리 | 사용처 |
|------|-----------|----------|--------|
| use-trades.ts | trade-api | useState, useEffect | TradesTable, page.tsx |
| use-coin-price.ts | coin-api | useState | BinanceSymbolSelector |
| use-exchange-rate.ts | - | useState | TradeForm, ExchangeRateBadge |

### 4. **API Layer 의존성**
| API Module | Backend Endpoint | 의존 Type | Error Handling |
|------------|-----------------|-----------|----------------|
| trade-api.ts | /api/trades | Trade, TradeRequest | axios interceptor |
| auth-api.ts | /api/auth | LoginRequest, User | axios interceptor |
| coin-api.ts | Binance API | Market types | try-catch |

## 🌉 Backend ↔ Frontend 연결점

### API 엔드포인트 매칭
| Backend Endpoint | Frontend API | Request Type | Response Type |
|-----------------|--------------|--------------|---------------|
| POST /api/auth/login | auth-api.login() | LoginRequest | LoginResponse |
| POST /api/auth/register | auth-api.register() | RegisterRequest | User |
| GET /api/trades | trade-api.list() | Pageable | Page<Trade> |
| POST /api/trades | trade-api.create() | TradeRequest | TradeResponse |
| PUT /api/trades/{id} | trade-api.update() | TradeRequest | TradeResponse |
| DELETE /api/trades/{id} | trade-api.delete() | - | void |

## 🔴 중복 코드 위치

### Backend
1. **PnL 계산 로직** - TradeService.java (120-145줄)
2. **Setter 체인** - TradeService.updateTrade() (66-74줄)
3. **OAuth 프로필 업데이트** - AuthService.processOAuth2User() (98-109줄)

### Frontend  
1. **formatNumber()** - TradeForm.tsx (44-49줄), 다른 컴포넌트에도 존재
2. **parseNumber()** - TradeForm.tsx (52-54줄), 중복 가능성
3. **에러 처리** - use-trades.ts (24-41줄), 패턴 불일치

## 📌 리팩토링 우선순위

### 🟢 낮은 영향도 (우선 처리)
1. **유틸리티 함수 통합** - 영향: 3-4개 파일
2. **매직 넘버 상수화** - 영향: 단일 파일
3. **JavaDoc/JSDoc 추가** - 영향: 없음

### 🟡 중간 영향도
1. **Service 메서드 분할** - 영향: Controller 확인 필요
2. **Hook 타입 개선** - 영향: 컴포넌트 import

### 🔴 높은 영향도 (신중히 처리)
1. **TradeForm 분할** - 영향: trades/page.tsx, import 경로
2. **API 에러 처리 통합** - 영향: 모든 API 호출 부분

## 📊 영향도 분석 요약

| 변경 대상 | 직접 영향 | 간접 영향 | 리스크 |
|----------|-----------|-----------|--------|
| TradeService.calculatePnl() 추출 | 0개 | Trade Entity | 낮음 |
| AuthService.processOAuth2User() 분할 | 1개 | OAuth2Controller | 낮음 |
| formatNumber() 유틸 통합 | 3-4개 | - | 낮음 |
| TradeForm.tsx 분할 | 1개 | import 경로 | 중간 |
| API 에러 타입 통합 | 5개+ | 모든 hooks | 높음 |

---
*생성일: 2024-12-27*
*총 파일 수: Backend 30+, Frontend 40+*
*우선 개선 대상: 15개 파일*