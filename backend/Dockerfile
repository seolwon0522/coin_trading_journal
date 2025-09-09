# Build stage
FROM openjdk:17-jdk AS build
WORKDIR /app

# Copy gradle wrapper and build files
COPY gradlew .
COPY gradle gradle
COPY build.gradle .
COPY settings.gradle .

# Make gradlew executable
RUN chmod +x gradlew

# Download dependencies (cache layer)
RUN ./gradlew dependencies --no-daemon

# Copy source code
COPY src src

# Build the application
RUN ./gradlew bootJar --no-daemon -x test

# Runtime stage
FROM openjdk:17-jdk-slim
WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Create a non-root user to run the app
RUN groupadd -r spring && useradd -r -g spring spring

# Copy the jar from build stage
COPY --from=build /app/build/libs/*.jar app.jar

# Copy start script
COPY start.sh .
RUN chmod +x start.sh && chown spring:spring start.sh

# Switch to non-root user
USER spring:spring

# Health check - 시작 시간을 충분히 줌
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD curl -f http://localhost:${PORT:-8080}/actuator/health || exit 1

# Expose port
EXPOSE 8080

# Set JVM options for container environment (메모리 최적화)
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -XX:+UseContainerSupport -Xss512k"

# Run the application with explicit port and profile
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -Dserver.port=${PORT:-8080} -Dspring.profiles.active=${SPRING_PROFILES_ACTIVE:-railway} -jar app.jar"]