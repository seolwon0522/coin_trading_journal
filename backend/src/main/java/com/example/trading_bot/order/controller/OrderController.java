package com.example.trading_bot.order.controller;

import com.example.trading_bot.auth.security.UserPrincipal;
import com.example.trading_bot.common.dto.ApiResponse;
import com.example.trading_bot.order.dto.OrderRequest;
import com.example.trading_bot.order.dto.OrderResponse;
import com.example.trading_bot.order.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Order", description = "주문 관리 API")
public class OrderController {
    
    private final OrderService orderService;
    
    /**
     * 주문 실행
     */
    @PostMapping
    @Operation(summary = "주문 실행", description = "새로운 주문을 실행합니다")
    public ResponseEntity<ApiResponse<OrderResponse>> placeOrder(
        @AuthenticationPrincipal UserPrincipal userPrincipal,
        @Valid @RequestBody OrderRequest request
    ) {
        log.info("주문 요청 - 사용자: {}, 심볼: {}, 타입: {}, 수량: {}", 
            userPrincipal.getId(), request.getSymbol(), request.getType(), request.getQuantity());
        
        OrderResponse response = orderService.placeOrder(userPrincipal.getId(), request);
        
        return ResponseEntity.ok(ApiResponse.success(response, "주문이 실행되었습니다"));
    }
    
    /**
     * 주문 취소
     */
    @DeleteMapping("/{orderId}")
    @Operation(summary = "주문 취소", description = "진행 중인 주문을 취소합니다")
    public ResponseEntity<ApiResponse<OrderResponse>> cancelOrder(
        @AuthenticationPrincipal UserPrincipal userPrincipal,
        @PathVariable Long orderId
    ) {
        log.info("주문 취소 요청 - 사용자: {}, 주문ID: {}", userPrincipal.getId(), orderId);
        
        OrderResponse response = orderService.cancelOrder(userPrincipal.getId(), orderId);
        
        return ResponseEntity.ok(ApiResponse.success(response, "주문이 취소되었습니다"));
    }
    
    /**
     * 주문 상세 조회
     */
    @GetMapping("/{orderId}")
    @Operation(summary = "주문 상세 조회", description = "특정 주문의 상세 정보를 조회합니다")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrder(
        @AuthenticationPrincipal UserPrincipal userPrincipal,
        @PathVariable Long orderId
    ) {
        OrderResponse response = orderService.getOrder(userPrincipal.getId(), orderId);
        
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    /**
     * 모든 주문 조회
     */
    @GetMapping
    @Operation(summary = "주문 목록 조회", description = "사용자의 모든 주문을 조회합니다")
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getUserOrders(
        @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        List<OrderResponse> orders = orderService.getUserOrders(userPrincipal.getId());
        
        return ResponseEntity.ok(ApiResponse.success(orders));
    }
    
    /**
     * 열린 주문 조회
     */
    @GetMapping("/open")
    @Operation(summary = "열린 주문 조회", description = "진행 중인 주문만 조회합니다")
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getOpenOrders(
        @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        List<OrderResponse> orders = orderService.getOpenOrders(userPrincipal.getId());
        
        return ResponseEntity.ok(ApiResponse.success(orders));
    }
    
    /**
     * 주문 상태 동기화
     */
    @PostMapping("/{orderId}/sync")
    @Operation(summary = "주문 상태 동기화", description = "Binance와 주문 상태를 동기화합니다")
    public ResponseEntity<ApiResponse<OrderResponse>> syncOrderStatus(
        @AuthenticationPrincipal UserPrincipal userPrincipal,
        @PathVariable Long orderId
    ) {
        log.info("주문 상태 동기화 요청 - 사용자: {}, 주문ID: {}", userPrincipal.getId(), orderId);
        
        OrderResponse response = orderService.syncOrderStatus(userPrincipal.getId(), orderId);
        
        return ResponseEntity.ok(ApiResponse.success(response, "주문 상태가 동기화되었습니다"));
    }
}