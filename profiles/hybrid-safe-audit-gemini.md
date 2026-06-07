---
id: hybrid-safe-audit-gemini
name: Hybrid Safe Audit (gemini)
frontend: gemini
command: gemini
backend: google
mode: hybrid-cloud
model: gemini-2.0-flash
task_mode: read-only
required_env:
  - GEMINI_API_KEY
status: unknown
description: Read-only audit. No writes, no shell, no git push. Hybrid mode via gemini.
---

# Hybrid Safe Audit (gemini)

Read-only audit. No writes, no shell, no git push.

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
