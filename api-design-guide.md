# CryptoTradeManager 인증 시스템 API 설계 가이드

## JWT 토큰 구조 및 Claims

### Access Token 구조

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "roles": ["USER", "PREMIUM_USER"],
    "iat": 1704067200,
    "exp": 1704070800,
    "jti": "access_token_unique_id",
    "type": "ACCESS",
    "session_id": "session_uuid",
    "ip": "192.168.1.1",
    "device": "Chrome/120.0 Windows 10"
  }
}
```

### Refresh Token 구조

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "123e4567-e89b-12d3-a456-426614174000",
    "iat": 1704067200,
    "exp": 1704672000,
    "jti": "refresh_token_unique_id",
    "type": "REFRESH",
    "session_id": "session_uuid"
  }
}
```

### WebSocket Token 구조

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "123e4567-e89b-12d3-a456-426614174000",
    "iat": 1704067200,
    "exp": 1704070800,
    "jti": "ws_token_unique_id",
    "type": "WEBSOCKET",
    "channels": ["user.portfolio", "user.orders", "market.btc-krw"]
  }
}
```

## OAuth2.0 Flow 설계

### Authorization Code Flow (Google)

```
1. 클라이언트 → 프론트엔드: 로그인 버튼 클릭
2. 프론트엔드 → Google: GET https://accounts.google.com/o/oauth2/auth
   - client_id={client_id}
   - redirect_uri={callback_url}
   - response_type=code
   - scope=openid email profile
   - state={csrf_token}

3. Google → 사용자: 로그인 페이지 표시
4. 사용자 → Google: 인증 완료
5. Google → 백엔드: GET /auth/oauth2/callback
   - code={authorization_code}
   - state={csrf_token}
   - provider=google

6. 백엔드 → Google: POST https://oauth2.googleapis.com/token
   - grant_type=authorization_code
   - client_id={client_id}
   - client_secret={client_secret}
   - code={authorization_code}
   - redirect_uri={callback_url}

7. Google → 백엔드: Access Token 응답
8. 백엔드 → Google: GET https://www.googleapis.com/oauth2/v2/userinfo
9. 백엔드: 사용자 정보로 계정 생성/조회
10. 백엔드 → 프론트엔드: JWT 토큰 응답
```

### Apple Sign In Flow

```
1. 클라이언트 → 프론트엔드: Apple로 로그인 버튼 클릭
2. 프론트엔드 → Apple: GET https://appleid.apple.com/auth/authorize
   - client_id={app_id}
   - redirect_uri={callback_url}
   - response_type=code id_token
   - scope=name email
   - response_mode=form_post
   - state={csrf_token}

3. Apple → 사용자: 로그인 페이지 표시
4. 사용자 → Apple: Face ID/Touch ID/비밀번호 인증
5. Apple → 백엔드: POST /auth/oauth2/callback
   - code={authorization_code}
   - id_token={id_token}
   - state={csrf_token}
   - provider=apple

6. 백엔드: ID Token 검증 (Apple 공개 키 사용)
7. 백엔드: 사용자 정보 추출 및 계정 생성/조회
8. 백엔드 → 프론트엔드: JWT 토큰 응답
```

## 보안 정책 및 설정

### 토큰 보안 정책

```yaml
jwt_security:
  access_token:
    expiration: 15m
    algorithm: HS256
    secret_rotation: daily
    
  refresh_token:
    expiration: 7d
    algorithm: HS256
    single_use: true
    family_invalidation: true
    
  websocket_token:
    expiration: 1h
    algorithm: HS256
    channel_specific: true

password_policy:
  min_length: 8
  require_uppercase: true
  require_lowercase: true
  require_numbers: true
  require_special_chars: true
  blocked_patterns:
    - common_passwords
    - sequential_chars
    - repeated_chars
  history_check: 5

session_security:
  redis_prefix: "session:"
  ttl: 24h
  device_tracking: true
  ip_validation: true
  concurrent_sessions: 5
  suspicious_login_threshold: 3
```

### Rate Limiting 정책

```yaml
rate_limiting:
  global:
    requests_per_minute: 1000
    burst_capacity: 100
    
  per_ip:
    signin: 10/min
    signup: 5/hour
    password_reset: 3/hour
    
  per_user:
    token_refresh: 100/hour
    profile_update: 10/hour
    2fa_attempts: 5/min
    
  websocket:
    connections_per_user: 10
    messages_per_second: 100
