---
id: opencode-cloud
name: OpenCode Cloud / Hybrid
frontend: opencode
command: opencode
backend: openrouter
mode: hybrid-cloud
required_env:
  - OPENROUTER_API_KEY
status: unknown
description: OpenCode frontend with cloud model backend for fast repository editing.
---

# OpenCode Cloud / Hybrid

This profile starts OpenCode in the current repo. Exact provider selection is handled by your OpenCode config.

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not (Get-Command opencode -ErrorAction SilentlyContinue)) {
  Write-Host "opencode is not installed or not on PATH."
  Read-Host "Press Enter to exit"
  exit 1
}

if (-not $env:OPENROUTER_API_KEY) {
  Write-Host "OPENROUTER_API_KEY is missing."
}

opencode
```
