package com.example.trading_bot.trade.controller;

import com.example.trading_bot.auth.security.UserPrincipal;
import com.example.trading_bot.common.dto.ApiResponse;
import com.example.trading_bot.trade.dto.TradeRequest;
import com.example.trading_bot.trade.dto.TradeResponse;
import com.example.trading_bot.trade.service.TradeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 거래(Trade) 관련 REST API 컨트롤러
 * 
 * @author CryptoTradeManager
 * @since 1.0.0
 */
@Slf4j
@RestController
@RequestMapping("/api/trades")
@RequiredArgsConstructor
public class TradeController {
    
    private final TradeService tradeService;
    
    /**
     * 새로운 거래 생성
     * 
     * @param userPrincipal 인증된 사용자 정보
     * @param request 거래 생성 요청 DTO
     * @return 생성된 거래 정보
     */
    @PostMapping
    public ResponseEntity<ApiResponse<TradeResponse>> createTrade(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody TradeRequest request) {
        
        log.info("거래 생성 요청: userId={}, symbol={}", userPrincipal.getId(), request.getSymbol());
        TradeResponse response = tradeService.createTrade(userPrincipal.getId(), request);
        
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "거래가 성공적으로 생성되었습니다"));
    }
    
    /**
     * 거래 수정
     * 
     * @param userPrincipal 인증된 사용자 정보
     * @param tradeId 수정할 거래 ID
     * @param request 거래 수정 요청 DTO
     * @return 수정된 거래 정보
     */
    @PutMapping("/{tradeId}")
    public ResponseEntity<ApiResponse<TradeResponse>> updateTrade(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long tradeId,
            @Valid @RequestBody TradeRequest request) {
        
        log.info("거래 수정 요청: userId={}, tradeId={}", userPrincipal.getId(), tradeId);
        TradeResponse response = tradeService.updateTrade(userPrincipal.getId(), tradeId, request);
        
        return ResponseEntity.ok(ApiResponse.success(response, "거래가 성공적으로 수정되었습니다"));
    }
    
    /**
     * 거래 삭제
     * 
     * @param userPrincipal 인증된 사용자 정보
     * @param tradeId 삭제할 거래 ID
     * @return 삭제 완료 응답
     */
    @DeleteMapping("/{tradeId}")
    public ResponseEntity<ApiResponse<Void>> deleteTrade(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long tradeId) {
        
        log.info("거래 삭제 요청: userId={}, tradeId={}", userPrincipal.getId(), tradeId);
        tradeService.deleteTrade(userPrincipal.getId(), tradeId);
        
        return ResponseEntity.ok(ApiResponse.success(null, "거래가 성공적으로 삭제되었습니다"));
    }
    
    /**
     * 거래 단건 조회
     * 
     * @param userPrincipal 인증된 사용자 정보
     * @param tradeId 조회할 거래 ID
     * @return 거래 상세 정보
     */
    @GetMapping("/{tradeId}")
    public ResponseEntity<ApiResponse<TradeResponse>> getTrade(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long tradeId) {
        
        TradeResponse response = tradeService.getTrade(userPrincipal.getId(), tradeId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    /**
     * 거래 목록 조회 - 인증된 유저의 거래만 반환
     * 
     * @param userPrincipal 인증된 사용자 정보
     * @param page 페이지 번호 (기본값: 0)
     * @param size 페이지 크기 (기본값: 20)
     * @param sortBy 정렬 기준 (기본값: entryTime)
     * @param direction 정렬 방향 (기본값: DESC)
     * @return 페이징된 거래 목록
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<TradeResponse>>> getTrades(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "entryTime") String sortBy,
            @RequestParam(defaultValue = "DESC") String direction) {
        
        if (userPrincipal == null) {
            log.error("인증되지 않은 사용자의 거래 목록 조회 시도");
            throw new IllegalStateException("인증이 필요합니다");
        }
        
        Sort.Direction sortDirection = Sort.Direction.fromString(direction);
        Pageable pageable = PageRequest.of(page, size, Sort.by(sortDirection, sortBy));
        
        // 인증된 유저의 거래만 조회
        Page<TradeResponse> response = tradeService.getUserTrades(userPrincipal.getId(), pageable);
        
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}