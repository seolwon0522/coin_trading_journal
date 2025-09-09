package com.example.trading_bot.auth.util;

import com.example.trading_bot.auth.exception.AuthException;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * JWT 토큰 추출 및 검증 유틸리티
 */
@Component
public class TokenExtractor {

    private static final String BEARER_PREFIX = "Bearer ";
    private static final int BEARER_PREFIX_LENGTH = 7;

    /**
     * Authorization 헤더에서 Bearer 토큰 추출
     * 
     * @param authHeader Authorization 헤더 값
     * @return 추출된 토큰 문자열
     * @throws AuthException 토큰이 없거나 형식이 잘못된 경우
     */
    public String extractBearerToken(String authHeader) {
        validateAuthHeader(authHeader);
        return authHeader.substring(BEARER_PREFIX_LENGTH);
    }

    /**
     * Authorization 헤더 유효성 검증
     * 
     * @param authHeader Authorization 헤더 값
     * @throws AuthException 헤더가 없거나 Bearer 형식이 아닌 경우
     */
    public void validateAuthHeader(String authHeader) {
        if (!StringUtils.hasText(authHeader)) {
            throw AuthException.tokenNotFound();
        }

        if (!authHeader.startsWith(BEARER_PREFIX)) {
            throw AuthException.invalidTokenFormat();
        }
    }

    /**
     * 토큰이 Bearer 형식인지 확인
     * 
     * @param authHeader Authorization 헤더 값
     * @return Bearer 형식이면 true, 아니면 false
     */
    public boolean isBearerToken(String authHeader) {
        return StringUtils.hasText(authHeader) && authHeader.startsWith(BEARER_PREFIX);
    }

    /**
     * 안전하게 토큰 추출 시도 (예외 발생 없음)
     * 
     * @param authHeader Authorization 헤더 값
     * @return 추출된 토큰 또는 null
     */
    public String extractTokenSafely(String authHeader) {
        if (isBearerToken(authHeader)) {
            return authHeader.substring(BEARER_PREFIX_LENGTH);
        }
        return null;
    }
}