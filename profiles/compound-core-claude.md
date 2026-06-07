---
id: compound-core-claude
name: Compound Engineering (Claude)
frontend: claude
command: claude
backend: anthropic
mode: full-cloud
model: claude-sonnet-4
task_mode: workflow
required_env:
  - ANTHROPIC_API_KEY
status: unknown
ce_version: "3.11.2"
description: General Compound Engineering workflow access via Claude Code. Use /ce-brainstorm, /ce-plan, /ce-work, /ce-code-review, /ce-compound as needed.
---

# Compound Engineering (Claude)

Launch Claude Code with Compound Engineering plugin ready.

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  Write-Host "claude CLI is not installed or not on PATH."
  Read-Host "Press Enter to exit"
  exit 1
}

if (-not $env:ANTHROPIC_API_KEY) { Write-Host "ANTHROPIC_API_KEY is missing. Cloud auth may prompt." }

Write-Host "Launching Claude Code with Compound Engineering..."
Write-Host "Available skills: /ce-strategy /ce-ideate /ce-brainstorm /ce-plan /ce-work /ce-code-review /ce-compound /ce-debug /ce-product-pulse"
claude
```
