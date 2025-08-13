package com.example.trading_bot.auth.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "oauth2")
@Getter
@Setter
public class OAuth2Properties {

    private Google google = new Google();
    private Apple apple = new Apple();

    @Getter
    @Setter
    public static class Google {
        private String clientId = "default-google-client-id";
    }

    @Getter
    @Setter
    public static class Apple {
        private String clientId = "default-apple-client-id";
    }
}
