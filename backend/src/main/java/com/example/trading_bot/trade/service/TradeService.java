package com.example.trading_bot.trade.service;

import com.example.trading_bot.auth.entity.User;
import com.example.trading_bot.auth.repository.UserRepository;
import com.example.trading_bot.trade.dto.TradeRequest;
import com.example.trading_bot.trade.dto.TradeResponse;
import com.example.trading_bot.trade.entity.Trade;
import com.example.trading_bot.trade.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TradeService {
    
    private final TradeRepository tradeRepository;
    private final UserRepository userRepository;
    
    /**
     * 거래 생성
     */
    @Transactional
    public TradeResponse createTrade(Long userId, TradeRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + userId));
        
        Trade trade = Trade.builder()
                .user(user)
                .symbol(request.getSymbol())
                .side(request.getSide())
                .entryPrice(request.getEntryPrice())
                .entryQuantity(request.getEntryQuantity())
                .entryTime(request.getEntryTime())
                .exitPrice(request.getExitPrice())
                .exitQuantity(request.getExitQuantity())
                .exitTime(request.getExitTime())
                .notes(request.getNotes())
                .build();
        
        // PnL 계산 (비즈니스 로직은 서비스에서 처리)
        calculatePnl(trade);
        
        Trade saved = tradeRepository.save(trade);
        log.info("거래 생성 완료: userId={}, tradeId={}", userId, saved.getId());
        
        return TradeResponse.from(saved);
    }
    
    /**
     * 거래 수정
     */
    @Transactional
    public TradeResponse updateTrade(Long userId, Long tradeId, TradeRequest request) {
        Trade trade = tradeRepository.findByIdAndUserId(tradeId, userId)
                .orElseThrow(() -> new IllegalArgumentException("거래를 찾을 수 없습니다: " + tradeId));
        
        trade.setSymbol(request.getSymbol());
        trade.setSide(request.getSide());
        trade.setEntryPrice(request.getEntryPrice());
        trade.setEntryQuantity(request.getEntryQuantity());
        trade.setEntryTime(request.getEntryTime());
        trade.setExitPrice(request.getExitPrice());
        trade.setExitQuantity(request.getExitQuantity());
        trade.setExitTime(request.getExitTime());
        trade.setNotes(request.getNotes());
        
        // PnL 재계산
        calculatePnl(trade);
        
        Trade saved = tradeRepository.save(trade);
        log.info("거래 수정 완료: userId={}, tradeId={}", userId, tradeId);
        
        return TradeResponse.from(saved);
    }
    
    /**
     * 거래 삭제
     */
    @Transactional
    public void deleteTrade(Long userId, Long tradeId) {
        if (!tradeRepository.existsByIdAndUserId(tradeId, userId)) {
            throw new IllegalArgumentException("거래를 찾을 수 없습니다: " + tradeId);
        }
        
        tradeRepository.deleteById(tradeId);
        log.info("거래 삭제 완료: userId={}, tradeId={}", userId, tradeId);
    }
    
    /**
     * 거래 단건 조회
     */
    public TradeResponse getTrade(Long userId, Long tradeId) {
        Trade trade = tradeRepository.findByIdAndUserId(tradeId, userId)
                .orElseThrow(() -> new IllegalArgumentException("거래를 찾을 수 없습니다: " + tradeId));
        
        return TradeResponse.from(trade);
    }
    
    /**
     * 사용자의 거래 목록 조회
     */
    public Page<TradeResponse> getUserTrades(Long userId, Pageable pageable) {
        Page<Trade> trades = tradeRepository.findByUserId(userId, pageable);
        return trades.map(TradeResponse::from);
    }
    
    
    /**
     * PnL 계산 (비즈니스 로직)
     */
    private void calculatePnl(Trade trade) {
        if (trade.getExitPrice() != null && trade.getExitQuantity() != null) {
            BigDecimal entryValue = trade.getEntryPrice().multiply(trade.getEntryQuantity());
            BigDecimal exitValue = trade.getExitPrice().multiply(trade.getExitQuantity());
            
            BigDecimal pnl;
            if ("BUY".equals(trade.getSide())) {
                pnl = exitValue.subtract(entryValue);
            } else {
                pnl = entryValue.subtract(exitValue);
            }
            
            trade.setPnl(pnl);
            
            // PnL 퍼센트 계산
            if (entryValue.compareTo(BigDecimal.ZERO) != 0) {
                BigDecimal pnlPercent = pnl.divide(entryValue, 4, RoundingMode.HALF_UP)
                                          .multiply(new BigDecimal("100"));
                trade.setPnlPercent(pnlPercent);
            }
        } else {
            // 청산하지 않은 경우 PnL은 null
            trade.setPnl(null);
            trade.setPnlPercent(null);
        }
    }
}