---
id: compound-plan-work-claude
name: CE Plan + Work (Claude)
frontend: claude
command: claude
backend: anthropic
mode: full-cloud
model: claude-sonnet-4
task_mode: plan-work
required_env:
  - ANTHROPIC_API_KEY
status: unknown
ce_version: "3.11.2"
description: Brainstorm, plan, and execute using CE workflow chain. Best for feature implementation.
---

# CE Plan + Work (Claude)

Chain: /ce-brainstorm -> /ce-plan -> /ce-work

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  Write-Host "claude CLI is not installed or not on PATH."
  Read-Host "Press Enter to exit"
  exit 1
}

if (-not $env:ANTHROPIC_API_KEY) { Write-Host "ANTHROPIC_API_KEY is missing." }

Write-Host "Workflow: /ce-brainstorm -> /ce-plan -> /ce-work"
claude
```
