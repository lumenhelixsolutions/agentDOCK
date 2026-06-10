@echo off
cd /d "%~dp0"
echo Starting HOOT at http://127.0.0.1:7777
echo For LAN access: set AGENTDOCK_LAN=1 before running node server.js
node server.js
pause
