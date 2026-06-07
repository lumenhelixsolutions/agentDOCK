---
id: hybrid-security-audit-gemini
name: Hybrid Security Audit (gemini)
frontend: gemini
command: gemini
backend: google
mode: hybrid-cloud
model: gemini-2.0-flash
task_mode: security
required_env:
  - GEMINI_API_KEY
status: unknown
description: Threat model and vulnerability analysis. Hybrid mode via gemini.
---

# Hybrid Security Audit (gemini)

Threat model and vulnerability analysis.

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
