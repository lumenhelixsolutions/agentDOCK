---
id: hybrid-performance-aider
name: Hybrid Performance (aider)
frontend: aider
command: aider
backend: selectable
mode: hybrid-cloud
model: user-configured
task_mode: optimize

status: unknown
description: Profile and optimize performance bottlenecks. Hybrid mode via aider.
---

# Hybrid Performance (aider)

Profile and optimize performance bottlenecks.

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not (Get-Command aider -ErrorAction SilentlyContinue)) {
  Write-Host "aider CLI is not installed or not on PATH."
  Read-Host "Press Enter to exit"
  exit 1
}



aider
```
