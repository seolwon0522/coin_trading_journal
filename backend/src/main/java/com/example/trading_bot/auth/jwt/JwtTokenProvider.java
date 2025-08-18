package com.example.trading_bot.auth.jwt;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;

/**
 * JWT 토큰 생성 및 검증 전담 클래스
 */
@Slf4j
@Component
public class JwtTokenProvider {

    private final SecretKey key;
    private final long accessTokenValidityInMilliseconds;
    private final long refreshTokenValidityInMilliseconds;

    public JwtTokenProvider(
            @Value("${jwt.secret}") String secretKey,
            @Value("${jwt.access-token-validity-in-seconds}") long accessTokenValidityInSeconds,
            @Value("${jwt.refresh-token-validity-in-seconds}") long refreshTokenValidityInSeconds) {

        this.key = Keys.hmacShaKeyFor(secretKey.getBytes());
        this.accessTokenValidityInMilliseconds = accessTokenValidityInSeconds * 1000;
        this.refreshTokenValidityInMilliseconds = refreshTokenValidityInSeconds * 1000;
    }

    /**
     * Access Token 생성
     */
    public String createAccessToken(Long userId, String email, String role) {
        Date now = new Date();
        Date validity = new Date(now.getTime() + accessTokenValidityInMilliseconds);

        return Jwts.builder()
                .setSubject(userId.toString())
                .claim("email", email)
                .claim("role", role)
                .setIssuedAt(now)
                .setExpiration(validity)
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Refresh Token 생성
     */
    public String createRefreshToken(Long userId) {
        Date now = new Date();
        Date validity = new Date(now.getTime() + refreshTokenValidityInMilliseconds);

        return Jwts.builder()
                .setSubject(userId.toString())
                .setIssuedAt(now)
                .setExpiration(validity)
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * 토큰에서 Claims 추출 (공통 메서드)
     */
    private Claims getClaimsFromToken(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * 토큰에서 사용자 ID 추출
     */
    public Long getUserIdFromToken(String token) {
        Claims claims = getClaimsFromToken(token);
        return Long.valueOf(claims.getSubject());
    }

    /**
     * 토큰에서 이메일 추출
     */
    public String getEmailFromToken(String token) {
        Claims claims = getClaimsFromToken(token);
        return claims.get("email", String.class);
    }

    /**
     * 토큰에서 역할 추출
     */
    public String getRoleFromToken(String token) {
        Claims claims = getClaimsFromToken(token);
        return claims.get("role", String.class);
    }

    /**
     * 토큰 유효성 검사
     * 
     * @param token 검증할 JWT 토큰
     * @return 토큰이 유효하면 true, 그렇지 않으면 false
     */
    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (ExpiredJwtException e) {
            log.warn("JWT token is expired: {}", e.getMessage());
            return false;
        } catch (UnsupportedJwtException e) {
            log.error("JWT token is unsupported: {}", e.getMessage());
            return false;
        } catch (MalformedJwtException e) {
            log.error("JWT token is malformed: {}", e.getMessage());
            return false;
        } catch (io.jsonwebtoken.security.SignatureException e) {
            log.error("JWT signature validation failed: {}", e.getMessage());
            return false;
        } catch (IllegalArgumentException e) {
            log.error("JWT token compact of handler are invalid: {}", e.getMessage());
            return false;
        }
    }


    /**
     * 토큰 만료 상태를 확인하여 적절한 예외 처리를 위한 검증 결과 반환
     * 
     * @param token 검증할 JWT 토큰
     * @return 토큰 검증 결과
     */
    public TokenValidationResult validateTokenWithResult(String token) {
        try {
            Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token);
            return TokenValidationResult.valid();
        } catch (ExpiredJwtException e) {
            log.warn("JWT token is expired. Expiration: {}, Current time: {}", 
                    e.getClaims().getExpiration(), new Date());
            return TokenValidationResult.expired();
        } catch (UnsupportedJwtException e) {
            log.error("JWT token is unsupported: {}", e.getMessage());
            return TokenValidationResult.invalid("Unsupported JWT token");
        } catch (MalformedJwtException e) {
            log.error("JWT token is malformed: {}", e.getMessage());
            return TokenValidationResult.invalid("Malformed JWT token");
        } catch (io.jsonwebtoken.security.SignatureException e) {
            log.error("JWT signature validation failed: {}", e.getMessage());
            return TokenValidationResult.invalid("Invalid JWT signature");
        } catch (IllegalArgumentException e) {
            log.error("JWT token compact of handler are invalid: {}", e.getMessage());
            return TokenValidationResult.invalid("Invalid JWT token format");
        }
    }

    /**
     * 토큰 검증 결과를 나타내는 내부 클래스
     */
    public static class TokenValidationResult {
        private final boolean valid;
        private final boolean expired;
        private final String errorMessage;

        private TokenValidationResult(boolean valid, boolean expired, String errorMessage) {
            this.valid = valid;
            this.expired = expired;
            this.errorMessage = errorMessage;
        }

        public static TokenValidationResult valid() {
            return new TokenValidationResult(true, false, null);
        }

        public static TokenValidationResult expired() {
            return new TokenValidationResult(false, true, "Token expired");
        }

        public static TokenValidationResult invalid(String errorMessage) {
            return new TokenValidationResult(false, false, errorMessage);
        }

        public boolean isValid() {
            return valid;
        }

        public boolean isExpired() {
            return expired;
        }

        public String getErrorMessage() {
            return errorMessage;
        }
    }
}
