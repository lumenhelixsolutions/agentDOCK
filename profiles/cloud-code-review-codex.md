---
id: cloud-code-review-codex
name: Cloud Code Review (codex)
frontend: codex
command: codex
backend: openai
mode: full-cloud
model: gpt-4.1
task_mode: review
required_env:
  - OPENAI_API_KEY
status: unknown
description: Review code quality, patterns, and issues. Full cloud via codex for speed and capability.
---

# Cloud Code Review (codex)

Review code quality, patterns, and issues.

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
