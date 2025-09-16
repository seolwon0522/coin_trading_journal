package com.example.trading_bot.binance.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Binance API 전용 예외 클래스
 * 구체적인 에러 코드와 메시지를 포함합니다.
 */
@Getter
public class BinanceApiException extends RuntimeException {
    
    private final String errorCode;
    private final HttpStatus httpStatus;
    private final BinanceErrorType errorType;
    
    public BinanceApiException(String message, String errorCode, HttpStatus httpStatus, BinanceErrorType errorType) {
        super(message);
        this.errorCode = errorCode;
        this.httpStatus = httpStatus;
        this.errorType = errorType;
    }
    
    /**
     * Binance 에러 타입 분류
     */
    public enum BinanceErrorType {
        INVALID_API_KEY("API 키 형식이 올바르지 않습니다", true),
        INVALID_SIGNATURE("요청에 대한 서명이 유효하지 않습니다", true),
        TIMESTAMP_ERROR("요청 타임스탬프가 recvWindow 범위를 벗어났습니다", false),
        IP_NOT_WHITELISTED("IP 주소가 화이트리스트에 없습니다", true),
        RATE_LIMIT_EXCEEDED("너무 많은 요청이 발생했습니다", false),
        INSUFFICIENT_BALANCE("계정 잔액이 부족합니다", false),
        PERMISSION_DENIED("권한이 없습니다", true),
        NETWORK_ERROR("네트워크 오류가 발생했습니다", false),
        MAINTENANCE("시스템 점검 중입니다", false),
        UNKNOWN("알 수 없는 오류가 발생했습니다", false);
        
        private final String description;
        private final boolean isPermanent;  // true면 재시도 불필요
        
        BinanceErrorType(String description, boolean isPermanent) {
            this.description = description;
            this.isPermanent = isPermanent;
        }
        
        public boolean isRetryable() {
            return !isPermanent;
        }
    }
    
    /**
     * Binance 에러 코드로부터 에러 타입 판별
     */
    public static BinanceErrorType determineErrorType(String errorCode, String message) {
        if (errorCode == null && message == null) {
            return BinanceErrorType.UNKNOWN;
        }
        
        // Binance 에러 코드 매핑
        switch (errorCode != null ? errorCode : "") {
            case "-2014":
                return BinanceErrorType.INVALID_API_KEY;
            case "-1022":
                return BinanceErrorType.INVALID_SIGNATURE;
            case "-1021":
                return BinanceErrorType.TIMESTAMP_ERROR;
            case "-2015":
                return BinanceErrorType.IP_NOT_WHITELISTED;
            case "-1003":
            case "-1015":
                return BinanceErrorType.RATE_LIMIT_EXCEEDED;
            case "-2010":
                return BinanceErrorType.INSUFFICIENT_BALANCE;
            case "-1102":
                return BinanceErrorType.PERMISSION_DENIED;
            default:
                // 메시지로 판별
                if (message != null) {
                    String lowerMsg = message.toLowerCase();
                    if (lowerMsg.contains("api-key")) {
                        return BinanceErrorType.INVALID_API_KEY;
                    } else if (lowerMsg.contains("signature")) {
                        return BinanceErrorType.INVALID_SIGNATURE;
                    } else if (lowerMsg.contains("rate limit")) {
                        return BinanceErrorType.RATE_LIMIT_EXCEEDED;
                    } else if (lowerMsg.contains("network")) {
                        return BinanceErrorType.NETWORK_ERROR;
                    } else if (lowerMsg.contains("maintenance")) {
                        return BinanceErrorType.MAINTENANCE;
                    }
                }
                return BinanceErrorType.UNKNOWN;
        }
    }
}