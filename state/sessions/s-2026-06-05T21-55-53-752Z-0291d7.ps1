# AgentDock session s-2026-06-05T21-55-53-752Z-0291d7
# Profile: codex-patch-test
$ErrorActionPreference = 'Continue'

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
