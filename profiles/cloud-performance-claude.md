---
id: cloud-performance-claude
name: Cloud Performance (claude)
frontend: claude
command: claude
backend: anthropic
mode: full-cloud
model: claude-sonnet-4
task_mode: optimize
required_env:
  - ANTHROPIC_API_KEY
status: unknown
description: Profile and optimize performance bottlenecks. Full cloud via claude for speed and capability.
---

# Cloud Performance (claude)

Profile and optimize performance bottlenecks.

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
