package com.example.trading_bot.trade.service;

import com.example.trading_bot.auth.entity.User;
import com.example.trading_bot.auth.repository.UserRepository;
import com.example.trading_bot.binance.client.BinanceApiClient;
import com.example.trading_bot.binance.dto.ApiKeyValidationResult;
import com.example.trading_bot.common.exception.BusinessException;
import com.example.trading_bot.common.util.CryptoUtils;
import com.example.trading_bot.trade.dto.ApiKeyRequest;
import com.example.trading_bot.trade.dto.ApiKeyResponse;
import com.example.trading_bot.trade.entity.UserApiKey;
import com.example.trading_bot.trade.repository.UserApiKeyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * API 키 관리 서비스
 * 사용자의 거래소 API 키를 안전하게 저장하고 관리합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserApiKeyService {
    
    private final UserApiKeyRepository apiKeyRepository;
    private final UserRepository userRepository;
    private final CryptoUtils cryptoUtils;
    private final BinanceApiClient binanceApiClient;
    
    /**
     * API 키 저장
     * 
     * @param userId 사용자 ID
     * @param request API 키 저장 요청
     * @return 저장된 API 키 정보
     */
    @Transactional
    public ApiKeyResponse saveApiKey(Long userId, ApiKeyRequest request) {
        // 사용자 확인
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다", HttpStatus.NOT_FOUND));
        
        // 중복 API 키 체크
        if (apiKeyRepository.existsByUserIdAndApiKey(userId, request.getApiKey())) {
            throw new BusinessException("이미 등록된 API 키입니다", HttpStatus.CONFLICT);
        }
        
        // API 키 검증 및 실제 권한 가져오기
        ApiKeyValidationResult validationResult = validateApiKeys(
                request.getApiKey(), 
                request.getSecretKey(), 
                request.getExchange()
        );
        
        if (!validationResult.isValid()) {
            throw new BusinessException(
                    "유효하지 않은 API 키입니다: " + validationResult.getErrorMessage(), 
                    HttpStatus.BAD_REQUEST
            );
        }
        
        // 시크릿 키 암호화
        String encryptedSecretKey = cryptoUtils.encrypt(request.getSecretKey());
        
        // API 키 저장 - Binance에서 가져온 실제 권한 사용
        UserApiKey apiKey = UserApiKey.builder()
                .user(user)
                .exchange(request.getExchange().toUpperCase())
                .apiKey(request.getApiKey())
                .encryptedSecretKey(encryptedSecretKey)
                .keyName(request.getKeyName())
                .isActive(true)
                .canTrade(validationResult.isCanTrade()) // Binance에서 가져온 실제 권한
                .canWithdraw(validationResult.isCanWithdraw()) // Binance에서 가져온 실제 권한
                .lastUsedAt(LocalDateTime.now())
                .syncFailureCount(0)
                .permissions(validationResult.getPermissions() != null ? 
                        String.join(",", validationResult.getPermissions()) : null)
                .build();
        
        UserApiKey saved = apiKeyRepository.save(apiKey);
        log.info("API 키 저장 완료: userId={}, exchange={}, keyId={}, canTrade={}, canWithdraw={}", 
                userId, request.getExchange(), saved.getId(), 
                saved.getCanTrade(), saved.getCanWithdraw());
        
        return ApiKeyResponse.from(saved);
    }
    
    /**
     * API 키 수정
     * 
     * @param userId 사용자 ID
     * @param keyId API 키 ID
     * @param request 수정 요청
     * @return 수정된 API 키 정보
     */
    @Transactional
    public ApiKeyResponse updateApiKey(Long userId, Long keyId, ApiKeyRequest request) {
        UserApiKey apiKey = apiKeyRepository.findByIdAndUserId(keyId, userId)
                .orElseThrow(() -> new BusinessException("API 키를 찾을 수 없습니다", HttpStatus.NOT_FOUND));
        
        // 새로운 API 키가 제공된 경우 유효성 검증 및 실제 권한 가져오기
        if (request.getApiKey() != null && request.getSecretKey() != null) {
            ApiKeyValidationResult validationResult = validateApiKeys(
                    request.getApiKey(), 
                    request.getSecretKey(), 
                    apiKey.getExchange()
            );
            
            if (!validationResult.isValid()) {
                throw new BusinessException(
                        "유효하지 않은 API 키입니다: " + validationResult.getErrorMessage(), 
                        HttpStatus.BAD_REQUEST
                );
            }
            
            apiKey.setApiKey(request.getApiKey());
            apiKey.setEncryptedSecretKey(cryptoUtils.encrypt(request.getSecretKey()));
            
            // Binance에서 가져온 실제 권한으로 업데이트
            apiKey.setCanTrade(validationResult.isCanTrade());
            apiKey.setCanWithdraw(validationResult.isCanWithdraw());
            apiKey.setPermissions(validationResult.getPermissions() != null ? 
                    String.join(",", validationResult.getPermissions()) : null);
        }
        
        // 기타 필드 업데이트
        if (request.getKeyName() != null) {
            apiKey.setKeyName(request.getKeyName());
        }
        if (request.getIsActive() != null) {
            apiKey.setIsActive(request.getIsActive());
        }
        // 수동으로 canTrade를 설정하는 것은 제거 (API 키가 변경되지 않은 경우에만 기존 값 유지)
        
        UserApiKey saved = apiKeyRepository.save(apiKey);
        log.info("API 키 수정 완료: userId={}, keyId={}, canTrade={}, canWithdraw={}", 
                userId, keyId, saved.getCanTrade(), saved.getCanWithdraw());
        
        return ApiKeyResponse.from(saved);
    }
    
    /**
     * API 키 삭제
     * 
     * @param userId 사용자 ID
     * @param keyId API 키 ID
     */
    @Transactional
    public void deleteApiKey(Long userId, Long keyId) {
        UserApiKey apiKey = apiKeyRepository.findByIdAndUserId(keyId, userId)
                .orElseThrow(() -> new BusinessException("API 키를 찾을 수 없습니다", HttpStatus.NOT_FOUND));
        
        apiKeyRepository.delete(apiKey);
        log.info("API 키 삭제 완료: userId={}, keyId={}", userId, keyId);
    }
    
    /**
     * 사용자의 모든 API 키 조회
     * 
     * @param userId 사용자 ID
     * @return API 키 목록
     */
    public List<ApiKeyResponse> getUserApiKeys(Long userId) {
        List<UserApiKey> apiKeys = apiKeyRepository.findByUserId(userId);
        return apiKeys.stream()
                .map(ApiKeyResponse::from)
                .collect(Collectors.toList());
    }
    
    /**
     * 특정 거래소의 활성 API 키 조회
     * 
     * @param userId 사용자 ID
     * @param exchange 거래소명
     * @return API 키 정보
     */
    public ApiKeyResponse getActiveApiKey(Long userId, String exchange) {
        UserApiKey apiKey = apiKeyRepository.findByUserIdAndExchangeAndIsActiveTrue(userId, exchange.toUpperCase())
                .orElseThrow(() -> new BusinessException("활성 API 키를 찾을 수 없습니다", HttpStatus.NOT_FOUND));
        
        return ApiKeyResponse.from(apiKey);
    }
    
    /**
     * API 키의 복호화된 시크릿 키 조회 (내부 사용)
     * 
     * @param userId 사용자 ID
     * @param exchange 거래소명
     * @return 복호화된 시크릿 키
     */
    @Transactional
    public String getDecryptedSecretKey(Long userId, String exchange) {
        UserApiKey apiKey = apiKeyRepository.findByUserIdAndExchangeAndIsActiveTrue(userId, exchange.toUpperCase())
                .orElseThrow(() -> new BusinessException("활성 API 키를 찾을 수 없습니다", HttpStatus.NOT_FOUND));
        
        // 사용 시간 업데이트
        apiKey.setLastUsedAt(LocalDateTime.now());
        apiKeyRepository.save(apiKey);
        
        return cryptoUtils.decrypt(apiKey.getEncryptedSecretKey());
    }
    
    /**
     * API 키 연결 테스트
     * 
     * @param userId 사용자 ID
     * @param keyId API 키 ID
     * @return 검증 결과
     */
    @Transactional
    public ApiKeyValidationResult testApiKeyConnection(Long userId, Long keyId) {
        UserApiKey apiKey = apiKeyRepository.findByIdAndUserId(keyId, userId)
                .orElseThrow(() -> new BusinessException("API 키를 찾을 수 없습니다", HttpStatus.NOT_FOUND));
        
        String decryptedSecret = cryptoUtils.decrypt(apiKey.getEncryptedSecretKey());
        ApiKeyValidationResult validationResult = validateApiKeys(
                apiKey.getApiKey(), 
                decryptedSecret, 
                apiKey.getExchange()
        );
        
        if (validationResult.isValid()) {
            // 테스트 성공 시 권한 정보 업데이트
            apiKey.setLastUsedAt(LocalDateTime.now());
            apiKey.setSyncFailureCount(0);
            apiKey.setCanTrade(validationResult.isCanTrade());
            apiKey.setCanWithdraw(validationResult.isCanWithdraw());
            apiKey.setPermissions(validationResult.getPermissions() != null ? 
                    String.join(",", validationResult.getPermissions()) : null);
            
            log.info("API 키 테스트 성공 및 권한 업데이트: keyId={}, canTrade={}, canWithdraw={}", 
                    keyId, apiKey.getCanTrade(), apiKey.getCanWithdraw());
        } else {
            apiKey.setSyncFailureCount(apiKey.getSyncFailureCount() + 1);
            log.warn("API 키 테스트 실패: keyId={}, error={}", keyId, validationResult.getErrorMessage());
        }
        
        apiKeyRepository.save(apiKey);
        return validationResult;
    }
    
    /**
     * API 키 유효성 검증 (간단한 버전)
     * 
     * @param apiKey API 키
     * @param secretKey 시크릿 키
     * @param exchange 거래소명
     * @return 유효한 경우 true
     */
    private boolean validateApiKeysSimple(String apiKey, String secretKey, String exchange) {
        if (!"BINANCE".equalsIgnoreCase(exchange)) {
            // 현재는 Binance만 지원
            throw new BusinessException("지원하지 않는 거래소입니다: " + exchange, HttpStatus.BAD_REQUEST);
        }
        
        try {
            // Binance API 키 검증
            ApiKeyValidationResult result = binanceApiClient.validateApiKeys(apiKey, secretKey);
            return result.isValid();
        } catch (Exception e) {
            log.error("API 키 검증 실패", e);
            return false;
        }
    }
    
    /**
     * 동기화 실패 횟수 증가
     * 
     * @param userId 사용자 ID
     * @param exchange 거래소명
     */
    @Transactional
    public void incrementSyncFailureCount(Long userId, String exchange) {
        UserApiKey apiKey = apiKeyRepository.findByUserIdAndExchangeAndIsActiveTrue(userId, exchange.toUpperCase())
                .orElse(null);
        
        if (apiKey != null) {
            apiKey.setSyncFailureCount(apiKey.getSyncFailureCount() + 1);
            
            // 실패 횟수가 5회 이상이면 비활성화
            if (apiKey.getSyncFailureCount() >= 5) {
                apiKey.setIsActive(false);
                log.warn("API 키 자동 비활성화: userId={}, exchange={}, failureCount={}", 
                        userId, exchange, apiKey.getSyncFailureCount());
            }
            
            apiKeyRepository.save(apiKey);
        }
    }
    
    /**
     * 동기화 성공 처리
     * 
     * @param userId 사용자 ID
     * @param exchange 거래소명
     */
    @Transactional
    public void updateSyncSuccess(Long userId, String exchange) {
        UserApiKey apiKey = apiKeyRepository.findByUserIdAndExchangeAndIsActiveTrue(userId, exchange.toUpperCase())
                .orElse(null);
        
        if (apiKey != null) {
            apiKey.setSyncFailureCount(0);
            apiKey.setLastSyncAt(LocalDateTime.now());
            apiKey.setLastUsedAt(LocalDateTime.now());
            apiKeyRepository.save(apiKey);
        }
    }
    
    /**
     * API 키 검증 (상세한 결과 반환)
     * 
     * @param apiKey API 키
     * @param secretKey 시크릿 키
     * @param exchange 거래소명
     * @return 상세한 검증 결과
     */
    public ApiKeyValidationResult validateApiKeys(String apiKey, String secretKey, String exchange) {
        if (!"BINANCE".equalsIgnoreCase(exchange)) {
            return ApiKeyValidationResult.failure("UNSUPPORTED", "지원하지 않는 거래소입니다: " + exchange);
        }
        
        try {
            // API 클라이언트 사용
            return binanceApiClient.validateApiKeys(apiKey, secretKey);
        } catch (Exception e) {
            log.error("API 키 검증 중 오류 발생", e);
            return ApiKeyValidationResult.failure("ERROR", "API 키 검증 실패: " + e.getMessage());
        }
    }
    
    /**
     * API 키 상세 검증 (등록 전 테스트용)
     * 
     * @param request API 키 정보
     * @return 상세한 검증 결과
     */
    public ApiKeyValidationResult validateApiKeyForRegistration(ApiKeyRequest request) {
        return validateApiKeys(request.getApiKey(), request.getSecretKey(), request.getExchange());
    }
    
    /**
     * 모든 활성 API 키의 권한 정보 업데이트
     * 기존 API 키들의 권한 정보를 Binance에서 다시 가져와 업데이트합니다
     * 
     * @param userId 사용자 ID
     * @return 업데이트된 API 키 개수
     */
    @Transactional
    public int refreshAllApiKeyPermissions(Long userId) {
        List<UserApiKey> apiKeys = apiKeyRepository.findByUserId(userId);
        int updatedCount = 0;
        
        for (UserApiKey apiKey : apiKeys) {
            if (apiKey.getIsActive()) {
                try {
                    String decryptedSecret = cryptoUtils.decrypt(apiKey.getEncryptedSecretKey());
                    ApiKeyValidationResult result = validateApiKeys(
                            apiKey.getApiKey(), 
                            decryptedSecret, 
                            apiKey.getExchange()
                    );
                    
                    if (result.isValid()) {
                        apiKey.setCanTrade(result.isCanTrade());
                        apiKey.setCanWithdraw(result.isCanWithdraw());
                        apiKey.setPermissions(result.getPermissions() != null ? 
                                String.join(",", result.getPermissions()) : null);
                        apiKey.setLastUsedAt(LocalDateTime.now());
                        apiKeyRepository.save(apiKey);
                        updatedCount++;
                        
                        log.info("API 키 권한 업데이트 완료: keyId={}, canTrade={}, canWithdraw={}", 
                                apiKey.getId(), apiKey.getCanTrade(), apiKey.getCanWithdraw());
                    } else {
                        log.warn("API 키 권한 업데이트 실패: keyId={}, error={}", 
                                apiKey.getId(), result.getErrorMessage());
                    }
                } catch (Exception e) {
                    log.error("API 키 권한 업데이트 중 오류: keyId={}", apiKey.getId(), e);
                }
            }
        }
        
        log.info("전체 API 키 권한 업데이트 완료: userId={}, updated={}/{}", 
                userId, updatedCount, apiKeys.size());
        return updatedCount;
    }
}