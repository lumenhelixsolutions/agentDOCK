---
id: compound-review-compound-claude
name: CE Review + Compound (Claude)
frontend: claude
command: claude
backend: anthropic
mode: full-cloud
model: claude-sonnet-4
task_mode: review-compound
required_env:
  - ANTHROPIC_API_KEY
status: unknown
ce_version: "3.11.2"
description: Review code with /ce-code-review then document learnings with /ce-compound.
---

# CE Review + Compound (Claude)

Chain: /ce-code-review -> /ce-compound

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  Write-Host "claude CLI is not installed or not on PATH."
  Read-Host "Press Enter to exit"
  exit 1
}

if (-not $env:ANTHROPIC_API_KEY) { Write-Host "ANTHROPIC_API_KEY is missing." }

Write-Host "Workflow: /ce-code-review -> /ce-compound"
claude
```
