package com.example.trading_bot.trade.service;

import com.example.trading_bot.auth.entity.User;
import com.example.trading_bot.auth.repository.UserRepository;
import com.example.trading_bot.common.exception.BusinessException;
import org.springframework.http.HttpStatus;
import com.example.trading_bot.trade.dto.*;
import com.example.trading_bot.trade.entity.*;
import com.example.trading_bot.trade.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class TradeService {
    
    private final TradeRepository tradeRepository;
    private final UserRepository userRepository;
    private final TradeProfitCalculator profitCalculator;
    
    @Transactional
    public TradeResponse createManualTrade(Long userId, CreateTradeRequest request) {
        log.info("Creating manual trade for user: {}", userId);
        
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다", HttpStatus.NOT_FOUND));
        
        // 총 금액 계산
        BigDecimal totalAmount = calculateTotalAmount(request.getQuantity(), request.getPrice());
        
        Trade trade = Trade.builder()
            .user(user)
            .symbol(request.getSymbol().toUpperCase())
            .type(request.getType())
            .side(request.getSide())
            .quantity(request.getQuantity())
            .price(request.getPrice())
            .totalAmount(totalAmount)
            .fee(request.getFee())
            .feeAsset(request.getFeeAsset())
            .status(TradeStatus.EXECUTED)
            .source(TradeSource.MANUAL)
            .executedAt(request.getExecutedAt())
            .notes(request.getNotes())
            .strategy(request.getStrategy())
            .stopLoss(request.getStopLoss())
            .takeProfit(request.getTakeProfit())
            .build();
        
        // 리스크 리워드 비율 계산
        if (request.getStopLoss() != null && request.getTakeProfit() != null) {
            BigDecimal riskRewardRatio = calculateRiskRewardRatio(
                request.getPrice(), 
                request.getStopLoss(), 
                request.getTakeProfit()
            );
            trade.setRiskRewardRatio(riskRewardRatio);
        }
        
        // 매도인 경우 손익 계산
        if (request.getSide() == TradeSide.SELL) {
            profitCalculator.calculateProfitLoss(trade, userId);
        }
        
        Trade savedTrade = tradeRepository.save(trade);
        log.info("Trade created successfully with id: {}", savedTrade.getId());
        
        return TradeResponse.from(savedTrade);
    }
    
    @Transactional
    public TradeResponse updateTrade(Long userId, Long tradeId, UpdateTradeRequest request) {
        log.info("Updating trade {} for user: {}", tradeId, userId);
        
        Trade trade = tradeRepository.findByIdAndUserId(tradeId, userId)
            .orElseThrow(() -> new BusinessException("거래를 찾을 수 없습니다", HttpStatus.NOT_FOUND));
        
        // 수동 입력된 거래만 수정 가능
        if (trade.getSource() != TradeSource.MANUAL) {
            throw new BusinessException("수동으로 입력한 거래만 수정할 수 있습니다", HttpStatus.FORBIDDEN);
        }
        
        // 업데이트 필드
        if (request.getStrategy() != null) {
            trade.setStrategy(request.getStrategy());
        }
        if (request.getNotes() != null) {
            trade.setNotes(request.getNotes());
        }
        if (request.getStopLoss() != null) {
            trade.setStopLoss(request.getStopLoss());
        }
        if (request.getTakeProfit() != null) {
            trade.setTakeProfit(request.getTakeProfit());
        }
        if (request.getFee() != null) {
            trade.setFee(request.getFee());
        }
        if (request.getFeeAsset() != null) {
            trade.setFeeAsset(request.getFeeAsset());
        }
        
        // 리스크 리워드 비율 재계산
        if (trade.getStopLoss() != null && trade.getTakeProfit() != null) {
            BigDecimal riskRewardRatio = calculateRiskRewardRatio(
                trade.getPrice(), 
                trade.getStopLoss(), 
                trade.getTakeProfit()
            );
            trade.setRiskRewardRatio(riskRewardRatio);
        }
        
        Trade updatedTrade = tradeRepository.save(trade);
        log.info("Trade {} updated successfully", tradeId);
        
        return TradeResponse.from(updatedTrade);
    }
    
    @Transactional
    public void deleteTrade(Long userId, Long tradeId) {
        log.info("Deleting trade {} for user: {}", tradeId, userId);
        
        Trade trade = tradeRepository.findByIdAndUserId(tradeId, userId)
            .orElseThrow(() -> new BusinessException("거래를 찾을 수 없습니다", HttpStatus.NOT_FOUND));
        
        // 수동 입력된 거래만 삭제 가능
        if (trade.getSource() != TradeSource.MANUAL) {
            throw new BusinessException("수동으로 입력한 거래만 삭제할 수 있습니다", HttpStatus.FORBIDDEN);
        }
        
        tradeRepository.delete(trade);
        log.info("Trade {} deleted successfully", tradeId);
    }
    
    public TradeResponse getTrade(Long userId, Long tradeId) {
        Trade trade = tradeRepository.findByIdAndUserId(tradeId, userId)
            .orElseThrow(() -> new BusinessException("거래를 찾을 수 없습니다", HttpStatus.NOT_FOUND));
        
        return TradeResponse.from(trade);
    }
    
    public Page<TradeResponse> getUserTrades(Long userId, Pageable pageable) {
        Page<Trade> trades = tradeRepository.findByUserId(userId, pageable);
        return trades.map(TradeResponse::from);
    }
    
    public Page<TradeResponse> getUserTradesByDateRange(
        Long userId, 
        LocalDateTime startDate, 
        LocalDateTime endDate, 
        Pageable pageable
    ) {
        Page<Trade> trades = tradeRepository.findByUserIdAndExecutedAtBetween(
            userId, startDate, endDate, pageable
        );
        return trades.map(TradeResponse::from);
    }
    
    public Page<TradeResponse> getUserTradesBySymbol(
        Long userId, 
        String symbol, 
        Pageable pageable
    ) {
        Page<Trade> trades = tradeRepository.findByUserIdAndSymbol(
            userId, symbol.toUpperCase(), pageable
        );
        return trades.map(TradeResponse::from);
    }
    
    public List<TradeResponse> getRecentTrades(Long userId, int limit) {
        List<Trade> trades = tradeRepository.findTop10ByUserIdOrderByExecutedAtDesc(userId);
        return trades.stream()
            .limit(limit)
            .map(TradeResponse::from)
            .collect(Collectors.toList());
    }
    
    public List<String> getUserSymbols(Long userId) {
        return tradeRepository.findDistinctSymbolsByUserId(userId);
    }
    
    // 비즈니스 로직 메서드들
    private BigDecimal calculateTotalAmount(BigDecimal quantity, BigDecimal price) {
        if (quantity == null || price == null) {
            return BigDecimal.ZERO;
        }
        return quantity.multiply(price);
    }
    
    private BigDecimal calculateRiskRewardRatio(
        BigDecimal entryPrice, 
        BigDecimal stopLoss, 
        BigDecimal takeProfit
    ) {
        if (entryPrice == null || stopLoss == null || takeProfit == null) {
            return null;
        }
        
        BigDecimal risk = entryPrice.subtract(stopLoss).abs();
        BigDecimal reward = takeProfit.subtract(entryPrice).abs();
        
        if (risk.compareTo(BigDecimal.ZERO) == 0) {
            return null;
        }
        
        return reward.divide(risk, 4, RoundingMode.HALF_UP);
    }
}