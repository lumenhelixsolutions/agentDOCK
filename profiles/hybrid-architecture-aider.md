---
id: hybrid-architecture-aider
name: Hybrid Architecture (aider)
frontend: aider
command: aider
backend: selectable
mode: hybrid-cloud
model: user-configured
task_mode: design

status: unknown
description: System design, planning, and structural decisions. Hybrid mode via aider.
---

# Hybrid Architecture (aider)

System design, planning, and structural decisions.

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not (Get-Command aider -ErrorAction SilentlyContinue)) {
  Write-Host "aider CLI is not installed or not on PATH."
  Read-Host "Press Enter to exit"
  exit 1
}



aider
```
