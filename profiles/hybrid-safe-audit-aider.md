---
id: hybrid-safe-audit-aider
name: Hybrid Safe Audit (aider)
frontend: aider
command: aider
backend: selectable
mode: hybrid-cloud
model: user-configured
task_mode: read-only

status: unknown
description: Read-only audit. No writes, no shell, no git push. Hybrid mode via aider.
---

# Hybrid Safe Audit (aider)

Read-only audit. No writes, no shell, no git push.

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not (Get-Command aider -ErrorAction SilentlyContinue)) {
  Write-Host "aider CLI is not installed or not on PATH."
  Read-Host "Press Enter to exit"
  exit 1
}



aider
```
