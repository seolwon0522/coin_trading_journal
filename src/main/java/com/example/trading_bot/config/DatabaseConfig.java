package com.example.trading_bot.config;

import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;

/**
 * Railway DATABASE_URL 변환 (최소한의 코드)
 */
@Configuration
@Profile("railway")
public class DatabaseConfig {

    @Bean
    @Primary
    public DataSourceProperties dataSourceProperties() {
        DataSourceProperties properties = new DataSourceProperties();
        String databaseUrl = System.getenv("DATABASE_URL");
        
        if (databaseUrl != null) {
            // postgresql:// -> jdbc:postgresql:// 변환
            String jdbcUrl = databaseUrl.replace("postgresql://", "jdbc:postgresql://");
            properties.setUrl(jdbcUrl);
        }
        
        return properties;
    }
}