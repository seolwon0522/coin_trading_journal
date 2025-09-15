package com.example.trading_bot.order.service;

import com.example.trading_bot.auth.entity.User;
import com.example.trading_bot.auth.repository.UserRepository;
import com.example.trading_bot.binance.client.BinanceApiClient;
import com.example.trading_bot.binance.dto.BinanceOrderResponse;
import com.example.trading_bot.binance.exception.BinanceApiException;
import com.example.trading_bot.common.exception.BusinessException;
import com.example.trading_bot.order.dto.OrderRequest;
import com.example.trading_bot.order.dto.OrderResponse;
import com.example.trading_bot.order.entity.Order;
import com.example.trading_bot.order.entity.OrderStatus;
import com.example.trading_bot.order.entity.OrderType;
import com.example.trading_bot.order.repository.OrderRepository;
import com.example.trading_bot.trade.entity.UserApiKey;
import com.example.trading_bot.trade.service.UserApiKeyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class OrderService {
    
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final UserApiKeyService userApiKeyService;
    private final BinanceApiClient binanceApiClient;
    
    /**
     * 주문 실행
     */
    public OrderResponse placeOrder(Long userId, OrderRequest request) {
        // 사용자 검증
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다", HttpStatus.NOT_FOUND));
        
        // API 키 조회
        UserApiKey apiKey = userApiKeyService.getActiveApiKeyWithDecryptedSecret(userId);
        String decryptedSecretKey = userApiKeyService.getDecryptedSecretKey(apiKey);
        
        // 주문 엔티티 생성
        Order order = createOrderEntity(user, request);
        
        try {
            // 테스트 모드 체크
            if (request.isTestMode()) {
                executeTestOrder(apiKey, decryptedSecretKey, request);
                order.setStatus(OrderStatus.CANCELLED); // 테스트 주문은 취소 상태로 표시
                order.setErrorMessage("테스트 주문 성공");
            } else {
                // 실제 주문 실행
                BinanceOrderResponse response = executeBinanceOrder(apiKey, decryptedSecretKey, request);
                updateOrderFromBinanceResponse(order, response);
            }
            
        } catch (BinanceApiException e) {
            handleOrderError(order, e);
        } catch (Exception e) {
            handleOrderError(order, new BusinessException("주문 실행 실패: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR));
        }
        
        // 주문 저장
        Order savedOrder = orderRepository.save(order);
        return OrderResponse.from(savedOrder);
    }
    
    /**
     * 주문 취소
     */
    public OrderResponse cancelOrder(Long userId, Long orderId) {
        // 주문 조회 및 권한 검증
        Order order = orderRepository.findByIdAndUserId(orderId, userId)
            .orElseThrow(() -> new BusinessException("주문을 찾을 수 없습니다", HttpStatus.NOT_FOUND));
        
        // 취소 가능 여부 체크
        if (!isCancellable(order)) {
            throw new BusinessException("취소할 수 없는 주문입니다. 현재 상태: " + order.getStatus(), HttpStatus.BAD_REQUEST);
        }
        
        // API 키 조회
        UserApiKey apiKey = userApiKeyService.getActiveApiKeyWithDecryptedSecret(userId);
        String decryptedSecretKey = userApiKeyService.getDecryptedSecretKey(apiKey);
        
        try {
            // Binance에서 주문 취소
            BinanceOrderResponse response = binanceApiClient.cancelOrder(
                apiKey.getApiKey(),
                decryptedSecretKey,
                order.getSymbol(),
                Long.parseLong(order.getBinanceOrderId())
            );
            
            // 주문 상태 업데이트
            markAsCancelled(order);
            
        } catch (BinanceApiException e) {
            log.error("주문 취소 실패: {}", e.getMessage());
            throw new BusinessException("주문 취소 실패: " + e.getMessage(), HttpStatus.BAD_REQUEST);
        }
        
        Order savedOrder = orderRepository.save(order);
        return OrderResponse.from(savedOrder);
    }
    
    /**
     * 주문 상태 조회
     */
    @Transactional(readOnly = true)
    public OrderResponse getOrder(Long userId, Long orderId) {
        Order order = orderRepository.findByIdAndUserId(orderId, userId)
            .orElseThrow(() -> new BusinessException("주문을 찾을 수 없습니다", HttpStatus.NOT_FOUND));
        
        return OrderResponse.from(order);
    }
    
    /**
     * 사용자의 모든 주문 조회
     */
    @Transactional(readOnly = true)
    public List<OrderResponse> getUserOrders(Long userId) {
        List<Order> orders = orderRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return orders.stream()
            .map(OrderResponse::from)
            .collect(Collectors.toList());
    }
    
    /**
     * 사용자의 열린 주문 조회
     */
    @Transactional(readOnly = true)
    public List<OrderResponse> getOpenOrders(Long userId) {
        List<Order> orders = orderRepository.findOpenOrdersByUserId(userId);
        return orders.stream()
            .map(OrderResponse::from)
            .collect(Collectors.toList());
    }
    
    /**
     * 주문 상태 동기화 (Binance와 동기화)
     */
    public OrderResponse syncOrderStatus(Long userId, Long orderId) {
        Order order = orderRepository.findByIdAndUserId(orderId, userId)
            .orElseThrow(() -> new BusinessException("주문을 찾을 수 없습니다", HttpStatus.NOT_FOUND));
        
        if (order.getBinanceOrderId() == null) {
            throw new BusinessException("Binance 주문 ID가 없습니다", HttpStatus.BAD_REQUEST);
        }
        
        UserApiKey apiKey = userApiKeyService.getActiveApiKeyWithDecryptedSecret(userId);
        String decryptedSecretKey = userApiKeyService.getDecryptedSecretKey(apiKey);
        
        try {
            BinanceOrderResponse response = binanceApiClient.getOrder(
                apiKey.getApiKey(),
                decryptedSecretKey,
                order.getSymbol(),
                Long.parseLong(order.getBinanceOrderId())
            );
            
            updateOrderFromBinanceResponse(order, response);
            Order savedOrder = orderRepository.save(order);
            return OrderResponse.from(savedOrder);
            
        } catch (BinanceApiException e) {
            log.error("주문 상태 동기화 실패: {}", e.getMessage());
            throw new BusinessException("주문 상태 동기화 실패: " + e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }
    
    // ============== Private Helper Methods ==============
    
    private Order createOrderEntity(User user, OrderRequest request) {
        return Order.builder()
            .user(user)
            .symbol(request.getSymbol())
            .side(request.getSide())
            .type(request.getType())
            .status(OrderStatus.PENDING)
            .quantity(request.getQuantity())
            .price(request.getPrice())
            .stopPrice(request.getStopPrice())
            .timeInForce(request.getTimeInForce())
            .clientOrderId(generateClientOrderId())
            .build();
    }
    
    private String generateClientOrderId() {
        return "ORDER_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    }
    
    private void executeTestOrder(UserApiKey apiKey, String decryptedSecretKey, OrderRequest request) throws BinanceApiException {
        binanceApiClient.placeTestOrder(
            apiKey.getApiKey(),
            decryptedSecretKey,
            com.example.trading_bot.binance.dto.BinanceOrderRequest.builder()
                .symbol(request.getSymbol())
                .side(request.getSide().name())
                .type(request.getType().toBinanceType())
                .quantity(request.getQuantity())
                .price(request.getPrice())
                .stopPrice(request.getStopPrice())
                .timeInForce(request.getTimeInForce())
                .build()
        );
    }
    
    private BinanceOrderResponse executeBinanceOrder(UserApiKey apiKey, String decryptedSecretKey, OrderRequest request) throws BinanceApiException {
        if (request.getType() == OrderType.MARKET) {
            return binanceApiClient.placeMarketOrder(
                apiKey.getApiKey(),
                decryptedSecretKey,
                request.getSymbol(),
                request.getSide().name(),
                request.getQuantity().toString()
            );
        } else if (request.getType() == OrderType.LIMIT) {
            return binanceApiClient.placeLimitOrder(
                apiKey.getApiKey(),
                decryptedSecretKey,
                request.getSymbol(),
                request.getSide().name(),
                request.getQuantity().toString(),
                request.getPrice().toString(),
                request.getTimeInForce() != null ? request.getTimeInForce() : "GTC"
            );
        } else {
            throw new BusinessException("지원하지 않는 주문 타입입니다: " + request.getType(), HttpStatus.BAD_REQUEST);
        }
    }
    
    private void updateOrderFromBinanceResponse(Order order, BinanceOrderResponse response) {
        order.setBinanceOrderId(String.valueOf(response.getOrderId()));
        order.setExecutedQty(response.getExecutedQty());
        
        // 상태 매핑
        switch (response.getStatus()) {
            case "NEW":
                markAsSubmitted(order, String.valueOf(response.getOrderId()));
                break;
            case "PARTIALLY_FILLED":
                markAsPartiallyFilled(order, response.getExecutedQty());
                break;
            case "FILLED":
                markAsFilled(order, response.getExecutedQty(), response.getAveragePrice());
                break;
            case "CANCELED":
            case "REJECTED":
            case "EXPIRED":
                markAsCancelled(order);
                break;
            default:
                order.setStatus(OrderStatus.FAILED);
                order.setErrorMessage("Unknown status: " + response.getStatus());
        }
        
        // 수수료 정보 업데이트
        if (response.getFills() != null && response.getFills().length > 0) {
            BigDecimal totalCommission = BigDecimal.ZERO;
            for (BinanceOrderResponse.Fill fill : response.getFills()) {
                totalCommission = totalCommission.add(fill.getCommission());
            }
            order.setCommission(totalCommission);
            order.setCommissionAsset(response.getFills()[0].getCommissionAsset());
        }
    }
    
    private void handleOrderError(Order order, Exception e) {
        markAsFailed(order, e.getMessage());
        log.error("주문 실행 실패: {}", e.getMessage());
        if (e instanceof BusinessException) {
            throw (BusinessException) e;
        }
        throw new BusinessException("주문 실행 실패: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
    }
    
    // 주문 상태 변경 메서드들 (비즈니스 로직)
    private void markAsSubmitted(Order order, String binanceOrderId) {
        order.setStatus(OrderStatus.SUBMITTED);
        order.setBinanceOrderId(binanceOrderId);
        order.setSubmittedAt(LocalDateTime.now());
    }
    
    private void markAsFilled(Order order, BigDecimal executedQty, BigDecimal executedPrice) {
        order.setStatus(OrderStatus.FILLED);
        order.setExecutedQty(executedQty);
        order.setExecutedPrice(executedPrice);
        order.setFilledAt(LocalDateTime.now());
    }
    
    private void markAsPartiallyFilled(Order order, BigDecimal executedQty) {
        order.setStatus(OrderStatus.PARTIALLY_FILLED);
        order.setExecutedQty(executedQty);
    }
    
    private void markAsCancelled(Order order) {
        order.setStatus(OrderStatus.CANCELLED);
        order.setCancelledAt(LocalDateTime.now());
    }
    
    private void markAsFailed(Order order, String errorMessage) {
        order.setStatus(OrderStatus.FAILED);
        order.setErrorMessage(errorMessage);
    }
    
    private boolean isCancellable(Order order) {
        return order.getStatus() == OrderStatus.PENDING || 
               order.getStatus() == OrderStatus.SUBMITTED || 
               order.getStatus() == OrderStatus.PARTIALLY_FILLED;
    }
}