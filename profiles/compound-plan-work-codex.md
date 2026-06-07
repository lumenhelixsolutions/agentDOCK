---
id: compound-plan-work-codex
name: CE Plan + Work (Codex)
frontend: codex
command: codex
backend: openai
mode: full-cloud
model: gpt-5.4
task_mode: plan-work
required_env:
  - OPENAI_API_KEY
status: unknown
ce_version: "3.11.2"
description: Brainstorm, plan, and execute using CE workflow chain via Codex.
---

# CE Plan + Work (Codex)

Chain: /ce-brainstorm -> /ce-plan -> /ce-work

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
  Write-Host "codex CLI is not installed or not on PATH."
  Read-Host "Press Enter to exit"
  exit 1
}

if (-not $env:OPENAI_API_KEY) { Write-Host "OPENAI_API_KEY is missing." }

Write-Host "Workflow: /ce-brainstorm -> /ce-plan -> /ce-work"
codex
```
