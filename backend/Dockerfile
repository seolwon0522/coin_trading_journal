# Build stage
FROM gradle:8.5-jdk17 AS build
WORKDIR /app

# Copy Gradle files
COPY build.gradle settings.gradle ./
COPY gradle ./gradle
COPY gradlew ./

# Download dependencies
RUN ./gradlew dependencies --no-daemon

# Copy source code
COPY src ./src

# Build application
RUN ./gradlew bootJar --no-daemon

# Runtime stage
FROM openjdk:17-jdk-slim
WORKDIR /app

# Create non-root user
RUN addgroup --system spring && adduser --system spring --ingroup spring

# Copy JAR from build stage
COPY --from=build /app/build/libs/*.jar app.jar

# Set permissions
RUN chown -R spring:spring /app
USER spring:spring

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/actuator/health || exit 1

# Expose port
EXPOSE 8080

# Run application
ENTRYPOINT ["java", \
    "-XX:+UseContainerSupport", \
    "-XX:MaxRAMPercentage=75.0", \
    "-Djava.security.egd=file:/dev/./urandom", \
    "-jar", \
    "app.jar"]