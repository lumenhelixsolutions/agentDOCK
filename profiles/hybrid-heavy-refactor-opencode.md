---
id: hybrid-heavy-refactor-opencode
name: Hybrid Heavy Refactor (opencode)
frontend: opencode
command: opencode
backend: openrouter
mode: hybrid-cloud
model: openrouter/auto
task_mode: refactor
required_env:
  - OPENROUTER_API_KEY
status: unknown
description: Large-scale restructuring and refactoring. Hybrid mode via opencode.
---

# Hybrid Heavy Refactor (opencode)

Large-scale restructuring and refactoring.

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
