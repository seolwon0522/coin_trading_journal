package com.example.trading_bot.trade.domain.repository;

import com.example.trading_bot.trade.domain.entity.Trade;
import com.example.trading_bot.trade.domain.entity.TradeSource;
import com.example.trading_bot.trade.domain.entity.TradeStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TradeRepository extends JpaRepository<Trade, Long> {
    
    // 기본 조회
    Optional<Trade> findByIdAndUserId(Long id, Long userId);
    
    Optional<Trade> findByExternalId(String externalId);
    
    boolean existsByExternalId(String externalId);
    
    // 사용자별 조회
    Page<Trade> findByUserId(Long userId, Pageable pageable);
    
    Page<Trade> findByUserIdAndExecutedAtBetween(
        Long userId, 
        LocalDateTime startDate, 
        LocalDateTime endDate, 
        Pageable pageable
    );
    
    // 심볼별 조회
    Page<Trade> findByUserIdAndSymbol(Long userId, String symbol, Pageable pageable);
    
    List<Trade> findByUserIdAndSymbolAndExecutedAtBetween(
        Long userId,
        String symbol,
        LocalDateTime startDate,
        LocalDateTime endDate
    );
    
    // 상태별 조회
    List<Trade> findByUserIdAndStatus(Long userId, TradeStatus status);
    
    // 소스별 조회
    List<Trade> findByUserIdAndSource(Long userId, TradeSource source);
    
    // 통계용 쿼리
    @Query("SELECT COUNT(t) FROM Trade t WHERE t.user.id = :userId AND t.executedAt BETWEEN :startDate AND :endDate")
    Long countByUserIdAndDateRange(
        @Param("userId") Long userId,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );
    
    @Query("SELECT COUNT(t) FROM Trade t WHERE t.user.id = :userId AND t.profitLoss > 0 AND t.executedAt BETWEEN :startDate AND :endDate")
    Long countProfitableTradesByUserIdAndDateRange(
        @Param("userId") Long userId,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );
    
    @Query("SELECT SUM(t.profitLoss) FROM Trade t WHERE t.user.id = :userId AND t.executedAt BETWEEN :startDate AND :endDate")
    BigDecimal sumProfitLossByUserIdAndDateRange(
        @Param("userId") Long userId,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );
    
    @Query("SELECT AVG(t.profitLossPercentage) FROM Trade t WHERE t.user.id = :userId AND t.executedAt BETWEEN :startDate AND :endDate")
    BigDecimal averageProfitLossPercentageByUserIdAndDateRange(
        @Param("userId") Long userId,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );
    
    // 최근 거래 조회
    List<Trade> findTop10ByUserIdOrderByExecutedAtDesc(Long userId);
    
    // 심볼별 최근 거래 조회
    @Query("SELECT t FROM Trade t WHERE t.user.id = :userId AND t.symbol = :symbol ORDER BY t.executedAt DESC")
    List<Trade> findRecentTradesBySymbol(
        @Param("userId") Long userId,
        @Param("symbol") String symbol,
        Pageable pageable
    );
    
    // 전략별 조회
    List<Trade> findByUserIdAndStrategy(Long userId, String strategy);
    
    // 손익 기준 조회
    @Query("SELECT t FROM Trade t WHERE t.user.id = :userId AND t.profitLoss IS NOT NULL ORDER BY t.profitLoss DESC")
    List<Trade> findTopProfitableTrades(@Param("userId") Long userId, Pageable pageable);
    
    @Query("SELECT t FROM Trade t WHERE t.user.id = :userId AND t.profitLoss IS NOT NULL ORDER BY t.profitLoss ASC")
    List<Trade> findTopLossTrades(@Param("userId") Long userId, Pageable pageable);
    
    // 심볼 목록 조회
    @Query("SELECT DISTINCT t.symbol FROM Trade t WHERE t.user.id = :userId ORDER BY t.symbol")
    List<String> findDistinctSymbolsByUserId(@Param("userId") Long userId);
    
    // 배치 업데이트용
    List<Trade> findByUserIdAndSourceAndExecutedAtAfter(
        Long userId,
        TradeSource source,
        LocalDateTime after
    );
}