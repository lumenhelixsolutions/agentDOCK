---
id: codex-patch-test
name: Codex Patch/Test
frontend: codex
command: codex
backend: openai
mode: hybrid-cloud
task_mode: patch-test
required_env:
  - OPENAI_API_KEY
status: unknown
description: Codex CLI profile for patching, test-running, and approval-based code changes.
---

# Codex Patch/Test

Use this profile for careful patch/test loops. AgentDock does not configure Codex sandboxing; verify your Codex CLI settings before use.

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
  Write-Host "codex CLI is not installed or not on PATH."
  Read-Host "Press Enter to exit"
  exit 1
}

if (-not $env:OPENAI_API_KEY) {
  Write-Host "OPENAI_API_KEY is missing or you may need Codex login/auth."
}

codex
```
