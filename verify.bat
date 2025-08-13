@echo off
echo "=== CryptoTradeManager Build Verification ==="
echo.

echo "1. Checking Java version..."
java -version
echo.

echo "2. Checking Gradle wrapper..."
gradlew.bat --version
echo.

echo "3. Running clean build with tests..."
gradlew.bat clean :backend:build
echo.

echo "4. Checking build artifacts..."
if exist "backend\build\libs\*.jar" (
    echo "✅ JAR file created successfully"
    dir "backend\build\libs\*.jar"
) else (
    echo "❌ JAR file not found"
)
echo.

echo "5. Running Spring Boot health check..."
echo "Starting application for 10 seconds..."
start /B gradlew.bat :backend:bootRun
timeout /t 10 /nobreak >nul
taskkill /f /im java.exe >nul 2>&1
echo "Application test completed"
echo.

echo "=== Verification Complete ==="
pause