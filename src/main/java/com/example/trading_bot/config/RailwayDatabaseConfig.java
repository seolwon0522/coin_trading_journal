package com.example.trading_bot.config;

import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;

/**
 * Railway DATABASE_URL 형식 변환 설정
 * Railway: postgres://user:pass@host:port/db
 * Spring: jdbc:postgresql://host:port/db
 */
@Configuration
@Profile("railway")
public class RailwayDatabaseConfig {

    @Bean
    @Primary
    public DataSourceProperties dataSourceProperties() {
        DataSourceProperties properties = new DataSourceProperties();
        
        String databaseUrl = System.getenv("DATABASE_URL");
        
        if (databaseUrl != null && databaseUrl.startsWith("postgres://")) {
            // Railway DATABASE_URL 변환
            String jdbcUrl = convertToJdbcUrl(databaseUrl);
            properties.setUrl(jdbcUrl);
            
            // 사용자명과 비밀번호 추출
            String[] parts = databaseUrl.replace("postgres://", "").split("@");
            if (parts.length > 1) {
                String[] credentials = parts[0].split(":");
                if (credentials.length > 1) {
                    properties.setUsername(credentials[0]);
                    properties.setPassword(credentials[1]);
                }
            }
        } else if (databaseUrl != null && databaseUrl.startsWith("postgresql://")) {
            // postgresql:// 형식도 지원
            String jdbcUrl = convertPostgresqlUrl(databaseUrl);
            properties.setUrl(jdbcUrl);
            
            // 사용자명과 비밀번호 추출
            String[] parts = databaseUrl.replace("postgresql://", "").split("@");
            if (parts.length > 1) {
                String[] credentials = parts[0].split(":");
                if (credentials.length > 1) {
                    properties.setUsername(credentials[0]);
                    properties.setPassword(credentials[1]);
                }
            }
        } else {
            // 기본 로컬 설정
            properties.setUrl("jdbc:postgresql://localhost:5432/trading_bot");
            properties.setUsername("postgres");
            properties.setPassword("1q2w3e4r!");
        }
        
        properties.setDriverClassName("org.postgresql.Driver");
        
        System.out.println("=== Database Configuration ===");
        System.out.println("URL: " + properties.getUrl());
        System.out.println("Username: " + properties.getUsername());
        System.out.println("==============================");
        
        return properties;
    }
    
    private String convertToJdbcUrl(String railwayUrl) {
        // postgres://user:pass@host:port/db -> jdbc:postgresql://host:port/db
        String url = railwayUrl
            .replace("postgres://", "")
            .replaceFirst(".*@", "");
        
        // SSL 모드 추가 (Railway는 SSL을 사용할 수 있음)
        if (!url.contains("?")) {
            url += "?sslmode=require";
        }
        
        return "jdbc:postgresql://" + url;
    }
    
    private String convertPostgresqlUrl(String railwayUrl) {
        // postgresql://user:pass@host:port/db -> jdbc:postgresql://host:port/db
        String url = railwayUrl
            .replace("postgresql://", "")
            .replaceFirst(".*@", "");
        
        // SSL 모드 추가 (Railway는 SSL을 사용할 수 있음)
        if (!url.contains("?")) {
            url += "?sslmode=prefer";
        }
        
        return "jdbc:postgresql://" + url;
    }
}