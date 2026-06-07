---
id: compound-strategy-claude
name: CE Strategy (Claude)
frontend: claude
command: claude
backend: anthropic
mode: full-cloud
model: claude-sonnet-4
task_mode: strategy
required_env:
  - ANTHROPIC_API_KEY
status: unknown
ce_version: "3.11.2"
description: Create or maintain STRATEGY.md using CE strategy skill. Upstream anchor for product direction.
---

# CE Strategy (Claude)

Run /ce-strategy to establish or refresh product strategy.

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  Write-Host "claude CLI is not installed or not on PATH."
  Read-Host "Press Enter to exit"
  exit 1
}

if (-not $env:ANTHROPIC_API_KEY) { Write-Host "ANTHROPIC_API_KEY is missing." }

Write-Host "Run: /ce-strategy"
claude
```
