---
id: hybrid-heavy-refactor-gemini
name: Hybrid Heavy Refactor (gemini)
frontend: gemini
command: gemini
backend: google
mode: hybrid-cloud
model: gemini-2.0-flash
task_mode: refactor
required_env:
  - GEMINI_API_KEY
status: unknown
description: Large-scale restructuring and refactoring. Hybrid mode via gemini.
---

# Hybrid Heavy Refactor (gemini)

Large-scale restructuring and refactoring.

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
