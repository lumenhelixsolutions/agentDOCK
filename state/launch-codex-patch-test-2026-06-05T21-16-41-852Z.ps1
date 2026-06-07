# AgentDock generated launch script
# Profile: codex-patch-test
# Generated: 2026-06-05T21:16:41.852Z

$ErrorActionPreference = 'Continue'
Start-Transcript -Path "D:\\projects\\agentdock\\logs\\launch-codex-patch-test-2026-06-05T21-16-41-852Z.md" -Force
Write-Host 'AgentDock launching profile: Codex Patch/Test'
Write-Host 'Profile ID: codex-patch-test'
Write-Host 'Started: 2026-06-05T21:16:41.852Z'

cd /d D:\projects\lookbook

if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
  Write-Host "codex CLI is not installed or not on PATH."
  Read-Host "Press Enter to exit"
  exit 1
}

if (-not $env:OPENAI_API_KEY) {
  Write-Host "OPENAI_API_KEY is missing or you may need Codex login/auth."
}

codex

Write-Host 'AgentDock launch script completed.'
Stop-Transcript
