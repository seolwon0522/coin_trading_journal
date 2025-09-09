package com.example.trading_bot;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class TradingBotApplication {
    public static void main(String[] args) {
        SpringApplication.run(TradingBotApplication.class, args);
    }
}
