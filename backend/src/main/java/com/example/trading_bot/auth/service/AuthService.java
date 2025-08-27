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
import com.example.trading_bot.auth.util.TokenExtractor;
import com.example.trading_bot.auth.util.TokenValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final TokenValidator tokenValidator;
    private final TokenExtractor tokenExtractor;
    
    @org.springframework.beans.factory.annotation.Value("${jwt.access-token-validity-in-seconds}")
    private long accessTokenValidityInSeconds;

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
        String oldRefreshToken = tokenExtractor.extractBearerToken(authHeader);
        
        // 디버깅용 로그 추가
        log.debug("Refresh token request - authHeader: {}", authHeader);
        log.debug("Extracted refresh token: {}", oldRefreshToken);
        
        // 기존 refresh token으로 사용자 조회 및 검증
        User user = tokenValidator.validateRefreshTokenAndGetUser(oldRefreshToken);
        
        // 새로운 토큰 쌍 생성 (Rolling Refresh Token 전략)
        String newAccessToken = jwtTokenProvider.createAccessToken(
                user.getId(), user.getEmail(), user.getRole().name());
        String newRefreshToken = jwtTokenProvider.createRefreshToken(user.getId());
        
        // DB에 새로운 refresh token 저장
        user.updateRefreshToken(newRefreshToken);
        userRepository.save(user);
        
        return TokenResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .expiresIn(accessTokenValidityInSeconds)
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

    /**
     * OAuth2 사용자 처리 (로그인/회원가입)
     * 기존 사용자는 프로필 업데이트, 신규 사용자는 생성
     * 
     * @param email 사용자 이메일
     * @param name 사용자 이름
     * @param profileImageUrl 프로필 이미지 URL
     * @param providerType OAuth2 제공자 타입
     * @param providerId OAuth2 제공자별 사용자 ID
     * @return 로그인 응답 (토큰 포함)
     */
    @Transactional
    public LoginResponse processOAuth2User(String email, String name, String profileImageUrl,
                                           ProviderType providerType, String providerId) {
        // 기존 사용자 조회 또는 신규 생성
        User user = findOrCreateOAuth2User(providerType, providerId, email, name, profileImageUrl);
        
        // 프로필 정보 업데이트 (필요한 경우)
        updateUserProfileIfChanged(user, name, profileImageUrl);
        
        // 토큰 생성 및 응답
        return generateTokenResponse(user);
    }

    /**
     * 사용자 ID로 조회
     * 
     * @param userId 사용자 ID
     * @return 사용자 엔티티
     * @throws AuthException 사용자를 찾을 수 없는 경우
     */
    public User findById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(AuthException::userNotFound);
    }

    // === Private Helper Methods ===
    
    /**
     * OAuth2 사용자 조회 또는 생성
     */
    private User findOrCreateOAuth2User(ProviderType providerType, String providerId, 
                                        String email, String name, String profileImageUrl) {
        return userRepository.findByProviderTypeAndProviderId(providerType, providerId)
                .orElseGet(() -> createOAuth2User(email, name, profileImageUrl, providerType, providerId));
    }
    
    /**
     * 사용자 프로필 변경사항 확인 및 업데이트
     */
    private void updateUserProfileIfChanged(User user, String name, String profileImageUrl) {
        boolean hasChanges = false;
        
        // 이름 변경 확인
        if (hasNameChanged(user, name)) {
            user.updateName(name);
            hasChanges = true;
        }
        
        // 프로필 이미지 변경 확인
        if (hasProfileImageChanged(user, profileImageUrl)) {
            user.updateProfileImageUrl(profileImageUrl);
            hasChanges = true;
        }
        
        // 변경사항이 있을 경우에만 저장
        if (hasChanges) {
            userRepository.save(user);
        }
    }
    
    /**
     * 이름 변경 여부 확인
     */
    private boolean hasNameChanged(User user, String newName) {
        return newName != null && !newName.equals(user.getName());
    }
    
    /**
     * 프로필 이미지 변경 여부 확인
     */
    private boolean hasProfileImageChanged(User user, String newImageUrl) {
        return newImageUrl != null && !newImageUrl.equals(user.getProfileImageUrl());
    }
    
    /**
     * 신규 OAuth2 사용자 생성
     */
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
                .expiresIn(accessTokenValidityInSeconds)
                .user(user)
                .build();
    }
}