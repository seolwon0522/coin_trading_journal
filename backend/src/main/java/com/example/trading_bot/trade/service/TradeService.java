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
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

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
        User user = findUserOrThrow(userId);
        
        Trade trade = Trade.builder()
            .user(user)
            .symbol(request.getSymbol().toUpperCase())
            .type(request.getType())
            .side(request.getSide())
            .quantity(request.getQuantity())
            .price(request.getPrice())
            .totalAmount(request.getQuantity().multiply(request.getPrice()))
            .fee(request.getFee())
            .feeAsset(request.getFeeAsset())
            .status(TradeStatus.EXECUTED)
            .source(TradeSource.MANUAL)
            .executedAt(request.getExecutedAt())
            .notes(request.getNotes())
            .strategy(request.getStrategy())
            .tradingStrategy(request.getTradingStrategy())
            .entryTime(request.getEntryTime() != null ? request.getEntryTime() : request.getExecutedAt())
            .exitTime(request.getExitTime())
            .stopLoss(request.getStopLoss())
            .takeProfit(request.getTakeProfit())
            .build();
        
        updateRiskRewardRatio(trade);
        
        if (request.getSide() == TradeSide.SELL) {
            profitCalculator.calculateProfitLoss(trade, userId);
        }
        
        return TradeResponse.from(tradeRepository.save(trade));
    }
    
    @Transactional
    public TradeResponse updateTrade(Long userId, Long tradeId, UpdateTradeRequest request) {
        Trade trade = findUserTradeOrThrow(userId, tradeId);
        validateManualTrade(trade);
        
        // 일괄 업데이트 - null이 아닌 값만 적용
        updateFieldIfPresent(request.getStrategy(), trade::setStrategy);
        updateFieldIfPresent(request.getNotes(), trade::setNotes);
        updateFieldIfPresent(request.getStopLoss(), trade::setStopLoss);
        updateFieldIfPresent(request.getTakeProfit(), trade::setTakeProfit);
        updateFieldIfPresent(request.getFee(), trade::setFee);
        updateFieldIfPresent(request.getFeeAsset(), trade::setFeeAsset);
        
        updateRiskRewardRatio(trade);
        
        return TradeResponse.from(tradeRepository.save(trade));
    }
    
    @Transactional
    public void deleteTrade(Long userId, Long tradeId) {
        Trade trade = findUserTradeOrThrow(userId, tradeId);
        validateManualTrade(trade);
        tradeRepository.delete(trade);
    }
    
    public TradeResponse getTrade(Long userId, Long tradeId) {
        return TradeResponse.from(findUserTradeOrThrow(userId, tradeId));
    }
    
    public Page<TradeResponse> getUserTrades(Long userId, Pageable pageable) {
        return tradeRepository.findByUserId(userId, pageable)
            .map(TradeResponse::from);
    }
    
    // 개발 환경용: 모든 거래 조회
    public Page<TradeResponse> getAllTrades(Pageable pageable) {
        return tradeRepository.findAll(pageable)
            .map(TradeResponse::from);
    }
    
    public Page<TradeResponse> getUserTradesByDateRange(
        Long userId, LocalDateTime startDate, LocalDateTime endDate, Pageable pageable
    ) {
        return tradeRepository.findByUserIdAndExecutedAtBetween(userId, startDate, endDate, pageable)
            .map(TradeResponse::from);
    }
    
    public Page<TradeResponse> getUserTradesBySymbol(Long userId, String symbol, Pageable pageable) {
        return tradeRepository.findByUserIdAndSymbol(userId, symbol.toUpperCase(), pageable)
            .map(TradeResponse::from);
    }
    
    public List<TradeResponse> getRecentTrades(Long userId, int limit) {
        // Repository 메서드명 변경 제안: findTopNByUserIdOrderByExecutedAtDesc
        Pageable pageable = PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "executedAt"));
        return tradeRepository.findByUserId(userId, pageable)
            .map(TradeResponse::from)
            .getContent();
    }
    
    public List<String> getUserSymbols(Long userId) {
        return tradeRepository.findDistinctSymbolsByUserId(userId);
    }
    
    // === Private Helper Methods ===
    
    private User findUserOrThrow(Long userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다", HttpStatus.NOT_FOUND));
    }
    
    private Trade findUserTradeOrThrow(Long userId, Long tradeId) {
        return tradeRepository.findByIdAndUserId(tradeId, userId)
            .orElseThrow(() -> new BusinessException("거래를 찾을 수 없습니다", HttpStatus.NOT_FOUND));
    }
    
    private void validateManualTrade(Trade trade) {
        if (trade.getSource() != TradeSource.MANUAL) {
            throw new BusinessException("수동으로 입력한 거래만 수정/삭제 가능합니다", HttpStatus.FORBIDDEN);
        }
    }
    
    private void updateRiskRewardRatio(Trade trade) {
        if (trade.getStopLoss() == null || trade.getTakeProfit() == null || trade.getPrice() == null) {
            return;
        }
        
        BigDecimal risk = trade.getPrice().subtract(trade.getStopLoss()).abs();
        if (risk.compareTo(BigDecimal.ZERO) == 0) {
            return;
        }
        
        BigDecimal reward = trade.getTakeProfit().subtract(trade.getPrice()).abs();
        trade.setRiskRewardRatio(reward.divide(risk, 4, RoundingMode.HALF_UP));
    }
    
    private <T> void updateFieldIfPresent(T value, java.util.function.Consumer<T> setter) {
        if (value != null) {
            setter.accept(value);
        }
    }
}