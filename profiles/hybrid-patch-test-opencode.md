---
id: hybrid-patch-test-opencode
name: Hybrid Patch / Test (opencode)
frontend: opencode
command: opencode
backend: openrouter
mode: hybrid-cloud
model: openrouter/auto
task_mode: patch-test
required_env:
  - OPENROUTER_API_KEY
status: unknown
description: Small focused changes with test verification. Hybrid mode via opencode.
---

# Hybrid Patch / Test (opencode)

Small focused changes with test verification.

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
