package com.example.trading_bot.auth.repository;

import com.example.trading_bot.auth.entity.ProviderType;
import com.example.trading_bot.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    Optional<User> findByProviderTypeAndProviderId(ProviderType providerType, String providerId);

    Optional<User> findByRefreshToken(String refreshToken);
}
