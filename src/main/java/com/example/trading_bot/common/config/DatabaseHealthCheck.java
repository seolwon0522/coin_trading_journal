package com.example.trading_bot.common.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;

/**
 * Database connection health check and validation component
 * Provides detailed connection information for Railway deployment
 */
@Component
@Profile({"railway", "prod"})
public class DatabaseHealthCheck implements HealthIndicator, CommandLineRunner {
    
    private static final Logger logger = LoggerFactory.getLogger(DatabaseHealthCheck.class);
    
    @Autowired
    private DataSource dataSource;
    
    @Autowired
    private DataSourceProperties dataSourceProperties;
    
    private volatile boolean connectionValid = false;
    private Map<String, Object> connectionDetails = new HashMap<>();
    
    @Override
    public void run(String... args) throws Exception {
        logger.info("=== Database Connection Validation Starting ===");
        
        // Log environment variables for debugging
        logger.info("Environment Variables Check:");
        logger.info("  PGHOST: {}", System.getenv("PGHOST"));
        logger.info("  PGPORT: {}", System.getenv("PGPORT"));
        logger.info("  PGDATABASE: {}", System.getenv("PGDATABASE"));
        logger.info("  PGUSER: {}", System.getenv("PGUSER"));
        logger.info("  PGPASSWORD: {}", System.getenv("PGPASSWORD") != null ? "***SET***" : "NOT SET");
        logger.info("  DATABASE_URL: {}", System.getenv("DATABASE_URL") != null ? "***SET***" : "NOT SET");
        
        // Log datasource properties
        logger.info("DataSource Properties:");
        logger.info("  URL: {}", sanitizeUrl(dataSourceProperties.getUrl()));
        logger.info("  Username: {}", dataSourceProperties.getUsername());
        logger.info("  Password: {}", dataSourceProperties.getPassword() != null ? "***SET***" : "NOT SET");
        
        validateConnection();
    }
    
    @Override
    public Health health() {
        if (connectionValid) {
            return Health.up()
                    .withDetails(connectionDetails)
                    .build();
        } else {
            return Health.down()
                    .withDetail("error", "Database connection not established")
                    .withDetails(connectionDetails)
                    .build();
        }
    }
    
    private void validateConnection() {
        try (Connection connection = dataSource.getConnection()) {
            DatabaseMetaData metaData = connection.getMetaData();
            
            // Store connection details
            connectionDetails.put("database_url", sanitizeUrl(dataSourceProperties.getUrl()));
            connectionDetails.put("database_product", metaData.getDatabaseProductName());
            connectionDetails.put("database_version", metaData.getDatabaseProductVersion());
            connectionDetails.put("driver_name", metaData.getDriverName());
            connectionDetails.put("driver_version", metaData.getDriverVersion());
            connectionDetails.put("connection_type", determineConnectionType(dataSourceProperties.getUrl()));
            
            // Test query
            boolean isValid = connection.isValid(5);
            connectionDetails.put("connection_valid", isValid);
            
            if (isValid) {
                connectionValid = true;
                logger.info("✅ Database connection successful!");
                logger.info("  - Type: {}", connectionDetails.get("connection_type"));
                logger.info("  - Product: {} {}", 
                    connectionDetails.get("database_product"), 
                    connectionDetails.get("database_version"));
                logger.info("  - URL: {}", connectionDetails.get("database_url"));
            } else {
                logger.error("❌ Database connection test failed");
            }
            
        } catch (SQLException e) {
            connectionValid = false;
            logger.error("❌ Failed to connect to database", e);
            connectionDetails.put("error", e.getMessage());
            connectionDetails.put("sql_state", e.getSQLState());
            connectionDetails.put("error_code", e.getErrorCode());
        }
    }
    
    /**
     * Sanitize database URL to hide password
     */
    private String sanitizeUrl(String url) {
        if (url == null) return "null";
        return url.replaceAll("://[^:]+:[^@]+@", "://***:***@");
    }
    
    /**
     * Determine if using internal Railway connection or external proxy
     */
    private String determineConnectionType(String url) {
        if (url == null) return "unknown";
        
        if (url.contains("railway.internal") || url.contains("railway.app")) {
            return "Railway Internal Connection (Optimized)";
        } else if (url.contains("proxy.rlwy.net")) {
            return "Railway External Proxy (Consider using internal connection)";
        } else if (url.contains("localhost") || url.contains("127.0.0.1")) {
            return "Local Development";
        } else {
            return "External Connection";
        }
    }
}