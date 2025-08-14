package com.example.trading_bot.auth.exception;

import com.example.trading_bot.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

/**
 * OAuth2 인증 예외
 */
public class OAuth2AuthenticationException extends BusinessException {
    
    public OAuth2AuthenticationException(String message) {
        super(message, HttpStatus.UNAUTHORIZED, "OAUTH2_ERROR");
    }
    
    public static OAuth2AuthenticationException invalidProvider(String provider) {
        return new OAuth2AuthenticationException(
            String.format("지원하지 않는 OAuth2 Provider입니다: %s", provider)
        );
    }
    
    public static OAuth2AuthenticationException tokenVerificationFailed(String provider) {
        return new OAuth2AuthenticationException(
            String.format("%s 토큰 검증에 실패했습니다.", provider)
        );
    }
    
    public static OAuth2AuthenticationException clientIdMismatch() {
        return new OAuth2AuthenticationException("클라이언트 ID가 일치하지 않습니다.");
    }
}