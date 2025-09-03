package com.example.trading_bot.portfolio.repository;

import com.example.trading_bot.portfolio.entity.Portfolio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PortfolioRepository extends JpaRepository<Portfolio, Long> {
    
    /**
     * 사용자의 모든 포트폴리오 조회
     */
    List<Portfolio> findByUserIdOrderByCurrentValueDesc(Long userId);
    
    /**
     * 사용자의 특정 심볼 포트폴리오 조회
     */
    Optional<Portfolio> findByUserIdAndSymbol(Long userId, String symbol);
    
    /**
     * 사용자의 특정 자산 포트폴리오 조회
     */
    Optional<Portfolio> findByUserIdAndAsset(Long userId, String asset);
    
    /**
     * 사용자의 포트폴리오 존재 여부 확인
     */
    boolean existsByUserIdAndSymbol(Long userId, String symbol);
    
    /**
     * 사용자의 총 평가 금액 계산
     */
    @Query("SELECT SUM(p.currentValue) FROM Portfolio p WHERE p.user.id = :userId")
    Double getTotalValueByUserId(@Param("userId") Long userId);
    
    /**
     * 사용자의 총 투자 금액 계산
     */
    @Query("SELECT SUM(p.totalInvested) FROM Portfolio p WHERE p.user.id = :userId")
    Double getTotalInvestedByUserId(@Param("userId") Long userId);
    
    /**
     * 보유 수량이 있는 포트폴리오만 조회
     */
    @Query("SELECT p FROM Portfolio p WHERE p.user.id = :userId AND p.quantity > 0 ORDER BY p.currentValue DESC")
    List<Portfolio> findActivePortfoliosByUserId(@Param("userId") Long userId);
    
    /**
     * 사용자의 모든 포트폴리오 삭제
     */
    void deleteByUserId(Long userId);
    
    /**
     * 사용자의 포트폴리오 존재 여부 확인
     */
    boolean existsByUserId(Long userId);
}