---
id: compound-review-compound-codex
name: CE Review + Compound (Codex)
frontend: codex
command: codex
backend: openai
mode: full-cloud
model: gpt-5.4
task_mode: review-compound
required_env:
  - OPENAI_API_KEY
status: unknown
ce_version: "3.11.2"
description: Review code with /ce-code-review then document learnings with /ce-compound via Codex.
---

# CE Review + Compound (Codex)

Chain: /ce-code-review -> /ce-compound

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
  Write-Host "codex CLI is not installed or not on PATH."
  Read-Host "Press Enter to exit"
  exit 1
}

if (-not $env:OPENAI_API_KEY) { Write-Host "OPENAI_API_KEY is missing." }

Write-Host "Workflow: /ce-code-review -> /ce-compound"
codex
```
