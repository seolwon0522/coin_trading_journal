package com.example.trading_bot.auth.util;

import com.example.trading_bot.auth.entity.User;
import com.example.trading_bot.auth.exception.AuthException;
import com.example.trading_bot.auth.jwt.JwtTokenProvider;
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

    private static final String BEARER_PREFIX = "Bearer ";
    private static final int BEARER_PREFIX_LENGTH = BEARER_PREFIX.length();

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
        if (!jwtTokenProvider.validateToken(token)) {
            log.warn("Invalid token provided");
            throw AuthException.invalidToken();
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
     * Authorization 헤더에서 Bearer 토큰 추출
     * 
     * @param authHeader Authorization 헤더 값
     * @return Bearer 토큰 또는 null
     */
    public String extractBearerToken(String authHeader) {
        return tokenExtractor.extractBearerToken(authHeader);
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
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            log.warn("Invalid refresh token provided");
            throw AuthException.invalidToken();
        }

        return userRepository.findByRefreshToken(refreshToken)
                .orElseThrow(() -> {
                    log.warn("User not found with refresh token");
                    return AuthException.refreshTokenNotFound();
                });
    }
}