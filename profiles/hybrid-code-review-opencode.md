---
id: hybrid-code-review-opencode
name: Hybrid Code Review (opencode)
frontend: opencode
command: opencode
backend: openrouter
mode: hybrid-cloud
model: openrouter/auto
task_mode: review
required_env:
  - OPENROUTER_API_KEY
status: unknown
description: Review code quality, patterns, and issues. Hybrid mode via opencode.
---

# Hybrid Code Review (opencode)

Review code quality, patterns, and issues.

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
