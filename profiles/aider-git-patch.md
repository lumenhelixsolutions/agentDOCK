---
id: aider-git-patch
name: Aider Git Patch Mode
frontend: aider
command: aider
backend: selectable
mode: hybrid-cloud
task_mode: patch-test
status: unknown
description: Aider profile for explicit Git-aware patching. Useful fallback when you want clean diffs.
---

# Aider Git Patch Mode

Use this when Aider is installed and you want a Git-centered code-editing loop.

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not (Get-Command aider -ErrorAction SilentlyContinue)) {
  Write-Host "Aider is not installed or not on PATH. Use the official Aider link in AgentDock."
  Read-Host "Press Enter to exit"
  exit 1
}

Write-Host "Launching Aider from repo root..."
aider
```
