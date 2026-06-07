---
id: hybrid-patch-test-aider
name: Hybrid Patch / Test (aider)
frontend: aider
command: aider
backend: selectable
mode: hybrid-cloud
model: user-configured
task_mode: patch-test

status: unknown
description: Small focused changes with test verification. Hybrid mode via aider.
---

# Hybrid Patch / Test (aider)

Small focused changes with test verification.

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not (Get-Command aider -ErrorAction SilentlyContinue)) {
  Write-Host "aider CLI is not installed or not on PATH."
  Read-Host "Press Enter to exit"
  exit 1
}



aider
```
