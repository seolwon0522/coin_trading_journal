package com.example.trading_bot.trade.repository;

import com.example.trading_bot.trade.entity.Trade;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TradeRepository extends JpaRepository<Trade, Long> {

    // 사용자별 조회
    Page<Trade> findByUserId(Long userId, Pageable pageable);

    List<Trade> findByUserId(Long userId);

    // 사용자와 ID로 조회 (권한 확인용)
    Optional<Trade> findByIdAndUserId(Long id, Long userId);

    // 사용자와 ID로 존재 확인
    boolean existsByIdAndUserId(Long id, Long userId);

    // 총 거래 수 카운트
    Integer countByUserId(Long userId);

    // 특정 날짜 이후 거래 조회 (월간 PnL 계산용)
    List<Trade> findByUserIdAndExecutedAtAfter(Long userId, LocalDateTime startDate);

    // Binance API 동기화 관련 메서드
    boolean existsByUserIdAndExchangeTradeId(Long userId, String exchangeTradeId);

    List<Trade> findByUserIdAndExchangeIsNull(Long userId);

    List<Trade> findByUserIdAndExchangeNotNull(Long userId);
}