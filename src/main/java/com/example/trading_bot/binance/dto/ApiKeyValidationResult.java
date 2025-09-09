package com.example.trading_bot.binance.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * API 키 검증 결과 상세 정보
 */
@Data
@Builder
public class ApiKeyValidationResult {
    
    private boolean isValid;
    private String errorCode;
    private String errorMessage;
    private List<String> permissions;
    private boolean canTrade;
    private boolean canWithdraw;
    private boolean isIpWhitelisted;
    private Long serverTime;
    private Long timeDiff;  // 서버 시간과 로컬 시간 차이
    
    /**
     * 검증 실패 이유
     */
    public enum FailureReason {
        INVALID_API_KEY("API 키 형식이 올바르지 않습니다"),
        INVALID_SECRET_KEY("Secret 키가 올바르지 않습니다"),
        IP_NOT_WHITELISTED("현재 IP가 화이트리스트에 없습니다"),
        INSUFFICIENT_PERMISSIONS("필요한 권한이 없습니다"),
        RATE_LIMIT_EXCEEDED("API 호출 한도를 초과했습니다"),
        NETWORK_ERROR("네트워크 오류가 발생했습니다"),
        SERVER_MAINTENANCE("Binance 서버 점검 중입니다"),
        TIME_SYNC_ERROR("시간 동기화 오류입니다"),
        UNKNOWN("알 수 없는 오류가 발생했습니다");
        
        private final String message;
        
        FailureReason(String message) {
            this.message = message;
        }
        
        public String getMessage() {
            return message;
        }
    }
    
    /**
     * 성공 결과 생성
     */
    public static ApiKeyValidationResult success(BinanceAccountResponse account) {
        return ApiKeyValidationResult.builder()
                .isValid(true)
                .permissions(account.getPermissions())
                .canTrade(account.getCanTrade())
                .canWithdraw(account.getCanWithdraw())
                .isIpWhitelisted(true)
                .serverTime(System.currentTimeMillis())
                .timeDiff(0L)
                .build();
    }
    
    /**
     * 실패 결과 생성
     */
    public static ApiKeyValidationResult failure(String errorCode, String errorMessage) {
        return ApiKeyValidationResult.builder()
                .isValid(false)
                .errorCode(errorCode)
                .errorMessage(errorMessage)
                .serverTime(System.currentTimeMillis())
                .build();
    }
}