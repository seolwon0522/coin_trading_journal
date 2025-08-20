package com.example.trading_bot.auth.service;

import com.example.trading_bot.auth.dto.LoginResponse;
import com.example.trading_bot.auth.dto.TokenResponse;
import com.example.trading_bot.auth.entity.ProviderType;
import com.example.trading_bot.auth.entity.Role;
import com.example.trading_bot.auth.entity.User;
import com.example.trading_bot.auth.exception.AuthException;
import com.example.trading_bot.auth.exception.UserAlreadyExistsException;
import com.example.trading_bot.auth.jwt.JwtTokenProvider;
import com.example.trading_bot.auth.repository.UserRepository;
import com.example.trading_bot.auth.util.TokenValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final TokenValidator tokenValidator;

    @Transactional
    public User registerLocalUser(String email, String password, String name) {
        if (userRepository.existsByEmail(email)) {
            throw new UserAlreadyExistsException(email);
        }

        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(password))
                .name(name)
                .providerType(ProviderType.LOCAL)
                .role(Role.USER)
                .isActive(true)
                .build();

        return userRepository.save(user);
    }

    @Transactional
    public LoginResponse loginLocal(String email, String password) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(AuthException::userNotFound);

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw AuthException.invalidCredentials();
        }

        return generateTokenResponse(user);
    }

    @Transactional
    public TokenResponse refreshToken(String authHeader) {
        String refreshToken = tokenValidator.extractBearerToken(authHeader);
        User user = tokenValidator.validateRefreshTokenAndGetUser(refreshToken);

        String newAccessToken = jwtTokenProvider.createAccessToken(
                user.getId(), user.getEmail(), user.getRole().name());

        return TokenResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(refreshToken)
                .build();
    }

    public User getCurrentUserFromToken(String authHeader) {
        return tokenValidator.validateTokenAndGetUser(authHeader);
    }

    @Transactional
    public void logoutFromToken(String authHeader) {
        User user = tokenValidator.validateTokenAndGetUser(authHeader);
        user.clearRefreshToken();
        userRepository.save(user);
    }

    @Transactional
    public LoginResponse processOAuth2User(String email, String name, String profileImageUrl,
                                           ProviderType providerType, String providerId) {
        User user = userRepository.findByProviderTypeAndProviderId(providerType, providerId)
                .orElseGet(() -> createOAuth2User(email, name, profileImageUrl, providerType, providerId));
        
        // 프로필 업데이트 (변경사항이 있을 경우만)
        boolean updated = false;
        if (name != null && !name.equals(user.getName())) {
            user.updateName(name);
            updated = true;
        }
        if (profileImageUrl != null && !profileImageUrl.equals(user.getProfileImageUrl())) {
            user.updateProfileImageUrl(profileImageUrl);
            updated = true;
        }
        if (updated) {
            userRepository.save(user);
        }
        
        return generateTokenResponse(user);
    }

    public User findById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(AuthException::userNotFound);
    }

    // === Private Helper Methods ===
    
    private User createOAuth2User(String email, String name, String profileImageUrl,
                                  ProviderType providerType, String providerId) {
        User user = User.builder()
                .email(email)
                .name(name)
                .profileImageUrl(profileImageUrl)
                .providerType(providerType)
                .providerId(providerId)
                .role(Role.USER)
                .isActive(true)
                .build();

        return userRepository.save(user);
    }

    private LoginResponse generateTokenResponse(User user) {
        String accessToken = jwtTokenProvider.createAccessToken(
                user.getId(), user.getEmail(), user.getRole().name());
        String refreshToken = jwtTokenProvider.createRefreshToken(user.getId());

        user.updateRefreshToken(refreshToken);
        userRepository.save(user);

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .user(user)
                .build();
    }
}