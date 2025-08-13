package com.example.trading_bot.auth.entity;

/**
 * OAuth2 제공자 타입 열거형
 * 일반 로그인 및 소셜 로그인 제공자를 구분
 */
public enum ProviderType {
    /**
     * 일반 이메일/비밀번호 로그인
     */
    LOCAL,
    
    /**
     * Google OAuth2 로그인
     */
    GOOGLE,
    
    /**
     * Apple OAuth2 로그인
     */
    APPLE
}