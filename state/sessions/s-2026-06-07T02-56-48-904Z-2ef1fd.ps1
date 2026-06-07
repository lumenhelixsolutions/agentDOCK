# AgentDock session s-2026-06-07T02-56-48-904Z-2ef1fd
# Profile: cloud-heavy-refactor-claude
$ErrorActionPreference = 'Continue'

cd /d D:\projects\agentdock

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  Write-Host "claude CLI is not installed or not on PATH."
  Read-Host "Press Enter to exit"
  exit 1
}

if (-not $env:ANTHROPIC_API_KEY) { Write-Host "ANTHROPIC_API_KEY is missing. Cloud auth may prompt." }

claude