```

### 2FA 보안 설정

```yaml
two_factor:
  algorithm: SHA1
  digits: 6
  period: 30s
  window: 1
  
  backup_codes:
    count: 10
    length: 8
    single_use: true
    
  setup:
    qr_code_ttl: 5m
    verification_attempts: 3
```

## 데이터 모델

### 사용자 관련 엔티티

```sql
-- users 테이블
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone_number VARCHAR(20),
    email_verified BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    timezone VARCHAR(50) DEFAULT 'Asia/Seoul',
    language VARCHAR(5) DEFAULT 'ko',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    failed_login_count INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

-- roles 테이블
CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- user_roles 테이블
CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id BIGINT REFERENCES roles(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    granted_by UUID REFERENCES users(id),
    PRIMARY KEY (user_id, role_id)
);

-- oauth_providers 테이블
CREATE TABLE oauth_providers (
    id BIGSERIAL PRIMARY KEY,
    provider_name VARCHAR(50) UNIQUE NOT NULL,
    client_id VARCHAR(255) NOT NULL,
    client_secret VARCHAR(255) NOT NULL,
    authorization_url VARCHAR(500) NOT NULL,
    token_url VARCHAR(500) NOT NULL,
    user_info_url VARCHAR(500) NOT NULL,
    scope VARCHAR(200) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- user_oauth_accounts 테이블
CREATE TABLE user_oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider_id BIGINT REFERENCES oauth_providers(id),
    provider_user_id VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    profile_image_url VARCHAR(500),
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id, provider_user_id)
);

-- user_sessions 테이블
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token_hash VARCHAR(255) NOT NULL,
    device_info JSONB,
    ip_address INET,
    location JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- exchange_api_keys 테이블
CREATE TABLE exchange_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    exchange VARCHAR(50) NOT NULL,
    nickname VARCHAR(100),
    api_key_encrypted TEXT NOT NULL,
    secret_key_encrypted TEXT NOT NULL,
    passphrase_encrypted TEXT,
    permissions JSONB DEFAULT '["read"]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE
);

