package com.example.trading_bot.trade.repository;

import com.example.trading_bot.trade.entity.UserApiKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserApiKeyRepository extends JpaRepository<UserApiKey, Long> {
    
    List<UserApiKey> findByUserId(Long userId);
    
    List<UserApiKey> findByUserIdAndExchange(Long userId, String exchange);
    
    List<UserApiKey> findByUserIdAndIsActiveTrue(Long userId);
    
    Optional<UserApiKey> findByIdAndUserId(Long id, Long userId);
    
    Optional<UserApiKey> findByUserIdAndExchangeAndIsActiveTrue(Long userId, String exchange);
    
    boolean existsByUserIdAndApiKey(Long userId, String apiKey);
}