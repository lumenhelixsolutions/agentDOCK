---
id: cloud-bug-hunt-claude
name: Cloud Bug Hunt (claude)
frontend: claude
command: claude
backend: anthropic
mode: full-cloud
model: claude-sonnet-4
task_mode: debug
required_env:
  - ANTHROPIC_API_KEY
status: unknown
description: Find and diagnose bugs and root causes. Full cloud via claude for speed and capability.
---

# Cloud Bug Hunt (claude)

Find and diagnose bugs and root causes.

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  Write-Host "claude CLI is not installed or not on PATH."
  Read-Host "Press Enter to exit"
  exit 1
}

if (-not $env:ANTHROPIC_API_KEY) { Write-Host "ANTHROPIC_API_KEY is missing. Cloud auth may prompt." }

claude
```
