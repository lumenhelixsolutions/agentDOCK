# AgentDock session s-2026-06-07T00-43-57-113Z-5dca1b
# Profile: aider-git-patch
$ErrorActionPreference = 'Continue'

cd /d D:\projects\lookBOOK

if (-not (Get-Command aider -ErrorAction SilentlyContinue)) {
  Write-Host "Aider is not installed or not on PATH. Use the official Aider link in AgentDock."
  Read-Host "Press Enter to exit"
  exit 1
}

Write-Host "Launching Aider from repo root..."
aider
