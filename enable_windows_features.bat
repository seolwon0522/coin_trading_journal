@echo off
echo =========================================
echo Enabling Windows Virtualization Features
echo =========================================
echo.
echo This script must be run as Administrator!
echo.

REM Enable Hyper-V
echo Enabling Hyper-V...
dism.exe /online /enable-feature /featurename:Microsoft-Hyper-V-All /all /norestart

REM Enable Windows Subsystem for Linux
echo Enabling WSL...
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart

REM Enable Virtual Machine Platform
echo Enabling Virtual Machine Platform...
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

REM Enable Windows Hypervisor Platform
echo Enabling Windows Hypervisor Platform...
dism.exe /online /enable-feature /featurename:HypervisorPlatform /all /norestart

echo.
echo =========================================
echo Features enabled!
echo Please RESTART your computer for changes to take effect.
echo =========================================
pause