-- backup_codes 테이블
CREATE TABLE backup_codes (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    code_hash VARCHAR(255) NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- password_reset_tokens 테이블
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- email_verification_tokens 테이블
CREATE TABLE email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- audit_logs 테이블
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 기본 역할 데이터
INSERT INTO roles (name, description) VALUES 
('USER', '일반 사용자'),
('PREMIUM_USER', '프리미엄 사용자'),
('VIP_USER', 'VIP 사용자'),
('ADMIN', '시스템 관리자');

-- OAuth 프로바이더 데이터
INSERT INTO oauth_providers (provider_name, client_id, client_secret, 
                           authorization_url, token_url, user_info_url, scope) VALUES 
('google', 'your-google-client-id', 'your-google-client-secret',
 'https://accounts.google.com/o/oauth2/auth',
 'https://oauth2.googleapis.com/token',
 'https://www.googleapis.com/oauth2/v2/userinfo',
 'openid email profile'),
('apple', 'your-apple-client-id', 'your-apple-client-secret',
 'https://appleid.apple.com/auth/authorize',
 'https://appleid.apple.com/auth/token',
 'https://appleid.apple.com/auth/userinfo',
 'name email');
```

### 인덱스 설정

```sql
-- 성능 최적화를 위한 인덱스
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_last_login_at ON users(last_login_at);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_is_active ON user_sessions(is_active);

CREATE INDEX idx_exchange_api_keys_user_id ON exchange_api_keys(user_id);
CREATE INDEX idx_exchange_api_keys_exchange ON exchange_api_keys(exchange);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
CREATE INDEX idx_email_verification_tokens_expires_at ON email_verification_tokens(expires_at);
```

## 에러 처리 및 응답 형식

### 표준 에러 코드

```yaml
authentication_errors:
  INVALID_CREDENTIALS: "이메일 또는 비밀번호가 올바르지 않습니다."
  EMAIL_NOT_VERIFIED: "이메일 인증이 필요합니다."
  ACCOUNT_LOCKED: "계정이 잠겨있습니다. 관리자에게 문의하세요."
  TWO_FACTOR_REQUIRED: "2단계 인증이 필요합니다."
  INVALID_2FA_CODE: "2FA 인증 코드가 올바르지 않습니다."
  
token_errors:
  TOKEN_EXPIRED: "토큰이 만료되었습니다."
  TOKEN_INVALID: "유효하지 않은 토큰입니다."
  TOKEN_BLACKLISTED: "무효화된 토큰입니다."
  REFRESH_TOKEN_INVALID: "리프레시 토큰이 유효하지 않습니다."
  
validation_errors:
  EMAIL_ALREADY_EXISTS: "이미 사용 중인 이메일입니다."
  WEAK_PASSWORD: "비밀번호가 보안 정책에 맞지 않습니다."
  INVALID_EMAIL_FORMAT: "유효하지 않은 이메일 형식입니다."
  PHONE_NUMBER_INVALID: "유효하지 않은 전화번호입니다."
  
rate_limit_errors:
  TOO_MANY_REQUESTS: "요청이 너무 많습니다. 잠시 후 다시 시도하세요."
  LOGIN_ATTEMPTS_EXCEEDED: "로그인 시도 횟수를 초과했습니다."
  
oauth_errors:
  OAUTH_STATE_MISMATCH: "OAuth state 파라미터가 일치하지 않습니다."
  OAUTH_PROVIDER_ERROR: "소셜 로그인 처리 중 오류가 발생했습니다."
  OAUTH_USER_CANCELLED: "사용자가 소셜 로그인을 취소했습니다."
  
exchange_errors:
  INVALID_API_KEY: "유효하지 않은 거래소 API 키입니다."
  API_KEY_PERMISSIONS_INSUFFICIENT: "API 키 권한이 부족합니다."
  EXCHANGE_NOT_SUPPORTED: "지원하지 않는 거래소입니다."
```

### 에러 응답 예시

```json
{
  "error": "VALIDATION_FAILED",
  "message": "입력 데이터 검증에 실패했습니다.",
  "fieldErrors": [
    {
      "field": "email",
      "rejectedValue": "invalid-email",
      "message": "유효한 이메일 주소를 입력하세요."
    },
    {
      "field": "password",
      "rejectedValue": "123",
      "message": "비밀번호는 최소 8자리이며, 대문자, 소문자, 숫자, 특수문자를 포함해야 합니다."
    }
  ],
  "timestamp": "2024-01-01T12:00:00Z",
  "path": "/v1/auth/signup",
  "requestId": "123e4567-e89b-12d3-a456-426614174000"
}
```

## 보안 고려사항

### 1. 비밀번호 보안
- BCrypt를 이용한 해싱 (cost factor: 12)
- 비밀번호 정책 강제 적용
- 이전 비밀번호 5개 재사용 방지
- 계정 잠금 정책 (5회 실패 시 1시간 잠금)

### 2. 토큰 보안
- JWT Secret 정기 갱신 (daily rotation)
- 토큰 블랙리스트 관리 (Redis)
- Refresh Token Family 무효화
- WebSocket 토큰은 채널별 권한 검증

### 3. 세션 보안
- IP 주소 및 User-Agent 검증
- 동시 세션 수 제한 (5개)
- 의심스러운 로그인 감지 및 알림
- 세션 하이재킹 방지

### 4. API 키 보안
- AES-256-GCM 암호화 저장
- 키 사용 로그 기록
- 권한별 접근 제어
- 정기적 키 순환 권장

### 5. Rate Limiting
- Redis 기반 분산 Rate Limiting
- IP 및 사용자별 제한
- 점진적 백오프 적용
- 악의적 요청 자동 차단

### 6. 감사 로그
- 모든 인증 관련 작업 로깅
- IP, User-Agent, 시간 기록
- 실패한 인증 시도 추적
- 정기적 로그 분석

## WebSocket 인증 처리

### WebSocket 연결 시퀀스

```
1. 클라이언트 → REST API: WebSocket 토큰 요청
   POST /auth/websocket/token
   Authorization: Bearer {access_token}

2. 서버: WebSocket 전용 토큰 생성
   - 채널별 권한 포함
   - 짧은 만료 시간 (1시간)

3. 클라이언트 → WebSocket: 연결 시도
   ws://localhost:8080/ws?token={ws_token}

4. 서버: 토큰 검증 및 권한 확인
   - 토큰 유효성 검증
   - 채널 접근 권한 검증

5. 서버 → 클라이언트: 연결 승인/거부
```

### WebSocket 보안 정책

```yaml
websocket_security:
  authentication:
    token_required: true
    token_expiry: 1h
    
  authorization:
    channel_based: true
    user_channels: ["user.{user_id}.*"]
    public_channels: ["market.*", "ticker.*"]
    
  rate_limiting:
    connections_per_user: 10
    messages_per_second: 100
    
  monitoring:
    connection_logging: true
    message_logging: false
    error_logging: true
```

이 설계 가이드를 기반으로 Spring Boot 애플리케이션을 구현하면, 암호화폐 거래 플랫폼에 필요한 강력하고 안전한 인증 시스템을 구축할 수 있습니다.