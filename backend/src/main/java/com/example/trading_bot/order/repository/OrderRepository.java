package com.example.trading_bot.order.repository;

import com.example.trading_bot.order.entity.Order;
import com.example.trading_bot.order.entity.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    
    List<Order> findByUserIdOrderByCreatedAtDesc(Long userId);
    
    List<Order> findByUserIdAndStatusOrderByCreatedAtDesc(Long userId, OrderStatus status);
    
    List<Order> findByUserIdAndSymbolOrderByCreatedAtDesc(Long userId, String symbol);
    
    Optional<Order> findByBinanceOrderId(String binanceOrderId);
    
    Optional<Order> findByIdAndUserId(Long id, Long userId);
    
    @Query("SELECT o FROM Order o WHERE o.user.id = :userId AND o.status IN :statuses ORDER BY o.createdAt DESC")
    List<Order> findByUserIdAndStatusIn(@Param("userId") Long userId, @Param("statuses") List<OrderStatus> statuses);
    
    @Query("SELECT o FROM Order o WHERE o.user.id = :userId AND o.createdAt BETWEEN :startDate AND :endDate ORDER BY o.createdAt DESC")
    List<Order> findByUserIdAndDateRange(
        @Param("userId") Long userId,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );
    
    // 열린 주문 조회 (PENDING, SUBMITTED, PARTIALLY_FILLED)
    @Query("SELECT o FROM Order o WHERE o.user.id = :userId AND o.status IN ('PENDING', 'SUBMITTED', 'PARTIALLY_FILLED') ORDER BY o.createdAt DESC")
    List<Order> findOpenOrdersByUserId(@Param("userId") Long userId);
    
    @Query("SELECT COUNT(o) FROM Order o WHERE o.user.id = :userId AND o.status IN ('PENDING', 'SUBMITTED', 'PARTIALLY_FILLED')")
    long countOpenOrdersByUserId(@Param("userId") Long userId);
}