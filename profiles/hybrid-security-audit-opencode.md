---
id: hybrid-security-audit-opencode
name: Hybrid Security Audit (opencode)
frontend: opencode
command: opencode
backend: openrouter
mode: hybrid-cloud
model: openrouter/auto
task_mode: security
required_env:
  - OPENROUTER_API_KEY
status: unknown
description: Threat model and vulnerability analysis. Hybrid mode via opencode.
---

# Hybrid Security Audit (opencode)

Threat model and vulnerability analysis.

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
