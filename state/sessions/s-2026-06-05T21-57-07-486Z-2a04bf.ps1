# AgentDock session s-2026-06-05T21-57-07-486Z-2a04bf
# Profile: gemini-cli-code
$ErrorActionPreference = 'Continue'

cd /d D:\projects\lookbook

if (-not (Get-Command gemini -ErrorAction SilentlyContinue)) {
  Write-Host "Gemini CLI is not installed or not on PATH. Use the official link in AgentDock."
  Read-Host "Press Enter to exit"
  exit 1
}

if (-not $env:GEMINI_API_KEY -and -not $env:GOOGLE_API_KEY) {
  Write-Host "No GEMINI_API_KEY or GOOGLE_API_KEY loaded. The CLI may ask for authentication."
}

gemini
