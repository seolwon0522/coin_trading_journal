package com.example.trading_bot.trade.presentation.controller;

import com.example.trading_bot.auth.entity.User;
import com.example.trading_bot.auth.repository.UserRepository;
import com.example.trading_bot.auth.security.UserPrincipal;
import com.example.trading_bot.common.dto.ApiResponse;
import com.example.trading_bot.common.exception.BusinessException;
import com.example.trading_bot.trade.application.service.BinanceSyncService;
import com.example.trading_bot.trade.infrastructure.binance.client.BinanceApiClient;
import com.example.trading_bot.trade.domain.entity.UserApiKey;
import com.example.trading_bot.trade.domain.repository.UserApiKeyRepository;
import com.example.trading_bot.trade.infrastructure.security.CryptoService;
import com.example.trading_bot.trade.presentation.dto.ApiKeyRequest;
import com.example.trading_bot.trade.presentation.dto.ApiKeyResponse;
import com.example.trading_bot.trade.presentation.dto.SyncRequest;
import com.example.trading_bot.trade.presentation.dto.SyncResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/binance")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Binance Integration", description = "Binance API 연동 관리")
public class BinanceSyncController {
    
    private final BinanceSyncService binanceSyncService;
    private final UserApiKeyRepository apiKeyRepository;
    private final UserRepository userRepository;
    private final CryptoService cryptoService;
    private final BinanceApiClient binanceApiClient;
    
