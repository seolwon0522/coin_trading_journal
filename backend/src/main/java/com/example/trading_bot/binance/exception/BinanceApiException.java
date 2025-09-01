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
        INVALID_API_KEY("API-key format invalid", true),
        INVALID_SIGNATURE("Signature for this request is not valid", true),
        TIMESTAMP_ERROR("Timestamp for this request is outside of the recvWindow", false),
        IP_NOT_WHITELISTED("IP address is not whitelisted", true),
        RATE_LIMIT_EXCEEDED("Too many requests", false),
        INSUFFICIENT_BALANCE("Account has insufficient balance", false),
        PERMISSION_DENIED("You don't have permission", true),
        NETWORK_ERROR("Network error", false),
        MAINTENANCE("System maintenance", false),
        UNKNOWN("Unknown error", false);
        
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