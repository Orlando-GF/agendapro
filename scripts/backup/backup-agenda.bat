@echo off
chcp 65001 >nul
echo ==========================================
echo  BACKUP AGENDAPRO - TEACOLHE
echo ==========================================
powershell -ExecutionPolicy Bypass -File "%~dp0backup-agenda.ps1"
echo.
pause
