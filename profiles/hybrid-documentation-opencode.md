---
id: hybrid-documentation-opencode
name: Hybrid Documentation (opencode)
frontend: opencode
command: opencode
backend: openrouter
mode: hybrid-cloud
model: openrouter/auto
task_mode: docs
required_env:
  - OPENROUTER_API_KEY
status: unknown
description: Write docs, comments, README, API docs. Hybrid mode via opencode.
---

# Hybrid Documentation (opencode)

Write docs, comments, README, API docs.

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
