---
id: hybrid-bug-hunt-aider
name: Hybrid Bug Hunt (aider)
frontend: aider
command: aider
backend: selectable
mode: hybrid-cloud
model: user-configured
task_mode: debug

status: unknown
description: Find and diagnose bugs and root causes. Hybrid mode via aider.
---

# Hybrid Bug Hunt (aider)

Find and diagnose bugs and root causes.

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not (Get-Command aider -ErrorAction SilentlyContinue)) {
  Write-Host "aider CLI is not installed or not on PATH."
  Read-Host "Press Enter to exit"
  exit 1
}



aider
```
