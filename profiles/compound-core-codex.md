---
id: compound-core-codex
name: Compound Engineering (Codex)
frontend: codex
command: codex
backend: openai
mode: full-cloud
model: gpt-5.4
task_mode: workflow
required_env:
  - OPENAI_API_KEY
status: unknown
ce_version: "3.11.2"
description: General Compound Engineering workflow access via OpenAI Codex. Use /ce-brainstorm, /ce-plan, /ce-work, /ce-code-review, /ce-compound as needed.
---

# Compound Engineering (Codex)

Launch OpenAI Codex with Compound Engineering plugin ready.

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
  Write-Host "codex CLI is not installed or not on PATH."
  Read-Host "Press Enter to exit"
  exit 1
}

if (-not $env:OPENAI_API_KEY) { Write-Host "OPENAI_API_KEY is missing. Cloud auth may prompt." }

Write-Host "Launching Codex with Compound Engineering..."
Write-Host "Available skills: /ce-strategy /ce-ideate /ce-brainstorm /ce-plan /ce-work /ce-code-review /ce-compound /ce-debug /ce-product-pulse"
codex
```
