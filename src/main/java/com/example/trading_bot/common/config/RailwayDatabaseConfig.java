package com.example.trading_bot.common.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;

import javax.sql.DataSource;
import java.net.URI;
import java.net.URISyntaxException;

/**
 * Railway DATABASE_URL configuration
 * Parses DATABASE_URL environment variable and creates DataSource
 */
@Configuration
@Profile("railway")
public class RailwayDatabaseConfig {
    
    private static final Logger logger = LoggerFactory.getLogger(RailwayDatabaseConfig.class);
    
    @Bean
    @Primary
    public DataSource dataSource() {
        String databaseUrl = System.getenv("DATABASE_URL");
        
        if (databaseUrl == null || databaseUrl.isEmpty()) {
            logger.error("DATABASE_URL environment variable is not set!");
            throw new IllegalStateException("DATABASE_URL is required for Railway profile");
        }
        
        logger.info("=== Railway Database Configuration ===");
        logger.info("DATABASE_URL detected: {}", databaseUrl.replaceAll("://[^:]+:[^@]+@", "://***:***@"));
        
        try {
            // Parse DATABASE_URL
            URI dbUri = new URI(databaseUrl);
            
            String username = dbUri.getUserInfo().split(":")[0];
            String password = dbUri.getUserInfo().split(":")[1];
            String host = dbUri.getHost();
            int port = dbUri.getPort();
            String database = dbUri.getPath().substring(1); // Remove leading slash
            
            // Build JDBC URL
            String jdbcUrl = String.format("jdbc:postgresql://%s:%d/%s?sslmode=prefer", host, port, database);
            
            logger.info("Parsed configuration:");
            logger.info("  Host: {}", host);
            logger.info("  Port: {}", port);
            logger.info("  Database: {}", database);
            logger.info("  Username: {}", username);
            logger.info("  JDBC URL: {}", jdbcUrl);
            
            // Determine connection type
            if (host.contains("railway.internal")) {
                logger.info("  Connection Type: Railway Internal (Optimized)");
            } else if (host.contains("proxy.rlwy.net")) {
                logger.info("  Connection Type: Railway Proxy (External)");
            }
            
            // Create DataSource
            DataSource dataSource = DataSourceBuilder.create()
                    .driverClassName("org.postgresql.Driver")
                    .url(jdbcUrl)
                    .username(username)
                    .password(password)
                    .build();
            
            logger.info("DataSource created successfully");
            return dataSource;
            
        } catch (URISyntaxException e) {
            logger.error("Failed to parse DATABASE_URL: {}", e.getMessage());
            throw new IllegalArgumentException("Invalid DATABASE_URL format", e);
        } catch (Exception e) {
            logger.error("Failed to create DataSource: {}", e.getMessage());
            throw new RuntimeException("Failed to configure database", e);
        }
    }
}