@echo off
chcp 65001 >nul
title GapGPT Enterprise Infrastructure Manager - Stopper
echo.
echo ======================================================================
echo   GapGPT Enterprise Infrastructure Manager - Stopping Process
echo ======================================================================
echo.

taskkill /F /IM GapGPT-Manager.exe /T 2>nul
taskkill /F /IM app.exe /T 2>nul
taskkill /F /IM python.exe /FI "WINDOWTITLE eq GapGPT*" 2>nul

echo.
echo [OK] GapGPT Enterprise Server and related background processes stopped.
echo.
pause
