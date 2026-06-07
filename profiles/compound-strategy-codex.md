---
id: compound-strategy-codex
name: CE Strategy (Codex)
frontend: codex
command: codex
backend: openai
mode: full-cloud
model: gpt-5.4
task_mode: strategy
required_env:
  - OPENAI_API_KEY
status: unknown
ce_version: "3.11.2"
description: Create or maintain STRATEGY.md using CE strategy skill via Codex.
---

# CE Strategy (Codex)

Run /ce-strategy to establish or refresh product strategy.

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
  Write-Host "codex CLI is not installed or not on PATH."
  Read-Host "Press Enter to exit"
  exit 1
}

if (-not $env:OPENAI_API_KEY) { Write-Host "OPENAI_API_KEY is missing." }

Write-Host "Run: /ce-strategy"
codex
```
