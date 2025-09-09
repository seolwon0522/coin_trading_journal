package com.example.trading_bot.trade.controller;

import com.example.trading_bot.auth.security.UserPrincipal;
import com.example.trading_bot.binance.dto.ApiKeyValidationResult;
import com.example.trading_bot.common.dto.ApiResponse;
import com.example.trading_bot.trade.dto.ApiKeyRequest;
import com.example.trading_bot.trade.dto.ApiKeyResponse;
import com.example.trading_bot.trade.service.UserApiKeyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * API 키 관리 REST 컨트롤러
 * 사용자의 거래소 API 키를 관리하는 엔드포인트를 제공합니다.
 */
@Slf4j
@RestController
@RequestMapping("/api/api-keys")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "API Key Management", description = "거래소 API 키 관리 API")
public class ApiKeyController {
    
    private final UserApiKeyService apiKeyService;
    
    /**
     * API 키 등록
     * 
     * @param userPrincipal 인증된 사용자 정보
     * @param request API 키 등록 요청
     * @return 등록된 API 키 정보
     */
    @PostMapping
    @Operation(summary = "API 키 등록", description = "새로운 거래소 API 키를 등록합니다")
    public ResponseEntity<ApiResponse<ApiKeyResponse>> createApiKey(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody ApiKeyRequest request) {
        
        log.info("API 키 등록 요청: userId={}, exchange={}", 
                userPrincipal.getId(), request.getExchange());
        
        ApiKeyResponse response = apiKeyService.saveApiKey(userPrincipal.getId(), request);
        
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "API 키가 성공적으로 등록되었습니다"));
    }
    
    /**
     * API 키 목록 조회
     * 
     * @param userPrincipal 인증된 사용자 정보
     * @return API 키 목록
     */
    @GetMapping
    @Operation(summary = "API 키 목록 조회", description = "사용자의 모든 API 키를 조회합니다")
    public ResponseEntity<ApiResponse<List<ApiKeyResponse>>> getApiKeys(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        
        List<ApiKeyResponse> apiKeys = apiKeyService.getUserApiKeys(userPrincipal.getId());
        
        return ResponseEntity.ok(ApiResponse.success(apiKeys, "API 키 목록 조회 성공"));
    }
    
    /**
     * 특정 거래소의 활성 API 키 조회
     * 
     * @param userPrincipal 인증된 사용자 정보
     * @param exchange 거래소명
     * @return 활성 API 키 정보
     */
    @GetMapping("/active/{exchange}")
    @Operation(summary = "활성 API 키 조회", description = "특정 거래소의 활성 API 키를 조회합니다")
    public ResponseEntity<ApiResponse<ApiKeyResponse>> getActiveApiKey(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Parameter(description = "거래소명 (BINANCE, UPBIT 등)") @PathVariable String exchange) {
        
        ApiKeyResponse apiKey = apiKeyService.getActiveApiKey(userPrincipal.getId(), exchange);
        
        return ResponseEntity.ok(ApiResponse.success(apiKey, "활성 API 키 조회 성공"));
    }
    
    /**
     * API 키 수정
     * 
     * @param userPrincipal 인증된 사용자 정보
     * @param keyId API 키 ID
     * @param request 수정 요청
     * @return 수정된 API 키 정보
     */
    @PutMapping("/{keyId}")
    @Operation(summary = "API 키 수정", description = "등록된 API 키 정보를 수정합니다")
    public ResponseEntity<ApiResponse<ApiKeyResponse>> updateApiKey(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Parameter(description = "API 키 ID") @PathVariable Long keyId,
            @Valid @RequestBody ApiKeyRequest request) {
        
        log.info("API 키 수정 요청: userId={}, keyId={}", userPrincipal.getId(), keyId);
        
        ApiKeyResponse response = apiKeyService.updateApiKey(userPrincipal.getId(), keyId, request);
        
        return ResponseEntity.ok(ApiResponse.success(response, "API 키가 성공적으로 수정되었습니다"));
    }
    
    /**
     * API 키 삭제
     * 
     * @param userPrincipal 인증된 사용자 정보
     * @param keyId API 키 ID
     * @return 성공 메시지
     */
    @DeleteMapping("/{keyId}")
    @Operation(summary = "API 키 삭제", description = "등록된 API 키를 삭제합니다")
    public ResponseEntity<ApiResponse<Void>> deleteApiKey(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Parameter(description = "API 키 ID") @PathVariable Long keyId) {
        
        log.info("API 키 삭제 요청: userId={}, keyId={}", userPrincipal.getId(), keyId);
        
        apiKeyService.deleteApiKey(userPrincipal.getId(), keyId);
        
        return ResponseEntity.ok(ApiResponse.success("API 키가 성공적으로 삭제되었습니다"));
    }
    
    /**
     * API 키 연결 테스트
     * 
     * @param userPrincipal 인증된 사용자 정보
     * @param keyId API 키 ID
     * @return 테스트 결과
     */
    @PostMapping("/{keyId}/test")
    @Operation(summary = "API 키 연결 테스트", description = "API 키의 유효성을 테스트합니다")
    public ResponseEntity<ApiResponse<Boolean>> testApiKey(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Parameter(description = "API 키 ID") @PathVariable Long keyId) {
        
        log.info("API 키 테스트 요청: userId={}, keyId={}", userPrincipal.getId(), keyId);
        
        boolean isValid = apiKeyService.testApiKeyConnection(userPrincipal.getId(), keyId);
        
        if (isValid) {
            return ResponseEntity.ok(ApiResponse.success(true, "API 키 연결 테스트 성공"));
        } else {
            return ResponseEntity.ok(ApiResponse.error("API 키 연결 테스트 실패", false));
        }
    }
    
    /**
     * API 키 빠른 검증 (등록 전 테스트용)
     * 
     * @param request API 키 정보
     * @return 검증 결과
     */
    @PostMapping("/validate")
    @Operation(summary = "API 키 검증", description = "API 키 등록 전 유효성을 검증합니다")
    public ResponseEntity<ApiResponse<ApiKeyValidationResult>> validateApiKey(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody ApiKeyRequest request) {
        
        log.info("API 키 검증 요청: userId={}, exchange={}", 
                userPrincipal.getId(), request.getExchange());
        
        // 개선된 검증 로직 사용
        ApiKeyValidationResult result = apiKeyService.validateApiKeyForRegistration(request);
        
        if (result.isValid()) {
            return ResponseEntity.ok(ApiResponse.success(result, "API 키가 유효합니다"));
        } else {
            return ResponseEntity.ok(ApiResponse.error(result.getErrorMessage(), result));
        }
    }
}