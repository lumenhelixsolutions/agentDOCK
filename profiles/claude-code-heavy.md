---
id: claude-code-heavy
name: Claude Code Heavy Refactor
frontend: claude-code
command: claude
backend: anthropic
mode: full-cloud
task_mode: refactor
required_env:
  - ANTHROPIC_API_KEY
status: unknown
description: Claude Code profile for cloud-backed heavy refactor or review tasks. Uses the official claude command if installed.
---

# Claude Code Heavy Refactor

Use this when Claude Code is installed and you are comfortable using Anthropic cloud-backed coding.

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  Write-Host "Claude Code CLI is not installed or not on PATH. Use the official Anthropic docs link in AgentDock."
  Read-Host "Press Enter to exit"
  exit 1
}

if (-not $env:ANTHROPIC_API_KEY) {
  Write-Host "ANTHROPIC_API_KEY is not loaded. Claude Code may use browser/login auth instead."
}

Write-Host "Launching Claude Code from repo root..."
claude
```
