---
id: hybrid-bug-hunt-opencode
name: Hybrid Bug Hunt (opencode)
frontend: opencode
command: opencode
backend: openrouter
mode: hybrid-cloud
model: openrouter/auto
task_mode: debug
required_env:
  - OPENROUTER_API_KEY
status: unknown
description: Find and diagnose bugs and root causes. Hybrid mode via opencode.
---

# Hybrid Bug Hunt (opencode)

Find and diagnose bugs and root causes.

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not (Get-Command opencode -ErrorAction SilentlyContinue)) {
  Write-Host "opencode CLI is not installed or not on PATH."
  Read-Host "Press Enter to exit"
  exit 1
}

if (-not $env:OPENROUTER_API_KEY) { Write-Host "OPENROUTER_API_KEY is missing." }

opencode
```
