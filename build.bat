@echo off
echo "=== CryptoTradeManager Backend Build ==="
echo "Java Version:"
java -version
echo.
echo "Cleaning previous builds..."
gradlew.bat clean
echo.
echo "Building backend project..."
gradlew.bat :backend:build -x test
echo.
echo "Build completed. Check backend/build/libs for generated JAR files."
pause