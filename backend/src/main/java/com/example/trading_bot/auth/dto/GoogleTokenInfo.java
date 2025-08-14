package com.example.trading_bot.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Google OAuth2 토큰 정보 DTO
 */
@Getter
@Setter
@NoArgsConstructor
public class GoogleTokenInfo {
    
    private String sub;           // 사용자 고유 ID
    private String email;         // 이메일
    private String name;          // 이름
    private String picture;       // 프로필 이미지 URL
    private String aud;           // 클라이언트 ID
    
    @JsonProperty("email_verified")
    private boolean emailVerified; // 이메일 인증 여부
}