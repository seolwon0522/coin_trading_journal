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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.lang.reflect.Field;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

/**
 * AuthService 단위 테스트
 * TokenValidator를 활용한 최적화된 인증 서비스 테스트
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService 단위 테스트")
public class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    
    @Mock
    private PasswordEncoder passwordEncoder;
    
    @Mock
    private JwtTokenProvider jwtTokenProvider;
    
    @Mock
    private TokenValidator tokenValidator;
    
    @InjectMocks
    private AuthService authService;
    
    private User testUser;
    private String validAuthHeader;
    private String accessToken;
    private String refreshToken;
    
    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .email("test@example.com")
                .name("Test User")
                .password("encodedPassword")
                .providerType(ProviderType.LOCAL)
                .role(Role.USER)
                .isActive(true)
                .build();
        // Use reflection to set ID for testing
        setId(testUser, 1L);
                
        validAuthHeader = "Bearer valid.jwt.token";
        accessToken = "valid.access.token";
        refreshToken = "valid.refresh.token";
    }

    @Test
    @DisplayName("일반 회원가입 성공")
    void registerLocalUser_Success() {
        // given
        String email = "test@example.com";
        String password = "password123!";
        String name = "테스트유저";
        String encodedPassword = "encodedPassword123";
        
        given(userRepository.existsByEmail(email)).willReturn(false);
        given(passwordEncoder.encode(password)).willReturn(encodedPassword);
        given(userRepository.save(any(User.class))).willReturn(testUser);
        
        // when
        User result = authService.registerLocalUser(email, password, name);
        
        // then
        assertThat(result).isEqualTo(testUser);
        verify(userRepository).existsByEmail(email);
        verify(passwordEncoder).encode(password);
        verify(userRepository).save(any(User.class));
    }
    
    @Test
    @DisplayName("이미 존재하는 이메일로 회원가입 시 예외 발생")
    void registerLocalUser_EmailAlreadyExists() {
        // given
        String email = "test@example.com";
        String password = "password123!";
        String name = "테스트유저";
        
        given(userRepository.existsByEmail(email)).willReturn(true);
        
        // when & then
        assertThatThrownBy(() -> authService.registerLocalUser(email, password, name))
                .isInstanceOf(UserAlreadyExistsException.class);
        
        verify(userRepository).existsByEmail(email);
        verifyNoMoreInteractions(passwordEncoder, userRepository);
    }
    
    @Test
    @DisplayName("일반 로그인 성공")
    void loginLocal_Success() {
        // given
        String email = "test@example.com";
        String password = "password123!";
        
        given(userRepository.findByEmail(email)).willReturn(Optional.of(testUser));
        given(passwordEncoder.matches(password, testUser.getPassword())).willReturn(true);
        given(jwtTokenProvider.createAccessToken(anyLong(), anyString(), anyString())).willReturn(accessToken);
        given(jwtTokenProvider.createRefreshToken(anyLong())).willReturn(refreshToken);
        given(userRepository.save(any(User.class))).willReturn(testUser);
        
        // when
        LoginResponse result = authService.loginLocal(email, password);
        
        // then
        assertThat(result.getAccessToken()).isEqualTo(accessToken);
        assertThat(result.getRefreshToken()).isEqualTo(refreshToken);
        assertThat(result.getUser()).isEqualTo(testUser);
    }
    
    @Test
    @DisplayName("잘못된 비밀번호로 로그인 시 예외 발생")
    void loginLocal_InvalidPassword() {
        // given
        String email = "test@example.com";
        String password = "wrongPassword";
        
        given(userRepository.findByEmail(email)).willReturn(Optional.of(testUser));
        given(passwordEncoder.matches(password, testUser.getPassword())).willReturn(false);
        
        // when & then
        assertThatThrownBy(() -> authService.loginLocal(email, password))
                .isInstanceOf(AuthException.class);
    }
    
    @Test
    @DisplayName("존재하지 않는 사용자로 로그인 시 예외 발생")
    void loginLocal_UserNotFound() {
        // given
        String email = "nonexistent@example.com";
        String password = "password123!";
        
        given(userRepository.findByEmail(email)).willReturn(Optional.empty());
        
        // when & then
        assertThatThrownBy(() -> authService.loginLocal(email, password))
                .isInstanceOf(AuthException.class);
    }
    
    @Test
    @DisplayName("토큰 갱신 성공")
    void refreshToken_Success() {
        // given
        String newAccessToken = "new.access.token";
        testUser.updateRefreshToken(refreshToken);
        
        given(tokenValidator.extractBearerToken(validAuthHeader)).willReturn(refreshToken);
        given(tokenValidator.validateRefreshTokenAndGetUser(refreshToken)).willReturn(testUser);
        given(jwtTokenProvider.createAccessToken(anyLong(), anyString(), anyString())).willReturn(newAccessToken);
        
        // when
        TokenResponse result = authService.refreshToken(validAuthHeader);
        
        // then
        assertThat(result.getAccessToken()).isEqualTo(newAccessToken);
        assertThat(result.getRefreshToken()).isEqualTo(refreshToken);
        verify(tokenValidator).extractBearerToken(validAuthHeader);
        verify(tokenValidator).validateRefreshTokenAndGetUser(refreshToken);
    }
    
    @Test
    @DisplayName("토큰으로부터 현재 사용자 정보 조회 성공")
    void getCurrentUserFromToken_Success() {
        // given
        given(tokenValidator.validateTokenAndGetUser(validAuthHeader)).willReturn(testUser);
        
        // when
        User result = authService.getCurrentUserFromToken(validAuthHeader);
        
        // then
        assertThat(result).isEqualTo(testUser);
        verify(tokenValidator).validateTokenAndGetUser(validAuthHeader);
    }
    
    @Test
    @DisplayName("토큰으로부터 로그아웃 성공")
    void logoutFromToken_Success() {
        // given
        testUser.updateRefreshToken(refreshToken);
        given(tokenValidator.validateTokenAndGetUser(validAuthHeader)).willReturn(testUser);
        given(userRepository.save(any(User.class))).willReturn(testUser);
        
        // when
        authService.logoutFromToken(validAuthHeader);
        
        // then
        verify(tokenValidator).validateTokenAndGetUser(validAuthHeader);
        verify(userRepository).save(testUser);
        assertThat(testUser.getRefreshToken()).isNull();
    }
    
    @Test
    @DisplayName("OAuth2 사용자 처리 - 신규 사용자")
    void processOAuth2User_NewUser() {
        // given
        String email = "oauth@example.com";
        String name = "OAuth User";
        String profileImageUrl = "https://example.com/profile.jpg";
        ProviderType providerType = ProviderType.GOOGLE;
        String providerId = "google123";
        
        User newUser = User.builder()
                .email(email)
                .name(name)
                .profileImageUrl(profileImageUrl)
                .providerType(providerType)
                .providerId(providerId)
                .role(Role.USER)
                .isActive(true)
                .build();
        setId(newUser, 2L);
        
        given(userRepository.findByProviderTypeAndProviderId(providerType, providerId))
                .willReturn(Optional.empty());
        given(userRepository.save(any(User.class))).willReturn(newUser);
        given(jwtTokenProvider.createAccessToken(anyLong(), anyString(), anyString())).willReturn(accessToken);
        given(jwtTokenProvider.createRefreshToken(anyLong())).willReturn(refreshToken);
        
        // when
        LoginResponse result = authService.processOAuth2User(email, name, profileImageUrl, providerType, providerId);
        
        // then
        assertThat(result.getAccessToken()).isEqualTo(accessToken);
        assertThat(result.getRefreshToken()).isEqualTo(refreshToken);
        assertThat(result.getUser()).isEqualTo(newUser);
    }
    
    @Test
    @DisplayName("OAuth2 사용자 처리 - 기존 사용자 프로필 업데이트")
    void processOAuth2User_ExistingUserProfileUpdate() {
        // given
        String email = "oauth@example.com";
        String newName = "Updated OAuth User";
        String newProfileImageUrl = "https://example.com/new-profile.jpg";
        ProviderType providerType = ProviderType.GOOGLE;
        String providerId = "google123";
        
        User existingUser = User.builder()
                .email(email)
                .name("Old Name")
                .profileImageUrl("https://example.com/old-profile.jpg")
                .providerType(providerType)
                .providerId(providerId)
                .role(Role.USER)
                .isActive(true)
                .build();
        setId(existingUser, 2L);
        
        given(userRepository.findByProviderTypeAndProviderId(providerType, providerId))
                .willReturn(Optional.of(existingUser));
        given(userRepository.save(any(User.class))).willReturn(existingUser);
        given(jwtTokenProvider.createAccessToken(anyLong(), anyString(), anyString())).willReturn(accessToken);
        given(jwtTokenProvider.createRefreshToken(anyLong())).willReturn(refreshToken);
        
        // when
        LoginResponse result = authService.processOAuth2User(email, newName, newProfileImageUrl, providerType, providerId);
        
        // then
        assertThat(result.getAccessToken()).isEqualTo(accessToken);
        assertThat(result.getUser().getName()).isEqualTo(newName);
        assertThat(result.getUser().getProfileImageUrl()).isEqualTo(newProfileImageUrl);
    }
    
    @Test
    @DisplayName("사용자 ID로 조회 성공")
    void findById_Success() {
        // given
        Long userId = 1L;
        given(userRepository.findById(userId)).willReturn(Optional.of(testUser));
        
        // when
        User result = authService.findById(userId);
        
        // then
        assertThat(result).isEqualTo(testUser);
        verify(userRepository).findById(userId);
    }
    
    @Test
    @DisplayName("존재하지 않는 사용자 ID로 조회 시 예외 발생")
    void findById_UserNotFound() {
        // given
        Long userId = 999L;
        given(userRepository.findById(userId)).willReturn(Optional.empty());
        
        // when & then
        assertThatThrownBy(() -> authService.findById(userId))
                .isInstanceOf(AuthException.class);
    }
    
    @Test
    @DisplayName("사용자 프로필 업데이트 - 변경사항 있음")
    void updateUserProfileIfNeeded_HasChanges() {
        // given
        String newName = "Updated Name";
        String newProfileImageUrl = "https://example.com/new-profile.jpg";
        
        given(userRepository.save(any(User.class))).willReturn(testUser);
        
        // when
        authService.updateUserProfileIfNeeded(testUser, newName, newProfileImageUrl);
        
        // then
        assertThat(testUser.getName()).isEqualTo(newName);
        assertThat(testUser.getProfileImageUrl()).isEqualTo(newProfileImageUrl);
        verify(userRepository).save(testUser);
    }
    
    @Test
    @DisplayName("사용자 프로필 업데이트 - 변경사항 없음")
    void updateUserProfileIfNeeded_NoChanges() {
        // given
        String sameName = testUser.getName();
        String sameProfileImageUrl = testUser.getProfileImageUrl();
        
        // when
        authService.updateUserProfileIfNeeded(testUser, sameName, sameProfileImageUrl);
        
        // then
        verifyNoInteractions(userRepository);
    }
    
    // 테스트 헬퍼 메서드
    private void setId(User user, Long id) {
        try {
            Field idField = User.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(user, id);
        } catch (Exception e) {
            throw new RuntimeException("Failed to set ID for test", e);
        }
    }
}