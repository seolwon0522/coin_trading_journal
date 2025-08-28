package com.example.trading_bot.auth.dto;

import com.example.trading_bot.auth.entity.User;
import lombok.Builder;
import lombok.Getter;

/**
 * 사용자 정보 전달용 DTO
 * 
 * User 엔티티의 안전한 정보만 포함하여 클라이언트에 전달합니다.
 * 민감한 정보(password, refreshToken 등)는 제외됩니다.
 * 
 * @author CryptoTradeManager
 * @since 1.0.0
 */
@Getter
@Builder
public class UserDTO {
    private Long id;
    private String email;
    private String name;
    private String profileImageUrl;
    private String providerType;
    private String role;
    private Boolean isActive;
    
    /**
     * User 엔티티를 UserDTO로 변환
     * 
     * @param user User 엔티티
     * @return UserDTO 객체
     */
    public static UserDTO from(User user) {
        return UserDTO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .profileImageUrl(user.getProfileImageUrl())
                .providerType(user.getProviderType().name())
                .role(user.getRole().name())
                .isActive(user.getIsActive())
                .build();
    }
}