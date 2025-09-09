#!/bin/sh

# Railway 시작 스크립트 - 디버깅 정보 포함

echo "==================================="
echo "Starting Spring Boot Application"
echo "==================================="
echo "PORT: ${PORT:-8080}"
echo "SPRING_PROFILES_ACTIVE: ${SPRING_PROFILES_ACTIVE:-railway}"
echo "DATABASE_URL exists: $(if [ -z "$DATABASE_URL" ]; then echo "NO"; else echo "YES"; fi)"
echo "==================================="

# JVM 옵션 설정
JAVA_OPTS="${JAVA_OPTS:-} -XX:MaxRAMPercentage=75.0 -XX:+UseContainerSupport -Xss512k"

# 애플리케이션 시작
exec java $JAVA_OPTS \
  -Dserver.port=${PORT:-8080} \
  -Dspring.profiles.active=${SPRING_PROFILES_ACTIVE:-railway} \
  -jar app.jar