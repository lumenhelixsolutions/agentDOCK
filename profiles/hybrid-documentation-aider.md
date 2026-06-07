---
id: hybrid-documentation-aider
name: Hybrid Documentation (aider)
frontend: aider
command: aider
backend: selectable
mode: hybrid-cloud
model: user-configured
task_mode: docs

status: unknown
description: Write docs, comments, README, API docs. Hybrid mode via aider.
---

# Hybrid Documentation (aider)

Write docs, comments, README, API docs.

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not (Get-Command aider -ErrorAction SilentlyContinue)) {
  Write-Host "aider CLI is not installed or not on PATH."
  Read-Host "Press Enter to exit"
  exit 1
}



aider
```
