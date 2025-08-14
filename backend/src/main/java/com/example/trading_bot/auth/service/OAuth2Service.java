package com.example.trading_bot.auth.service;

import com.example.trading_bot.auth.config.OAuth2Properties;
import com.example.trading_bot.auth.dto.GoogleTokenInfo;
import com.example.trading_bot.auth.dto.OAuth2UserInfo;
import com.example.trading_bot.auth.entity.ProviderType;
import com.example.trading_bot.auth.exception.OAuth2AuthenticationException;
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
            default -> throw OAuth2AuthenticationException.invalidProvider(providerType.name());
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
                throw OAuth2AuthenticationException.tokenVerificationFailed("Google");
            }

            // 클라이언트 ID 검증 (보안상 중요!)
            String expectedClientId = oauth2Properties.getGoogle().getClientId();
            String actualClientId = tokenInfo.getAud();
            
            if (!expectedClientId.equals(actualClientId)) {
                log.error("클라이언트 ID 불일치 - 보안 위반: 예상={}, 실제={}", 
                         expectedClientId, actualClientId);
                throw OAuth2AuthenticationException.tokenVerificationFailed(
                    "Invalid client ID: Token is not for this application");
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
            throw OAuth2AuthenticationException.tokenVerificationFailed("Google");
        }
    }

    /**
     * Apple OAuth2 토큰 검증
     */
    private OAuth2UserInfo verifyAppleTokenWithRestApi(String appleToken) {
        String appleClientId = oauth2Properties.getApple().getClientId();
        log.info("Apple 로그인 요청 - Client ID: {}", appleClientId);
        throw new OAuth2AuthenticationException("Apple 로그인은 현재 개발 중입니다.");
    }

}
