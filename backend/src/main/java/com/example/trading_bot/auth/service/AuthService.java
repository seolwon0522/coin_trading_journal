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
    private final TokenExtractor tokenExtractor;

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
        String refreshToken = tokenExtractor.extractBearerToken(authHeader);

        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw AuthException.invalidToken();
        }

        User user = userRepository.findByRefreshToken(refreshToken)
                .orElseThrow(AuthException::refreshTokenNotFound);

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
        String token = tokenExtractor.extractBearerToken(authHeader);

        if (!jwtTokenProvider.validateToken(token)) {
            throw AuthException.invalidToken();
        }

        Long userId = jwtTokenProvider.getUserIdFromToken(token);
        return userRepository.findById(userId)
                .orElseThrow(AuthException::userNotFound);
    }

    /**
     * 토큰으로부터 로그아웃
     */
    @Transactional
    public void logoutFromToken(String authHeader) {
        String token = tokenExtractor.extractBearerToken(authHeader);

        if (!jwtTokenProvider.validateToken(token)) {
            throw AuthException.invalidToken();
        }

        Long userId = jwtTokenProvider.getUserIdFromToken(token);
        User user = userRepository.findById(userId)
                .orElseThrow(AuthException::userNotFound);

        user.clearRefreshToken();
        userRepository.save(user);
    }

    /**
     * OAuth2 사용자 처리
     */
    @Transactional
    public LoginResponse processOAuth2User(String email, String name, String profileImageUrl,
                                           ProviderType providerType, String providerId) {

        Optional<User> existingUser = userRepository.findByProviderTypeAndProviderId(providerType, providerId);

        User user;
        if (existingUser.isPresent()) {
            user = existingUser.get();
            updateOAuth2UserProfile(user, name, profileImageUrl);
        } else {
            user = createOAuth2User(email, name, profileImageUrl, providerType, providerId);
        }

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
    
    /**
     * 토큰 검증 및 사용자 조회 통합 메서드
     * 
     * @param token JWT 토큰
     * @return 검증된 사용자
     * @throws AuthException 토큰이 유효하지 않거나 사용자를 찾을 수 없는 경우
     */
    private User validateTokenAndGetUser(String token) {
        if (!jwtTokenProvider.validateToken(token)) {
            throw AuthException.invalidToken();
        }
        
        Long userId = jwtTokenProvider.getUserIdFromToken(token);
        return userRepository.findById(userId)
                .orElseThrow(AuthException::userNotFound);
    }

    @Transactional
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

    @Transactional
    public void updateOAuth2UserProfile(User user, String name, String profileImageUrl) {
        user.updateProfile(name, profileImageUrl);
        userRepository.save(user);
    }

    @Transactional
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
