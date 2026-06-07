---
id: hybrid-bug-hunt-gemini
name: Hybrid Bug Hunt (gemini)
frontend: gemini
command: gemini
backend: google
mode: hybrid-cloud
model: gemini-2.0-flash
task_mode: debug
required_env:
  - GEMINI_API_KEY
status: unknown
description: Find and diagnose bugs and root causes. Hybrid mode via gemini.
---

# Hybrid Bug Hunt (gemini)

Find and diagnose bugs and root causes.

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not (Get-Command gemini -ErrorAction SilentlyContinue)) {
  Write-Host "gemini CLI is not installed or not on PATH."
  Read-Host "Press Enter to exit"
  exit 1
}

if (-not $env:GEMINI_API_KEY) { Write-Host "GEMINI_API_KEY is missing." }

gemini
```
