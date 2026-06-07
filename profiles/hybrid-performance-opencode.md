---
id: hybrid-performance-opencode
name: Hybrid Performance (opencode)
frontend: opencode
command: opencode
backend: openrouter
mode: hybrid-cloud
model: openrouter/auto
task_mode: optimize
required_env:
  - OPENROUTER_API_KEY
status: unknown
description: Profile and optimize performance bottlenecks. Hybrid mode via opencode.
---

# Hybrid Performance (opencode)

Profile and optimize performance bottlenecks.

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
