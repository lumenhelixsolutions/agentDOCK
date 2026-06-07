@echo off
cd /d "%~dp0"
echo Starting AgentDock at http://127.0.0.1:7777
node server.js
pause
