package com.example.trading_bot.auth.repository;

import com.example.trading_bot.auth.entity.ProviderType;
import com.example.trading_bot.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    Optional<User> findByProviderTypeAndProviderId(ProviderType providerType, String providerId);

    Optional<User> findByRefreshToken(String refreshToken);
    
    /**
     * API 키가 있는 활성 사용자 조회
     * 최근 7일 이내 업데이트된 사용자만 조회
     */
    @Query("SELECT DISTINCT u FROM User u " +
           "WHERE EXISTS (SELECT 1 FROM UserApiKey ak " +
           "WHERE ak.user = u AND ak.isActive = true) " +
           "AND u.updatedAt > :recentDate")
    List<User> findActiveUsersWithApiKeys(@Param("recentDate") LocalDateTime recentDate);
    
    /**
     * API 키가 있는 모든 활성 사용자 조회 (정기 동기화용)
     */
    @Query("SELECT DISTINCT u FROM User u " +
           "WHERE EXISTS (SELECT 1 FROM UserApiKey ak " +
           "WHERE ak.user = u AND ak.isActive = true)")
    List<User> findActiveUsersWithApiKeys();
}