    @PostMapping("/api-keys")
    @Operation(summary = "API 키 등록", description = "Binance API 키를 등록합니다")
    public ResponseEntity<ApiResponse<ApiKeyResponse>> registerApiKey(
        @AuthenticationPrincipal UserPrincipal userPrincipal,
        @Valid @RequestBody ApiKeyRequest request
    ) {
        log.info("Registering API key for user: {}", userPrincipal.getId());
        
        // API 키 검증
        boolean isValid = binanceSyncService.validateApiKeys(
            request.getApiKey(),
            request.getSecretKey()
        );
        
        if (!isValid) {
            throw new BusinessException("유효하지 않은 API 키입니다", HttpStatus.BAD_REQUEST);
        }
        
        // 중복 확인
        if (apiKeyRepository.existsByUserIdAndApiKey(userPrincipal.getId(), request.getApiKey())) {
            throw new BusinessException("이미 등록된 API 키입니다", HttpStatus.CONFLICT);
        }
        
        User user = userRepository.findById(userPrincipal.getId())
            .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다", HttpStatus.NOT_FOUND));
        
        // Secret Key 암호화
        String encryptedSecretKey = cryptoService.encrypt(request.getSecretKey());
        
        // API 키 저장
        UserApiKey apiKey = UserApiKey.builder()
            .user(user)
            .exchange("BINANCE")
            .apiKey(request.getApiKey())
            .encryptedSecretKey(encryptedSecretKey)
            .keyName(request.getKeyName())
            .isActive(true)
            .canTrade(request.getCanTrade() != null ? request.getCanTrade() : false)
            .build();
        
        UserApiKey savedKey = apiKeyRepository.save(apiKey);
        
        ApiKeyResponse response = ApiKeyResponse.from(savedKey, cryptoService);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success(response, "API 키가 성공적으로 등록되었습니다"));
    }
    
    @GetMapping("/api-keys")
    @Operation(summary = "API 키 목록 조회", description = "등록된 API 키 목록을 조회합니다")
    public ResponseEntity<ApiResponse<List<ApiKeyResponse>>> getApiKeys(
        @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        List<UserApiKey> apiKeys = apiKeyRepository.findByUserId(userPrincipal.getId());
        
        List<ApiKeyResponse> responses = apiKeys.stream()
            .map(key -> ApiKeyResponse.from(key, cryptoService))
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(ApiResponse.success(responses));
    }
    
    @DeleteMapping("/api-keys/{keyId}")
    @Operation(summary = "API 키 삭제", description = "등록된 API 키를 삭제합니다")
    public ResponseEntity<ApiResponse<Void>> deleteApiKey(
        @AuthenticationPrincipal UserPrincipal userPrincipal,
        @PathVariable Long keyId
    ) {
        UserApiKey apiKey = apiKeyRepository.findByIdAndUserId(keyId, userPrincipal.getId())
            .orElseThrow(() -> new BusinessException("API 키를 찾을 수 없습니다", HttpStatus.NOT_FOUND));
        
        apiKeyRepository.delete(apiKey);
        
        return ResponseEntity.ok(ApiResponse.success("API 키가 삭제되었습니다"));
    }
    
    @PostMapping("/sync")
    @Operation(summary = "거래 동기화", description = "Binance 거래 내역을 동기화합니다")
    public ResponseEntity<ApiResponse<SyncResponse>> syncTrades(
        @AuthenticationPrincipal UserPrincipal userPrincipal,
        @Valid @RequestBody SyncRequest request
    ) {
        log.info("Starting trade sync for user: {}", userPrincipal.getId());
        
        // API 키 조회
        UserApiKey apiKey = apiKeyRepository.findByIdAndUserId(
            request.getApiKeyId(),
            userPrincipal.getId()
        ).orElseThrow(() -> new BusinessException("API 키를 찾을 수 없습니다", HttpStatus.NOT_FOUND));
        
        if (!apiKey.getIsActive()) {
            throw new BusinessException("비활성화된 API 키입니다", HttpStatus.FORBIDDEN);
        }
        
        User user = userRepository.findById(userPrincipal.getId())
            .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다", HttpStatus.NOT_FOUND));
        
        // 동기화 실행
        int syncedCount = binanceSyncService.syncTrades(
            user,
            apiKey.getApiKey(),
            apiKey.getEncryptedSecretKey(),
            request.getSymbol(),
            request.getStartTime(),
            request.getEndTime()
        );
        
        // 동기화 시간 업데이트
        apiKey.setLastSyncAt(LocalDateTime.now());
        apiKey.setLastUsedAt(LocalDateTime.now());
        apiKeyRepository.save(apiKey);
        
        SyncResponse response = SyncResponse.builder()
            .syncedCount(syncedCount)
            .symbol(request.getSymbol())
            .startTime(request.getStartTime())
            .endTime(request.getEndTime())
            .syncedAt(LocalDateTime.now())
            .build();
        
        return ResponseEntity.ok(ApiResponse.success(response, 
            String.format("%d개의 거래가 동기화되었습니다", syncedCount)));
    }
    
    @PostMapping("/sync/all")
    @Operation(summary = "전체 심볼 동기화", description = "모든 심볼의 거래 내역을 비동기로 동기화합니다")
    public ResponseEntity<ApiResponse<String>> syncAllSymbols(
        @AuthenticationPrincipal UserPrincipal userPrincipal,
        @RequestParam Long apiKeyId,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime,
        @RequestParam List<String> symbols
    ) {
        // API 키 조회
        UserApiKey apiKey = apiKeyRepository.findByIdAndUserId(apiKeyId, userPrincipal.getId())
            .orElseThrow(() -> new BusinessException("API 키를 찾을 수 없습니다", HttpStatus.NOT_FOUND));
        
        User user = userRepository.findById(userPrincipal.getId())
            .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다", HttpStatus.NOT_FOUND));
        
        // 비동기 동기화 시작
        binanceSyncService.syncAllTradesAsync(
            user,
            apiKey.getApiKey(),
            apiKey.getEncryptedSecretKey(),
            symbols,
            startTime,
            endTime
        );
        
        return ResponseEntity.ok(ApiResponse.success(
            "동기화가 시작되었습니다. 완료까지 시간이 소요될 수 있습니다."
        ));
    }
    
    @GetMapping("/test-connection")
    @Operation(summary = "연결 테스트", description = "Binance API 연결을 테스트합니다")
    public ResponseEntity<ApiResponse<Long>> testConnection() {
        // 이 엔드포인트는 API 키 없이도 호출 가능
        // BinanceApiClient를 직접 주입받아 사용
        Long serverTime = binanceApiClient.getServerTime();
        return ResponseEntity.ok(ApiResponse.success(serverTime, "Binance 서버 연결 성공"));
    }
}