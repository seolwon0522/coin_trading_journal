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
 * Redis Pub/Sub listener for Nautilus events.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NautilusEventListener implements MessageListener {

    private final RedisTemplate<String, Object> redisTemplate;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;
    private final StrategyService strategyService;

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

            if (strategyId != null) {
                strategyService.recordTradeByNautilusId(strategyId);
            }

            log.info("Trade executed: strategyId={}, symbol={}, side={}, qty={}",
                    strategyId,
                    data != null ? data.get("symbol") : null,
                    data != null ? data.get("side") : null,
                    data != null ? data.get("filled_qty") : null);
        } catch (Exception e) {
            log.error("Error processing trade event", e);
        }
    }

    @SuppressWarnings("unchecked")
    private void processPosition(Map<String, Object> eventData) {
        try {
            Map<String, Object> data = (Map<String, Object>) eventData.get("data");
            String strategyId = extractStrategyId(eventData);

            log.info("Position updated: strategyId={}, symbol={}, pnl={}",
                    strategyId,
                    data != null ? data.get("symbol") : null,
                    data != null ? data.get("unrealized_pnl") : null);
        } catch (Exception e) {
            log.error("Error processing position event", e);
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
