package com.example.trading_bot.auth.controller;

import com.example.trading_bot.auth.dto.LoginResponse;
import com.example.trading_bot.auth.dto.OAuth2LoginRequest;
import com.example.trading_bot.auth.dto.OAuth2UserInfo;
import com.example.trading_bot.auth.service.AuthService;
import com.example.trading_bot.auth.service.OAuth2Service;
import com.example.trading_bot.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/oauth2")
@RequiredArgsConstructor
public class OAuth2Controller {

    private final AuthService authService;
    private final OAuth2Service oAuth2Service;

    /**
     * 통합 OAuth2 로그인 - Google, Apple 모두 처리
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> oauth2Login(
            @Valid @RequestBody OAuth2LoginRequest request) {

        OAuth2UserInfo userInfo = oAuth2Service.verifyOAuth2Token(
                request.getToken(),
                request.getProviderType()
        );

        LoginResponse response = authService.processOAuth2User(
                userInfo.getEmail(),
                userInfo.getName(),
                userInfo.getPicture(),
                request.getProviderType(),
                userInfo.getId()
        );

        String providerName = request.getProviderType().name();
        return ResponseEntity.ok(
                ApiResponse.success(providerName + " 로그인이 완료되었습니다.", response)
        );
    }
}
