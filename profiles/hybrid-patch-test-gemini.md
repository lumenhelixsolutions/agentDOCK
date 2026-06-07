---
id: hybrid-patch-test-gemini
name: Hybrid Patch / Test (gemini)
frontend: gemini
command: gemini
backend: google
mode: hybrid-cloud
model: gemini-2.0-flash
task_mode: patch-test
required_env:
  - GEMINI_API_KEY
status: unknown
description: Small focused changes with test verification. Hybrid mode via gemini.
---

# Hybrid Patch / Test (gemini)

Small focused changes with test verification.

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
