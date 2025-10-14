@echo off
echo ========================================
echo Crypto Trading Journal - Service Stop
echo ========================================
echo.

echo Stopping Docker containers...
docker-compose down
echo Docker containers stopped!
echo.

echo Note: Backend and Frontend servers are running in separate windows.
echo Please close those command windows manually to stop them.
echo.
pause
