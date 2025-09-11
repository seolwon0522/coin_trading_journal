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
     * 
     * Binance API 권한 시스템:
     * 1. canTrade: 계정 자체가 거래 가능한지 (계정 레벨)
     * 2. permissions: API 키가 가진 권한들
     * 
     * API 키 권한 구분:
     * - 읽기 전용: permissions가 비어있거나 TRD_GRP_XXX만 포함
     * - 거래 가능: permissions에 SPOT, MARGIN, FUTURES 등 포함
     * 
     * TRD_GRP_XXX는 계정이 거래할 수 있는 심볼 그룹을 나타내며,
     * API 키의 거래 권한과는 무관합니다.
     */
    public static ApiKeyValidationResult success(BinanceAccountResponse account) {
        List<String> permissions = account.getPermissions();
        
        // API 키의 실제 거래 권한 확인
        // TRD_GRP_XXX는 거래 권한이 아님 - 심볼 그룹 권한일 뿐
        boolean apiKeyCanTrade = false;
        if (permissions != null) {
            for (String permission : permissions) {
                // 실제 거래 권한 체크 (TRD_GRP 제외)
                if (permission.equals("SPOT") || 
                    permission.equals("MARGIN") || 
                    permission.equals("FUTURES") ||
                    permission.equals("LEVERAGED") ||
                    permission.equals("OPTIONS") ||
                    permission.equals("TRADE")) {
                    apiKeyCanTrade = true;
                    break;
                }
            }
        }
        
        // 권한 배열이 비어있거나 TRD_GRP만 있으면 읽기 전용
        if (permissions == null || permissions.isEmpty()) {
            apiKeyCanTrade = false;
        } else if (permissions.stream().allMatch(p -> p.startsWith("TRD_GRP_"))) {
            // TRD_GRP_XXX만 있으면 읽기 전용
            apiKeyCanTrade = false;
        }
        
        // API 키의 실제 출금 권한 확인
        boolean apiKeyCanWithdraw = permissions != null && permissions.stream()
            .anyMatch(p -> p.equals("WITHDRAW") || 
                          p.equals("UNIVERSAL_TRANSFER") || 
                          p.equals("INTERNAL_TRANSFER") || 
                          p.equals("TRANSFER"));
        
        return ApiKeyValidationResult.builder()
                .isValid(true)
                .permissions(permissions)
                .canTrade(apiKeyCanTrade)      // API 키의 거래 권한 (SPOT, MARGIN 등이 있어야 true)
                .canWithdraw(apiKeyCanWithdraw) // API 키의 출금 권한
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