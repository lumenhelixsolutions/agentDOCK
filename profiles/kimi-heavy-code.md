---
id: kimi-heavy-code
name: Kimi Heavy Code
frontend: kimi
command: kimi
backend: moonshot
mode: full-cloud
task_mode: refactor
required_env:
  - MOONSHOT_API_KEY
status: unknown
description: Kimi/Moonshot heavy refactor profile for large repo reasoning when privacy allows.
---

# Kimi Heavy Code

Use this profile for long-context repo analysis, heavy refactors, and complex planning.

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not (Get-Command kimi -ErrorAction SilentlyContinue)) {
  Write-Host "kimi CLI is not installed or not on PATH."
  Read-Host "Press Enter to exit"
  exit 1
}

if (-not $env:MOONSHOT_API_KEY) {
  Write-Host "MOONSHOT_API_KEY is missing. Kimi may ask you to login."
}

kimi
```
