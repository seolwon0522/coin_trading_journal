package com.example.trading_bot.redis;

import com.example.trading_bot.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Dead Letter Queue 모니터링 API
 * 
 * DLQ 상태를 확인하고 수동으로 재시도를 트리거할 수 있는 엔드포인트를 제공합니다.
 * 
 * @author Trading Bot Team
 * @since 2025-09-30
 */
@RestController
@RequestMapping("/api/dlq")
@RequiredArgsConstructor
public class DeadLetterQueueController {

    private final DeadLetterService deadLetterService;

    /**
     * DLQ 통계 조회
     * 
     * @return DLQ 메시지 개수, 재시도 대기 중인 메시지 수 등
     */
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {
        Map<String, Object> stats = deadLetterService.getDeadLetterQueueStats();
        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    /**
     * DLQ 수동 재시도 트리거
     * 
     * @return 재시도 결과
     */
    @PostMapping("/retry")
    public ResponseEntity<ApiResponse<String>> triggerRetry() {
        deadLetterService.retryFailedMessages();
        return ResponseEntity.ok(ApiResponse.success("DLQ retry triggered successfully"));
    }
}
