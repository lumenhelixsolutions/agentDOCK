---
id: hybrid-security-audit-aider
name: Hybrid Security Audit (aider)
frontend: aider
command: aider
backend: selectable
mode: hybrid-cloud
model: user-configured
task_mode: security

status: unknown
description: Threat model and vulnerability analysis. Hybrid mode via aider.
---

# Hybrid Security Audit (aider)

Threat model and vulnerability analysis.

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not (Get-Command aider -ErrorAction SilentlyContinue)) {
  Write-Host "aider CLI is not installed or not on PATH."
  Read-Host "Press Enter to exit"
  exit 1
}



aider
```
