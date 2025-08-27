package com.example.trading_bot.auth.util;

import com.example.trading_bot.auth.entity.User;
import com.example.trading_bot.auth.exception.AuthException;
import com.example.trading_bot.auth.jwt.JwtTokenProvider;
import com.example.trading_bot.auth.jwt.JwtTokenProvider.TokenValidationResult;
import com.example.trading_bot.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * 토큰 검증 및 사용자 조회를 담당하는 유틸리티 클래스
 * 모든 토큰 관련 검증 로직을 중앙화하여 중복을 제거하고 일관성을 보장
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TokenValidator {


    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    private final TokenExtractor tokenExtractor;

    /**
     * Authorization 헤더에서 토큰을 추출하고 사용자를 조회
     * 
     * @param authHeader Authorization 헤더 값
     * @return 검증된 사용자
     * @throws AuthException 토큰이 유효하지 않거나 사용자를 찾을 수 없는 경우
     */
    public User validateTokenAndGetUser(String authHeader) {
        String token = tokenExtractor.extractBearerToken(authHeader);
        return validateTokenAndGetUserByToken(token);
    }

    /**
     * 토큰을 검증하고 사용자를 조회
     * 
     * @param token JWT 토큰
     * @return 검증된 사용자
     * @throws AuthException 토큰이 유효하지 않거나 사용자를 찾을 수 없는 경우
     */
    public User validateTokenAndGetUserByToken(String token) {
        TokenValidationResult result = jwtTokenProvider.validateTokenWithResult(token);
        
        if (!result.isValid()) {
            if (result.isExpired()) {
                log.warn("Expired token provided");
                throw AuthException.tokenExpired();
            } else {
                log.warn("Invalid token provided: {}", result.getErrorMessage());
                throw AuthException.invalidToken();
            }
        }

        Long userId = extractUserIdFromToken(token);
        return findUserById(userId);
    }

    /**
     * 토큰에서 사용자 ID 추출
     * 
     * @param token JWT 토큰
     * @return 사용자 ID
     * @throws AuthException 토큰에서 사용자 ID를 추출할 수 없는 경우
     */
    public Long extractUserIdFromToken(String token) {
        try {
            return jwtTokenProvider.getUserIdFromToken(token);
        } catch (Exception e) {
            log.error("Failed to extract user ID from token", e);
            throw AuthException.invalidToken();
        }
    }

    /**
     * 토큰 유효성 검증 (예외 발생 없이 boolean 반환)
     * 
     * @param token JWT 토큰
     * @return 토큰이 유효하면 true, 그렇지 않으면 false
     */
    public boolean isValidToken(String token) {
        if (!StringUtils.hasText(token)) {
            return false;
        }
        return jwtTokenProvider.validateToken(token);
    }

    /**
     * 토큰 검증 결과를 상세하게 반환 (만료 여부 구분 가능)
     * 
     * @param token JWT 토큰
     * @return 토큰 검증 결과
     */
    public TokenValidationResult validateTokenWithDetail(String token) {
        if (!StringUtils.hasText(token)) {
            return TokenValidationResult.invalid("Token is empty or null");
        }
        return jwtTokenProvider.validateTokenWithResult(token);
    }

    /**
     * 사용자 ID로 사용자 조회
     * 
     * @param userId 사용자 ID
     * @return 조회된 사용자
     * @throws AuthException 사용자를 찾을 수 없는 경우
     */
    private User findUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> {
                    log.warn("User not found with id: {}", userId);
                    return AuthException.userNotFound();
                });
    }

    /**
     * Refresh 토큰을 검증하고 사용자를 조회
     * 
     * @param refreshToken Refresh 토큰
     * @return 검증된 사용자
     * @throws AuthException 토큰이 유효하지 않거나 사용자를 찾을 수 없는 경우
     */
    public User validateRefreshTokenAndGetUser(String refreshToken) {
        // 토큰 형식 및 유효성 검증
        TokenValidationResult result = jwtTokenProvider.validateTokenWithResult(refreshToken);
        
        if (!result.isValid()) {
            if (result.isExpired()) {
                log.warn("Expired refresh token provided");
                throw AuthException.tokenExpired();
            } else {
                log.warn("Invalid refresh token provided: {}", result.getErrorMessage());
                throw AuthException.invalidToken();
            }
        }

        // DB에서 refresh token으로 사용자 조회
        return userRepository.findByRefreshToken(refreshToken)
                .orElseThrow(() -> {
                    log.warn("User not found with refresh token. Possible causes: token was rotated, user logged out, or logged in from another device");
                    return AuthException.refreshTokenNotFound();
                });
    }
}