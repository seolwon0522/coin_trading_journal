@echo off
echo =========================================
echo Virtualization Status Check
echo =========================================
echo.

echo Checking CPU virtualization support...
echo.

wmic cpu get VirtualizationFirmwareEnabled
echo.

echo Checking Hyper-V status...
systeminfo | findstr /C:"Hyper-V Requirements"

echo.
echo =========================================
echo If VirtualizationFirmwareEnabled = FALSE
echo You need to enable virtualization in BIOS
echo =========================================
echo.

echo Checking if running in VM...
systeminfo | findstr /C:"System Manufacturer" /C:"System Model"

pause