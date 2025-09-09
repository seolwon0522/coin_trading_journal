# Simple working Dockerfile for Railway
FROM openjdk:17-jdk AS build

WORKDIR /app

# Copy gradle wrapper files first
COPY gradle gradle
COPY gradlew .
COPY gradlew.bat .

# Copy build configuration
COPY build.gradle .
COPY settings.gradle .

# Make gradlew executable (important!)
RUN chmod +x ./gradlew

# Copy source code
COPY src src

# Build application - use bash explicitly
RUN bash ./gradlew bootJar --no-daemon -x test

# Runtime stage
FROM openjdk:17-jdk-slim
WORKDIR /app

# Copy jar
COPY --from=build /app/build/libs/*.jar app.jar

# Expose port
EXPOSE 8080

# Run application  
ENTRYPOINT ["sh", "-c", "java -Dserver.port=${PORT:-8080} -Dspring.profiles.active=railway -jar app.jar"]