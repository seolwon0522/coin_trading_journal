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

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final TokenValidator tokenValidator;

    /**
     * 일반 회원가입
     */
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

    /**
     * 일반 로그인
     */
    @Transactional
    public LoginResponse loginLocal(String email, String password) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(AuthException::userNotFound);

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw AuthException.invalidCredentials();
        }

        return generateTokenResponse(user);
    }

    /**
     * 토큰 갱신
     */
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

    /**
     * 토큰으로부터 현재 사용자 정보 조회
     */
    @Transactional(readOnly = true)
    public User getCurrentUserFromToken(String authHeader) {
        return tokenValidator.validateTokenAndGetUser(authHeader);
    }

    /**
     * 토큰으로부터 로그아웃
     */
    @Transactional
    public void logoutFromToken(String authHeader) {
        User user = tokenValidator.validateTokenAndGetUser(authHeader);
        
        user.clearRefreshToken();
        userRepository.save(user);
    }

    /**
     * OAuth2 사용자 처리
     * - 기존 사용자: 프로필 업데이트
     * - 신규 사용자: 새로 생성
     */
    @Transactional
    public LoginResponse processOAuth2User(String email, String name, String profileImageUrl,
                                           ProviderType providerType, String providerId) {
        // 1. 사용자 찾기 또는 생성
        User user = findOrCreateOAuth2User(email, name, profileImageUrl, providerType, providerId);
        
        // 2. 기존 사용자인 경우 프로필 업데이트 확인
        if (isExistingUser(user, providerId)) {
            updateUserProfileIfNeeded(user, name, profileImageUrl);
        }
        
        // 3. 토큰 생성 및 반환
        return generateTokenResponse(user);
    }

    /**
     * 사용자 ID로 조회
     */
    @Transactional(readOnly = true)
    public User findById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(AuthException::userNotFound);
    }

    // Private 헬퍼 메서드들
    

    protected User createOAuth2User(String email, String name, String profileImageUrl,
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

    /**
     * OAuth2 사용자 찾기 또는 생성
     */
    private User findOrCreateOAuth2User(String email, String name, String profileImageUrl,
                                        ProviderType providerType, String providerId) {
        return userRepository.findByProviderTypeAndProviderId(providerType, providerId)
                .orElseGet(() -> createOAuth2User(email, name, profileImageUrl, providerType, providerId));
    }
    
    /**
     * 사용자 프로필 업데이트 (변경사항이 있을 때만)
     */
    public void updateUserProfileIfNeeded(User user, String name, String profileImageUrl) {
        boolean needsUpdate = false;
        
        // 이름 변경 확인
        if (shouldUpdateName(user.getName(), name)) {
            user.updateName(name);
            needsUpdate = true;
        }
        
        // 프로필 이미지 변경 확인
        if (shouldUpdateProfileImage(user.getProfileImageUrl(), profileImageUrl)) {
            user.updateProfileImageUrl(profileImageUrl);
            needsUpdate = true;
        }
        
        // 실제 변경사항이 있을 때만 DB 저장
        if (needsUpdate) {
            userRepository.save(user);
        }
    }
    
    /**
     * 이름 업데이트 필요 여부 확인
     */
    private boolean shouldUpdateName(String currentName, String newName) {
        return newName != null && !newName.equals(currentName);
    }
    
    /**
     * 프로필 이미지 업데이트 필요 여부 확인
     */
    private boolean shouldUpdateProfileImage(String currentImageUrl, String newImageUrl) {
        return newImageUrl != null && !newImageUrl.equals(currentImageUrl);
    }
    
    /**
     * 기존 사용자 여부 확인
     */
    private boolean isExistingUser(User user, String providerId) {
        return user.getProviderId() != null && user.getProviderId().equals(providerId);
    }

    protected LoginResponse generateTokenResponse(User user) {
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
