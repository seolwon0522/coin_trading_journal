package com.example.trading_bot.auth.service;

import com.example.trading_bot.auth.config.OAuth2Properties;
import com.example.trading_bot.auth.dto.OAuth2UserInfo;
import com.example.trading_bot.auth.entity.ProviderType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.RestClientException;

@Slf4j
@Service
@RequiredArgsConstructor
public class OAuth2Service {

    private final OAuth2Properties oauth2Properties;
    private final RestTemplate restTemplate;

    /**
     * OAuth2 토큰 검증 (Provider별 분기 처리)
     */
    public OAuth2UserInfo verifyOAuth2Token(String token, ProviderType providerType) {
        return switch (providerType) {
            case GOOGLE -> verifyGoogleTokenWithRestApi(token);
            case APPLE -> verifyAppleTokenWithRestApi(token);
            default -> throw new IllegalArgumentException("지원하지 않는 OAuth2 Provider입니다: " + providerType);
        };
    }

    /**
     * Google OAuth2 토큰 검증 - REST API 방식
     */
    private OAuth2UserInfo verifyGoogleTokenWithRestApi(String googleToken) {
        try {
            String url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + googleToken;

            GoogleTokenInfo tokenInfo = restTemplate.getForObject(url, GoogleTokenInfo.class);

            if (tokenInfo == null) {
                throw new IllegalArgumentException("Google 토큰 검증에 실패했습니다.");
            }

            String googleClientId = oauth2Properties.getGoogle().getClientId();
            if (!googleClientId.equals(tokenInfo.getAud())) {
                log.warn("클라이언트 ID 불일치: 예상={}, 실제={}", googleClientId, tokenInfo.getAud());
            }

            return OAuth2UserInfo.builder()
                    .id(tokenInfo.getSub())
                    .email(tokenInfo.getEmail())
                    .name(tokenInfo.getName())
                    .picture(tokenInfo.getPicture())
                    .emailVerified(tokenInfo.isEmailVerified())
                    .build();

        } catch (RestClientException e) {
            log.error("Google 토큰 검증 실패: {}", e.getMessage());
            throw new IllegalArgumentException("Google 토큰이 유효하지 않습니다.");
        }
    }

    /**
     * Apple OAuth2 토큰 검증
     */
    private OAuth2UserInfo verifyAppleTokenWithRestApi(String appleToken) {
        String appleClientId = oauth2Properties.getApple().getClientId();
        log.info("Apple 로그인 요청 - Client ID: {}", appleClientId);
        throw new IllegalArgumentException("Apple 로그인은 현재 개발 중입니다.");
    }

    /**
     * Google 토큰 정보 응답 DTO
     */
    private static class GoogleTokenInfo {
        private String sub;
        private String email;
        private String name;
        private String picture;
        private String aud;
        private boolean email_verified;

        // Getters and Setters
        public String getSub() { return sub; }
        public void setSub(String sub) { this.sub = sub; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getPicture() { return picture; }
        public void setPicture(String picture) { this.picture = picture; }

        public String getAud() { return aud; }
        public void setAud(String aud) { this.aud = aud; }

        public boolean isEmailVerified() { return email_verified; }
        public void setEmail_verified(boolean email_verified) { this.email_verified = email_verified; }
    }
}
