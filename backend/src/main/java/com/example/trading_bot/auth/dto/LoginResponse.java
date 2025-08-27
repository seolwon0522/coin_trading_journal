package com.example.trading_bot.auth.dto;

import com.example.trading_bot.auth.entity.User;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LoginResponse {
    private String accessToken;
    private String refreshToken;
    private Long expiresIn;  // Access token 만료 시간 (초 단위)
    private User user;
}
