---
id: hybrid-architecture-opencode
name: Hybrid Architecture (opencode)
frontend: opencode
command: opencode
backend: openrouter
mode: hybrid-cloud
model: openrouter/auto
task_mode: design
required_env:
  - OPENROUTER_API_KEY
status: unknown
description: System design, planning, and structural decisions. Hybrid mode via opencode.
---

# Hybrid Architecture (opencode)

System design, planning, and structural decisions.

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
