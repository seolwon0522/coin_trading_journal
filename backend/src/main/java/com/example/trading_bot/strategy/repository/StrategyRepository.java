package com.example.trading_bot.strategy.repository;

import com.example.trading_bot.strategy.entity.Strategy;
import com.example.trading_bot.strategy.entity.StrategyType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 전략 Repository
 */
@Repository
public interface StrategyRepository extends JpaRepository<Strategy, Long> {

    /**
     * 사용자별 전략 목록 조회
     */
    @Query("SELECT s FROM Strategy s WHERE s.user.id = :userId")
    Page<Strategy> findByUserId(@Param("userId") Long userId, Pageable pageable);

    /**
     * 사용자별 활성화된 전략 목록 조회
     */
    @Query("SELECT s FROM Strategy s WHERE s.user.id = :userId AND s.active = :active")
    List<Strategy> findByUserIdAndActive(@Param("userId") Long userId, @Param("active") boolean active);

    /**
     * 특정 사용자의 특정 전략 조회
     */
    @Query("SELECT s FROM Strategy s WHERE s.id = :id AND s.user.id = :userId")
    Optional<Strategy> findByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);

    /**
     * 전략 타입별 조회
     */
    @Query("SELECT s FROM Strategy s WHERE s.user.id = :userId AND s.type = :type")
    List<Strategy> findByUserIdAndType(@Param("userId") Long userId, @Param("type") StrategyType type);

    /**
     * 심볼별 전략 조회
     */
    @Query("SELECT s FROM Strategy s WHERE s.user.id = :userId AND s.symbol = :symbol")
    List<Strategy> findByUserIdAndSymbol(@Param("userId") Long userId, @Param("symbol") String symbol);

    /**
     * Nautilus Strategy ID로 조회
     */
    Optional<Strategy> findByNautilusStrategyId(String nautilusStrategyId);

    /**
     * 활성화된 전략 수 조회
     */
    @Query("SELECT COUNT(s) FROM Strategy s WHERE s.user.id = :userId AND s.active = true")
    long countActiveStrategiesByUserId(@Param("userId") Long userId);

    /**
     * 활성화된 전략 수 카운트 (Integer 반환)
     */
    @Query("SELECT COUNT(s) FROM Strategy s WHERE s.user.id = :userId AND s.active = :active")
    Integer countByUserIdAndActive(@Param("userId") Long userId, @Param("active") boolean active);

    /**
     * 전체 전략의 평균 수익률 조회
     */
    @Query("SELECT AVG(s.totalReturn) FROM Strategy s WHERE s.user.id = :userId AND s.totalReturn IS NOT NULL")
    Double getAverageReturnByUserId(@Param("userId") Long userId);

    /**
     * 사용자별 전략 존재 여부 확인
     */
    @Query("SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END FROM Strategy s WHERE s.id = :id AND s.user.id = :userId")
    boolean existsByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);

    /**
     * 중복 전략 확인 (같은 사용자, 같은 이름)
     */
    @Query("SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END FROM Strategy s WHERE s.user.id = :userId AND s.name = :name")
    boolean existsByUserIdAndName(@Param("userId") Long userId, @Param("name") String name);

    /**
     * 모든 활성화된 전략 조회 (시스템 모니터링용)
     */
    @Query("SELECT s FROM Strategy s WHERE s.active = true")
    List<Strategy> findAllActiveStrategies();

    /**
     * 특정 기간 동안 거래가 없는 전략 조회
     */
    @Query(value = "SELECT * FROM strategies s WHERE s.is_active = true " +
           "AND (s.last_trade_at IS NULL OR s.last_trade_at < CURRENT_TIMESTAMP - INTERVAL '1 day')",
           nativeQuery = true)
    List<Strategy> findInactiveStrategies();
}