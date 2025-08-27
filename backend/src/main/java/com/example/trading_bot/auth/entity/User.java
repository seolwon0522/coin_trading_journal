package com.example.trading_bot.auth.entity;

import com.example.trading_bot.common.entity.BaseTimeEntity;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 320)
    private String email;

    @JsonIgnore
    @Column(length = 255)
    private String password;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "profile_image_url", length = 500)
    private String profileImageUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider_type", nullable = false)
    private ProviderType providerType;

    @JsonIgnore
    @Column(name = "provider_id")
    private String providerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @JsonIgnore
    @Column(name = "refresh_token", length = 500)
    private String refreshToken;

    @Builder
    public User(String email, String password, String name, String profileImageUrl,
                ProviderType providerType, String providerId, Role role, Boolean isActive) {
        this.email = email;
        this.password = password;
        this.name = name;
        this.profileImageUrl = profileImageUrl;
        this.providerType = providerType;
        this.providerId = providerId;
        this.role = role;
        this.isActive = isActive;
    }

    /**
     * Refresh Token 업데이트
     * 
     * 로그인 시에는 새로운 토큰을, 로그아웃 시에는 null을 설정합니다.
     * 
     * @param refreshToken 새로운 refresh token 또는 null (로그아웃 시)
     */
    public void updateRefreshToken(String refreshToken) {
        this.refreshToken = refreshToken;
    }

    /**
     * Refresh Token 제거 (로그아웃 시 사용)
     */
    public void clearRefreshToken() {
        this.refreshToken = null;
    }

    /**
     * 이름 업데이트
     */
    public void updateName(String name) {
        this.name = name;
    }
    
    /**
     * 프로필 이미지 URL 업데이트
     */
    public void updateProfileImageUrl(String profileImageUrl) {
        this.profileImageUrl = profileImageUrl;
    }
}
