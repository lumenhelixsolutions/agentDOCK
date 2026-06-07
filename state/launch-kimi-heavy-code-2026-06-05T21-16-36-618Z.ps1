# AgentDock generated launch script
# Profile: kimi-heavy-code
# Generated: 2026-06-05T21:16:36.618Z

$ErrorActionPreference = 'Continue'
Start-Transcript -Path "D:\\projects\\agentdock\\logs\\launch-kimi-heavy-code-2026-06-05T21-16-36-618Z.md" -Force
Write-Host 'AgentDock launching profile: Kimi Heavy Code'
Write-Host 'Profile ID: kimi-heavy-code'
Write-Host 'Started: 2026-06-05T21:16:36.618Z'

cd /d D:\projects\lookbook

if (-not (Get-Command kimi -ErrorAction SilentlyContinue)) {
  Write-Host "kimi CLI is not installed or not on PATH."
  Read-Host "Press Enter to exit"
  exit 1
}

if (-not $env:MOONSHOT_API_KEY) {
  Write-Host "MOONSHOT_API_KEY is missing. Kimi may ask you to login."
}

kimi

Write-Host 'AgentDock launch script completed.'
Stop-Transcript
