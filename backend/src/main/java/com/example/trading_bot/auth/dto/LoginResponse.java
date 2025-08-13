package com.example.trading_bot.auth.dto;

import com.example.trading_bot.auth.entity.User;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LoginResponse {
    private String accessToken;
    private String refreshToken;
    private User user;
}
