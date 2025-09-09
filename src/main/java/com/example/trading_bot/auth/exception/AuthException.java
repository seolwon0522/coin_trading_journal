package com.example.trading_bot.auth.exception;

import com.example.trading_bot.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

/**
 * 인증 관련 예외
 */
public class AuthException extends BusinessException {
    
    public AuthException(String message) {
        super(message, HttpStatus.UNAUTHORIZED, "AUTH_ERROR");
    }
    
    public AuthException(String message, String errorCode) {
        super(message, HttpStatus.UNAUTHORIZED, errorCode);
    }
    
    // 정적 팩토리 메서드들
    public static AuthException invalidCredentials() {
        return new AuthException("이메일 또는 비밀번호가 올바르지 않습니다.", "INVALID_CREDENTIALS");
    }
    
    public static AuthException invalidToken() {
        return new AuthException("유효하지 않은 토큰입니다.", "INVALID_TOKEN");
    }
    
    public static AuthException tokenExpired() {
        return new AuthException("토큰이 만료되었습니다.", "TOKEN_EXPIRED");
    }
    
    public static AuthException tokenNotFound() {
        return new AuthException("인증 토큰이 필요합니다.", "TOKEN_NOT_FOUND");
    }
    
    public static AuthException invalidTokenFormat() {
        return new AuthException("Bearer 토큰 형식이 아닙니다.", "INVALID_TOKEN_FORMAT");
    }
    
    public static AuthException userNotFound() {
        return new AuthException("사용자를 찾을 수 없습니다.", "USER_NOT_FOUND");
    }
    
    public static AuthException refreshTokenNotFound() {
        return new AuthException("Refresh Token을 찾을 수 없습니다.", "REFRESH_TOKEN_NOT_FOUND");
    }
}