package com.crypto.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import javax.sql.DataSource;

@Configuration
@Profile("railway")
public class RailwayDataSourceConfig {

    @Value("${DATABASE_URL:}")
    private String databaseUrl;

    @Bean
    public DataSource dataSource() {
        if (databaseUrl == null || databaseUrl.isEmpty()) {
            throw new RuntimeException("DATABASE_URL environment variable is not set");
        }

        // Convert Railway DATABASE_URL format to JDBC format
        // From: postgresql://user:password@host:port/database
        // To: jdbc:postgresql://host:port/database
        String jdbcUrl = convertToJdbcUrl(databaseUrl);
        
        HikariConfig config = new HikariConfig();
        
        // Parse username and password from URL
        String[] parts = databaseUrl.split("@");
        if (parts.length != 2) {
            throw new RuntimeException("Invalid DATABASE_URL format");
        }
        
        String credentials = parts[0].substring(parts[0].indexOf("//") + 2);
        String[] userPass = credentials.split(":");
        if (userPass.length != 2) {
            throw new RuntimeException("Invalid credentials in DATABASE_URL");
        }
        
        config.setJdbcUrl(jdbcUrl);
        config.setUsername(userPass[0]);
        config.setPassword(userPass[1]);
        config.setDriverClassName("org.postgresql.Driver");
        
        // Connection pool settings
        config.setMaximumPoolSize(10);
        config.setMinimumIdle(2);
        config.setConnectionTimeout(30000);
        config.setIdleTimeout(600000);
        config.setMaxLifetime(1800000);
        
        // Additional PostgreSQL specific settings
        config.addDataSourceProperty("sslmode", "require");
        config.addDataSourceProperty("sslfactory", "org.postgresql.ssl.NonValidatingFactory");
        
        return new HikariDataSource(config);
    }
    
    private String convertToJdbcUrl(String railwayUrl) {
        // Railway URL format: postgresql://user:password@host:port/database
        // JDBC URL format: jdbc:postgresql://host:port/database
        
        if (!railwayUrl.startsWith("postgresql://")) {
            throw new RuntimeException("Invalid DATABASE_URL format. Expected to start with 'postgresql://'");
        }
        
        // Extract the host:port/database part
        String[] parts = railwayUrl.split("@");
        if (parts.length != 2) {
            throw new RuntimeException("Invalid DATABASE_URL format");
        }
        
        String hostAndDb = parts[1];
        
        // Build JDBC URL
        return "jdbc:postgresql://" + hostAndDb;
    }
}