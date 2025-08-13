package com.example.trading_bot.auth.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class OAuth2UserInfo {
    private String id;
    private String email;
    private String name;
    private String picture;
    private Boolean emailVerified;
}
