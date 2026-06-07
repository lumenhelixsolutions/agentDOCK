---
id: hybrid-safe-audit-opencode
name: Hybrid Safe Audit (opencode)
frontend: opencode
command: opencode
backend: openrouter
mode: hybrid-cloud
model: openrouter/auto
task_mode: read-only
required_env:
  - OPENROUTER_API_KEY
status: unknown
description: Read-only audit. No writes, no shell, no git push. Hybrid mode via opencode.
---

# Hybrid Safe Audit (opencode)

Read-only audit. No writes, no shell, no git push.

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
