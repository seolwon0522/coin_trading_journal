package com.example.trading_bot.redis;

import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;

/**
 * Dead Letter Queue 서비스
 * 
 * 처리 실패한 Nautilus 이벤트를 저장하고 재시도를 관리합니다.
 * Redis를 이용하여 DLQ를 구현하고, 일정 시간 후 자동 재시도를 시도합니다.
 * 
 * @author Trading Bot Team
 * @since 2025-09-30
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DeadLetterService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final NautilusEventPersister eventPersister;
    
    private static final String DLQ_KEY_PREFIX = "nautilus:dlq:";
    private static final String DLQ_METADATA_PREFIX = "nautilus:dlq:meta:";
    private static final int MAX_RETRY_COUNT = 3;
    private static final int RETRY_DELAY_MINUTES = 5;

    /**
     * 실패한 이벤트를 Dead Letter Queue에 저장
     * 
     * @param eventType 이벤트 타입 (trades, positions 등)
     * @param eventData 이벤트 데이터
     * @param exception 발생한 예외
     */
    public void saveToDeadLetterQueue(String eventType, Map<String, Object> eventData, Exception exception) {
        try {
            String messageId = generateMessageId(eventType);
            String dlqKey = DLQ_KEY_PREFIX + messageId;
            String metaKey = DLQ_METADATA_PREFIX + messageId;

            // 이벤트 데이터 저장
            redisTemplate.opsForValue().set(dlqKey, eventData, 24, TimeUnit.HOURS);

            // 메타데이터 저장
            DeadLetterMetadata metadata = DeadLetterMetadata.builder()
                .messageId(messageId)
                .eventType(eventType)
                .failedAt(LocalDateTime.now())
                .retryCount(0)
                .errorMessage(exception.getMessage())
                .errorClass(exception.getClass().getName())
                .build();

            redisTemplate.opsForValue().set(metaKey, metadata, 24, TimeUnit.HOURS);

            log.warn("Saved event to DLQ: type={}, messageId={}, error={}", 
                eventType, messageId, exception.getMessage());

        } catch (Exception e) {
            log.error("Failed to save to DLQ", e);
        }
    }

    /**
     * DLQ에 있는 메시지를 주기적으로 재시도 (5분마다)
     */
    @Scheduled(fixedDelay = 300000) // 5분
    public void retryFailedMessages() {
        try {
            Set<String> metaKeys = redisTemplate.keys(DLQ_METADATA_PREFIX + "*");
            if (metaKeys == null || metaKeys.isEmpty()) {
                return;
            }

            int retryCount = 0;
            int successCount = 0;
            int failedCount = 0;

            for (String metaKey : metaKeys) {
                try {
                    DeadLetterMetadata metadata = (DeadLetterMetadata) redisTemplate.opsForValue().get(metaKey);
                    if (metadata == null) {
                        continue;
                    }

                    // 재시도 횟수 제한 체크
                    if (metadata.getRetryCount() >= MAX_RETRY_COUNT) {
                        log.warn("Max retry count reached for message: {}", metadata.getMessageId());
                        continue;
                    }

                    // 재시도 대기 시간 체크
                    long minutesSinceFailure = ChronoUnit.MINUTES.between(
                        metadata.getFailedAt(), LocalDateTime.now());
                    
                    if (minutesSinceFailure < RETRY_DELAY_MINUTES * (metadata.getRetryCount() + 1)) {
                        continue; // 아직 재시도 시간이 안 됨
                    }

                    // 이벤트 데이터 가져오기
                    String dlqKey = DLQ_KEY_PREFIX + metadata.getMessageId();
                    @SuppressWarnings("unchecked")
                    Map<String, Object> eventData = (Map<String, Object>) redisTemplate.opsForValue().get(dlqKey);
                    
                    if (eventData == null) {
                        log.warn("Event data not found for messageId: {}", metadata.getMessageId());
                        redisTemplate.delete(metaKey);
                        continue;
                    }

                    // 재시도
                    retryCount++;
                    boolean success = retryEvent(metadata.getEventType(), eventData);

                    if (success) {
                        // 성공 시 DLQ에서 제거
                        redisTemplate.delete(dlqKey);
                        redisTemplate.delete(metaKey);
                        successCount++;
                        log.info("Successfully retried DLQ message: {}", metadata.getMessageId());
                    } else {
                        // 실패 시 재시도 횟수 증가
                        metadata.setRetryCount(metadata.getRetryCount() + 1);
                        metadata.setLastRetryAt(LocalDateTime.now());
                        redisTemplate.opsForValue().set(metaKey, metadata, 24, TimeUnit.HOURS);
                        failedCount++;
                    }

                } catch (Exception e) {
                    log.error("Error retrying DLQ message", e);
                    failedCount++;
                }
            }

            if (retryCount > 0) {
                log.info("DLQ retry completed: total={}, success={}, failed={}", 
                    retryCount, successCount, failedCount);
            }

        } catch (Exception e) {
            log.error("Error in DLQ retry scheduler", e);
        }
    }

    /**
     * 이벤트 재시도
     */
    private boolean retryEvent(String eventType, Map<String, Object> eventData) {
        try {
            switch (eventType) {
                case "trades":
                    eventPersister.persistTradeEvent(eventData);
                    break;
                case "positions":
                    eventPersister.persistPositionEvent(eventData);
                    break;
                default:
                    log.warn("Unknown event type for retry: {}", eventType);
                    return false;
            }
            return true;
        } catch (Exception e) {
            log.error("Retry failed for event type: {}", eventType, e);
            return false;
        }
    }

    /**
     * DLQ 통계 조회
     */
    public Map<String, Object> getDeadLetterQueueStats() {
        Map<String, Object> stats = new HashMap<>();
        
        Set<String> metaKeys = redisTemplate.keys(DLQ_METADATA_PREFIX + "*");
        int totalMessages = metaKeys != null ? metaKeys.size() : 0;
        
        int maxRetriesReached = 0;
        int pendingRetry = 0;

        if (metaKeys != null) {
            for (String metaKey : metaKeys) {
                DeadLetterMetadata metadata = (DeadLetterMetadata) redisTemplate.opsForValue().get(metaKey);
                if (metadata != null) {
                    if (metadata.getRetryCount() >= MAX_RETRY_COUNT) {
                        maxRetriesReached++;
                    } else {
                        pendingRetry++;
                    }
                }
            }
        }

        stats.put("totalMessages", totalMessages);
        stats.put("maxRetriesReached", maxRetriesReached);
        stats.put("pendingRetry", pendingRetry);
        stats.put("maxRetryCount", MAX_RETRY_COUNT);
        stats.put("retryDelayMinutes", RETRY_DELAY_MINUTES);

        return stats;
    }

    /**
     * DLQ 메시지 ID 생성
     */
    private String generateMessageId(String eventType) {
        return eventType + ":" + System.currentTimeMillis() + ":" + 
            Math.abs(new java.util.Random().nextInt());
    }

    /**
     * Dead Letter 메타데이터
     */
    @Data
    @Builder
    public static class DeadLetterMetadata {
        private String messageId;
        private String eventType;
        private LocalDateTime failedAt;
        private LocalDateTime lastRetryAt;
        private Integer retryCount;
        private String errorMessage;
        private String errorClass;
    }
}
