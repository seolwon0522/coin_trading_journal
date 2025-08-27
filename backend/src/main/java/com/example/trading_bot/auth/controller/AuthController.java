package com.example.trading_bot.auth.controller;

import com.example.trading_bot.auth.dto.LoginRequest;
import com.example.trading_bot.auth.dto.LoginResponse;
import com.example.trading_bot.auth.dto.RegisterRequest;
import com.example.trading_bot.auth.dto.TokenResponse;
import com.example.trading_bot.auth.entity.User;
import com.example.trading_bot.auth.service.AuthService;
import com.example.trading_bot.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 사용자 인증 및 권한 관리 REST API 컨트롤러
 * 
 * 회원가입, 로그인, 토큰 갱신, 로그아웃 등의 인증 관련 API를 제공합니다.
 * 
 * @author CryptoTradeManager
 * @since 1.0.0
 */
@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * 일반 회원가입
     * 
     * 이메일과 비밀번호를 사용하여 새로운 사용자를 등록합니다.
     * 
     * @param request 회원가입 요청 정보 (이메일, 비밀번호, 이름)
     * @return 생성된 사용자 정보
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<User>> register(@Valid @RequestBody RegisterRequest request) {
        User user = authService.registerLocalUser(request.getEmail(), request.getPassword(), request.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(user, "회원가입이 완료되었습니다."));
    }

    /**
     * 일반 로그인
     * 
     * 이메일과 비밀번호를 사용한 로컬 인증을 수행합니다.
     * 
     * @param request 로그인 요청 정보 (이메일, 비밀번호)
     * @return JWT 토큰과 사용자 정보를 포함한 로그인 응답
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.loginLocal(request.getEmail(), request.getPassword());
        return ResponseEntity.ok(ApiResponse.success(response, "로그인이 완료되었습니다."));
    }

    /**
     * 토큰 갱신
     * 
     * Refresh Token을 사용하여 새로운 Access Token과 Refresh Token을 발급합니다.
     * Rolling Refresh Token 전략을 사용합니다.
     * 
     * @param refreshToken Authorization 헤더의 Refresh Token
     * @return 새로 발급된 Access Token과 Refresh Token
     */
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<TokenResponse>> refreshToken(
            @RequestHeader("Authorization") String refreshToken) {
        TokenResponse response = authService.refreshToken(refreshToken);
        return ResponseEntity.ok(ApiResponse.success(response, "토큰이 갱신되었습니다."));
    }

    /**
     * 현재 사용자 정보 조회
     * 
     * JWT 토큰을 통해 현재 로그인된 사용자의 정보를 조회합니다.
     * 
     * @param authHeader Authorization 헤더의 JWT Access Token
     * @return 현재 인증된 사용자 정보
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<User>> getCurrentUser(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = authService.getCurrentUserFromToken(authHeader);
        return ResponseEntity.ok(ApiResponse.success(user, "사용자 정보를 조회했습니다."));
    }

    /**
     * 로그아웃
     * 
     * 현재 사용자의 Refresh Token을 무효화하여 로그아웃을 처리합니다.
     * 
     * @param authHeader Authorization 헤더의 JWT Access Token
     * @return 로그아웃 완료 메시지
     */
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        authService.logoutFromToken(authHeader);
        return ResponseEntity.ok(ApiResponse.success("로그아웃이 완료되었습니다."));
    }
}
