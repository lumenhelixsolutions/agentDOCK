---
id: hybrid-code-review-aider
name: Hybrid Code Review (aider)
frontend: aider
command: aider
backend: selectable
mode: hybrid-cloud
model: user-configured
task_mode: review

status: unknown
description: Review code quality, patterns, and issues. Hybrid mode via aider.
---

# Hybrid Code Review (aider)

Review code quality, patterns, and issues.

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not (Get-Command aider -ErrorAction SilentlyContinue)) {
  Write-Host "aider CLI is not installed or not on PATH."
  Read-Host "Press Enter to exit"
  exit 1
}



aider
```
