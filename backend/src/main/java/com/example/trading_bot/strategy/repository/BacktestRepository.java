package com.example.trading_bot.strategy.repository;

import com.example.trading_bot.strategy.entity.Backtest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * 백테스트 Repository
 */
@Repository
public interface BacktestRepository extends JpaRepository<Backtest, Long> {

    /**
     * 전략 ID로 백테스트 조회 (페이징)
     */
    Page<Backtest> findByStrategyId(Long strategyId, Pageable pageable);

    /**
     * 사용자 ID로 백테스트 조회 (전략을 통한 조인)
     */
    @Query("SELECT b FROM Backtest b WHERE b.strategy.user.id = :userId")
    Page<Backtest> findByUserId(@Param("userId") Long userId, Pageable pageable);

    /**
     * 사용자와 백테스트 ID로 조회 (권한 체크용)
     */
    @Query("SELECT b FROM Backtest b WHERE b.id = :backtestId AND b.strategy.user.id = :userId")
    Backtest findByIdAndUserId(@Param("backtestId") Long backtestId, @Param("userId") Long userId);
}
