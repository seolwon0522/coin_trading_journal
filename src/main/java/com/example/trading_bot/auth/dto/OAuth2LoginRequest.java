package com.example.trading_bot.auth.dto;

import com.example.trading_bot.auth.entity.ProviderType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OAuth2LoginRequest {

    @NotNull(message = "OAuth2 제공자 타입이 필요합니다.")
    private ProviderType providerType;

    @NotBlank(message = "OAuth2 토큰이 필요합니다.")
    private String token;
}
