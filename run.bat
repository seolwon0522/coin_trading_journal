@echo off
echo "=== CryptoTradeManager Backend Run ==="
echo "Starting Spring Boot application..."
echo "Application will be available at: http://localhost:8080"
echo "API Documentation: http://localhost:8080/swagger-ui.html"
echo.
gradlew.bat :backend:bootRun
pause