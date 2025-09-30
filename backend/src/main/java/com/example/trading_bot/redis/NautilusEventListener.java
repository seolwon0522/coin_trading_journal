package com.example.trading_bot.redis;

import com.example.trading_bot.strategy.service.StrategyService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Nautilus 이벤트를 위한 Redis Pub/Sub 리스너
 *
 * Nautilus 트레이딩 엔진에서 발생하는 다양한 이벤트(거래, 포지션, 주문 등)를
 * Redis 채널을 통해 수신하고 WebSocket으로 프론트엔드에 전파합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NautilusEventListener implements MessageListener {

    private final RedisTemplate<String, Object> redisTemplate;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;
    private final StrategyService strategyService;
    private final NautilusEventPersister eventPersister;
    private final DeadLetterService deadLetterService;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        try {
            String channel = new String(message.getChannel());
            String body = new String(message.getBody());

            log.debug("Received message from channel {}: {}", channel, body);

            Map<String, Object> eventData = objectMapper.readValue(body, Map.class);

            if (channel.startsWith("nautilus:")) {
                String eventType = channel.substring(9);
                handleNautilusEvent(eventType, eventData);
            }

        } catch (Exception e) {
            log.error("Error processing Redis message", e);
        }
    }

    private void handleNautilusEvent(String eventType, Map<String, Object> eventData) {
        String wsDestination;
        switch (eventType) {
            case "trades":
                wsDestination = "/topic/trades";
                processTrade(eventData);
                break;
            case "positions":
                wsDestination = "/topic/positions";
                processPosition(eventData);
                break;
            case "orders":
                wsDestination = "/topic/orders";
                processOrder(eventData);
                break;
            case "strategies":
                wsDestination = "/topic/strategies";
                processStrategyStatus(eventData);
                break;
            case "market":
                wsDestination = "/topic/market";
                break;
            case "performance":
                wsDestination = "/topic/performance";
                processPerformanceMetrics(eventData);
                break;
            case "risk":
                wsDestination = "/topic/risk";
                processRiskAlert(eventData);
                break;
            default:
                log.warn("Unknown event type: {}", eventType);
                return;
        }

        messagingTemplate.convertAndSend(wsDestination, eventData);
        log.debug("Forwarded event to WebSocket: {}", wsDestination);
    }

    @SuppressWarnings("unchecked")
    private void processTrade(Map<String, Object> eventData) {
        try {
            Map<String, Object> data = (Map<String, Object>) eventData.get("data");
            String strategyId = extractStrategyId(eventData);

            // 1. DB에 저장 (새로 추가)
            try {
                eventPersister.persistTradeEvent(eventData);
            } catch (Exception e) {
                log.error("Failed to persist trade event, saving to DLQ", e);
                deadLetterService.saveToDeadLetterQueue("trades", eventData, e);
                throw e; // 재전파하여 외부 catch에서도 처리
            }

            // 2. Strategy 거래 카운트 업데이트
            if (strategyId != null) {
                strategyService.recordTradeByNautilusId(strategyId);
            }

            log.info("Trade executed and persisted: strategyId={}, symbol={}, side={}, qty={}",
                    strategyId,
                    data != null ? data.get("symbol") : null,
                    data != null ? data.get("side") : null,
                    data != null ? data.get("filled_qty") : null);
        } catch (Exception e) {
            log.error("Error processing trade event", e);
            // WebSocket 전송은 계속 진행
        }
    }

    @SuppressWarnings("unchecked")
    private void processPosition(Map<String, Object> eventData) {
        try {
            Map<String, Object> data = (Map<String, Object>) eventData.get("data");
            String strategyId = extractStrategyId(eventData);

            // DB에 Position 정보 저장 (새로 추가)
            try {
                eventPersister.persistPositionEvent(eventData);
            } catch (Exception e) {
                log.error("Failed to persist position event, saving to DLQ", e);
                deadLetterService.saveToDeadLetterQueue("positions", eventData, e);
                throw e;
            }

            log.info("Position updated and persisted: strategyId={}, symbol={}, pnl={}",
                    strategyId,
                    data != null ? data.get("symbol") : null,
                    data != null ? data.get("unrealized_pnl") : null);
        } catch (Exception e) {
            log.error("Error processing position event", e);
            // WebSocket 전송은 계속 진행
        }
    }

    @SuppressWarnings("unchecked")
    private void processOrder(Map<String, Object> eventData) {
        try {
            Map<String, Object> data = (Map<String, Object>) eventData.get("data");
            String event = (String) eventData.get("event_type");

            log.info("Order {}: orderId={}, status={}",
                    event,
                    data != null ? data.get("order_id") : null,
                    data != null ? data.get("status") : null);

            // Order 데이터를 DB에 저장 (FILLED 주문은 Trade로 저장)
            eventPersister.persistOrderEvent(eventData);

        } catch (Exception e) {
            log.error("Error processing order event", e);
        }
    }

    private void processStrategyStatus(Map<String, Object> eventData) {
        try {
            String strategyId = extractStrategyId(eventData);
            if (strategyId != null) {
                strategyService.syncStrategyStatusByNautilusId(strategyId);
            }
            log.info("Strategy status event handled: strategyId={}", strategyId);
        } catch (Exception e) {
            log.error("Error processing strategy status event", e);
        }
    }

    private void processPerformanceMetrics(Map<String, Object> eventData) {
        try {
            String strategyId = extractStrategyId(eventData);
            if (strategyId != null) {
                strategyService.syncStrategyStatusByNautilusId(strategyId);
            }
        } catch (Exception e) {
            log.error("Error processing performance metrics", e);
        }
    }

    @SuppressWarnings("unchecked")
    private void processRiskAlert(Map<String, Object> eventData) {
        try {
            Map<String, Object> data = (Map<String, Object>) eventData.get("data");
            Map<String, Object> metadata = (Map<String, Object>) eventData.get("metadata");

            String strategyId = extractStrategyId(eventData);
            String severity = metadata != null ? (String) metadata.get("severity") : null;

            log.warn("Risk alert: strategyId={}, type={}, severity={}",
                    strategyId,
                    data != null ? data.get("alert_type") : null,
                    severity);
        } catch (Exception e) {
            log.error("Error processing risk alert", e);
        }
    }

    @SuppressWarnings("unchecked")
    private String extractStrategyId(Map<String, Object> eventData) {
        if (eventData == null) {
            return null;
        }
        Object metadata = eventData.get("metadata");
        if (metadata instanceof Map<?, ?> metadataMap) {
            Object value = ((Map<String, Object>) metadataMap).get("strategy_id");
            if (value != null) {
                return value.toString();
            }
        }
        Object data = eventData.get("data");
        if (data instanceof Map<?, ?> dataMap) {
            Object value = ((Map<String, Object>) dataMap).get("strategy_id");
            if (value != null) {
                return value.toString();
            }
        }
        return null;
    }
}
