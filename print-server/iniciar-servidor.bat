@echo off
title Servidor de Impresion OROPEZA'S
echo.
echo ============================================
echo    INICIANDO SERVIDOR DE IMPRESION
echo    CORPORACION OROPEZA'S
echo ============================================
echo.
cd /d "%~dp0"
node print-server.js
pause
