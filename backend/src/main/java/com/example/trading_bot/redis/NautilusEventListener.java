package com.example.trading_bot.redis;

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
 * Redis Pub/Sub listener for Nautilus events
 * Bridges Nautilus → Redis → Backend → WebSocket → Frontend
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NautilusEventListener implements MessageListener {

    private final RedisTemplate<String, Object> redisTemplate;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    /**
     * Process messages from Redis Pub/Sub
     */
    @Override
    public void onMessage(Message message, byte[] pattern) {
        try {
            String channel = new String(message.getChannel());
            String body = new String(message.getBody());

            log.debug("Received message from channel {}: {}", channel, body);

            // Parse the message
            Map<String, Object> eventData = objectMapper.readValue(body, Map.class);

            // Route based on channel
            if (channel.startsWith("nautilus:")) {
                String eventType = channel.substring(9); // Remove "nautilus:" prefix
                handleNautilusEvent(eventType, eventData);
            }

        } catch (Exception e) {
            log.error("Error processing Redis message", e);
        }
    }

    /**
     * Handle different types of Nautilus events
     */
    private void handleNautilusEvent(String eventType, Map<String, Object> eventData) {
        String wsDestination = null;

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

        // Forward to WebSocket subscribers
        if (wsDestination != null) {
            messagingTemplate.convertAndSend(wsDestination, eventData);
            log.debug("Forwarded event to WebSocket: {}", wsDestination);
        }
    }

    /**
     * Process trade execution events
     */
    private void processTrade(Map<String, Object> eventData) {
        try {
            Map<String, Object> data = (Map<String, Object>) eventData.get("data");
            String strategyId = (String) ((Map<String, Object>) eventData.get("metadata"))
                    .get("strategy_id");

            // Store trade in database (async)
            // tradeService.saveTrade(data);

            log.info("Trade executed: strategyId={}, symbol={}, side={}, qty={}",
                    strategyId,
                    data.get("symbol"),
                    data.get("side"),
                    data.get("filled_qty"));

        } catch (Exception e) {
            log.error("Error processing trade event", e);
        }
    }

    /**
     * Process position update events
     */
    private void processPosition(Map<String, Object> eventData) {
        try {
            Map<String, Object> data = (Map<String, Object>) eventData.get("data");
            String strategyId = (String) ((Map<String, Object>) eventData.get("metadata"))
                    .get("strategy_id");

            // Update position in database
            // positionService.updatePosition(data);

            log.info("Position updated: strategyId={}, symbol={}, pnl={}",
                    strategyId,
                    data.get("symbol"),
                    data.get("unrealized_pnl"));

        } catch (Exception e) {
            log.error("Error processing position event", e);
        }
    }

    /**
     * Process order update events
     */
    private void processOrder(Map<String, Object> eventData) {
        try {
            Map<String, Object> data = (Map<String, Object>) eventData.get("data");
            String eventType = (String) eventData.get("event_type");

            log.info("Order {}: orderId={}, status={}",
                    eventType,
                    data.get("order_id"),
                    data.get("status"));

        } catch (Exception e) {
            log.error("Error processing order event", e);
        }
    }

    /**
     * Process strategy status updates
     */
    private void processStrategyStatus(Map<String, Object> eventData) {
        try {
            Map<String, Object> data = (Map<String, Object>) eventData.get("data");
            String strategyId = (String) data.get("strategy_id");
            Boolean isRunning = (Boolean) data.get("is_running");

            // Update strategy status in database
            // strategyService.updateStatus(strategyId, isRunning);

            log.info("Strategy status updated: strategyId={}, running={}",
                    strategyId, isRunning);

        } catch (Exception e) {
            log.error("Error processing strategy status event", e);
        }
    }

    /**
     * Process performance metrics updates
     */
    private void processPerformanceMetrics(Map<String, Object> eventData) {
        try {
            Map<String, Object> data = (Map<String, Object>) eventData.get("data");
            String strategyId = (String) data.get("strategy_id");

            // Store metrics in database
            // performanceService.updateMetrics(strategyId, data);

            log.info("Performance metrics updated: strategyId={}, winRate={}, totalPnl={}",
                    strategyId,
                    data.get("win_rate"),
                    data.get("total_pnl"));

        } catch (Exception e) {
            log.error("Error processing performance metrics", e);
        }
    }

    /**
     * Process risk alerts
     */
    private void processRiskAlert(Map<String, Object> eventData) {
        try {
            Map<String, Object> data = (Map<String, Object>) eventData.get("data");
            Map<String, Object> metadata = (Map<String, Object>) eventData.get("metadata");

            String strategyId = (String) data.get("strategy_id");
            String severity = (String) metadata.get("severity");

            // Handle based on severity
            if ("high".equals(severity)) {
                // Notify user immediately
                // notificationService.sendRiskAlert(strategyId, data);
            }

            log.warn("Risk alert: strategyId={}, type={}, severity={}",
                    strategyId,
                    data.get("alert_type"),
                    severity);

        } catch (Exception e) {
            log.error("Error processing risk alert", e);
        }
    }
}