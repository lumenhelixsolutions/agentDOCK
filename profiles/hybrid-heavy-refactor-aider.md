---
id: hybrid-heavy-refactor-aider
name: Hybrid Heavy Refactor (aider)
frontend: aider
command: aider
backend: selectable
mode: hybrid-cloud
model: user-configured
task_mode: refactor

status: unknown
description: Large-scale restructuring and refactoring. Hybrid mode via aider.
---

# Hybrid Heavy Refactor (aider)

Large-scale restructuring and refactoring.

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not (Get-Command aider -ErrorAction SilentlyContinue)) {
  Write-Host "aider CLI is not installed or not on PATH."
  Read-Host "Press Enter to exit"
  exit 1
}



aider
```
