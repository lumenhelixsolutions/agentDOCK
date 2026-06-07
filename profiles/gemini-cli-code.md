---
id: gemini-cli-code
name: Gemini CLI Code
frontend: gemini-cli
command: gemini
backend: google
mode: hybrid-cloud
required_env:
  - GEMINI_API_KEY
status: unknown
description: Gemini CLI coding profile when the gemini command and Google/Gemini API auth are available.
---

# Gemini CLI Code

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not (Get-Command gemini -ErrorAction SilentlyContinue)) {
  Write-Host "Gemini CLI is not installed or not on PATH. Use the official link in AgentDock."
  Read-Host "Press Enter to exit"
  exit 1
}

if (-not $env:GEMINI_API_KEY -and -not $env:GOOGLE_API_KEY) {
  Write-Host "No GEMINI_API_KEY or GOOGLE_API_KEY loaded. The CLI may ask for authentication."
}

gemini
```
