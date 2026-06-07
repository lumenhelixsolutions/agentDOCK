---
id: cloud-patch-test-codex
name: Cloud Patch / Test (codex)
frontend: codex
command: codex
backend: openai
mode: full-cloud
model: gpt-4.1
task_mode: patch-test
required_env:
  - OPENAI_API_KEY
status: unknown
description: Small focused changes with test verification. Full cloud via codex for speed and capability.
---

# Cloud Patch / Test (codex)

Small focused changes with test verification.

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
  Write-Host "codex CLI is not installed or not on PATH."
  Read-Host "Press Enter to exit"
  exit 1
}

if (-not $env:OPENAI_API_KEY) { Write-Host "OPENAI_API_KEY is missing. Cloud auth may prompt." }

codex
```
