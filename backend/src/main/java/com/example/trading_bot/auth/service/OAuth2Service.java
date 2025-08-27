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

/**
 * OAuth2 인증 서비스
 * 
 * Google, Apple 등의 OAuth2 제공자의 토큰을 검증하고 사용자 정보를 추출합니다.
 * 각 제공자별 토큰 검증 로직을 분리하여 관리합니다.
 * 
 * @author CryptoTradeManager
 * @since 1.0.0
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OAuth2Service {

    private final OAuth2Properties oauth2Properties;
    private final RestTemplate restTemplate;

    /**
     * OAuth2 토큰 검증 (Provider별 분기 처리)
     * 
     * 제공자별로 적절한 검증 메소드를 호출하여 토큰을 검증합니다.
     * 
     * @param token OAuth2 ID 토큰
     * @param providerType OAuth2 제공자 타입 (GOOGLE, APPLE 등)
     * @return 검증된 사용자 정보
     * @throws OAuth2AuthenticationException 토큰 검증 실패 시
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
     * 
     * Google의 tokeninfo 엔드포인트를 통해 ID 토큰을 검증하고
     * 클라이언트 ID가 일치하는지 확인합니다.
     * 
     * @param googleToken Google ID 토큰
     * @return 검증된 Google 사용자 정보
     * @throws OAuth2AuthenticationException 토큰 검증 실패 또는 클라이언트 ID 불일치 시
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
     * 
     * Apple의 OAuth2 토큰을 검증합니다. (현재 개발 중)
     * 
     * @param appleToken Apple ID 토큰
     * @return 검증된 Apple 사용자 정보
     * @throws OAuth2AuthenticationException Apple 로그인이 아직 지원되지 않음
     */
    private OAuth2UserInfo verifyAppleTokenWithRestApi(String appleToken) {
        String appleClientId = oauth2Properties.getApple().getClientId();
        log.info("Apple 로그인 요청 - Client ID: {}", appleClientId);
        throw new OAuth2AuthenticationException("Apple 로그인은 현재 개발 중입니다.");
    }

}
