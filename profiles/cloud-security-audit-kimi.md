---
id: cloud-security-audit-kimi
name: Cloud Security Audit (kimi)
frontend: kimi
command: kimi
backend: moonshot
mode: full-cloud
model: kimi-k1.5
task_mode: security
required_env:
  - MOONSHOT_API_KEY
status: unknown
description: Threat model and vulnerability analysis. Full cloud via kimi for speed and capability.
---

# Cloud Security Audit (kimi)

Threat model and vulnerability analysis.

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not (Get-Command kimi -ErrorAction SilentlyContinue)) {
  Write-Host "kimi CLI is not installed or not on PATH."
  Read-Host "Press Enter to exit"
  exit 1
}

if (-not $env:MOONSHOT_API_KEY) { Write-Host "MOONSHOT_API_KEY is missing. Cloud auth may prompt." }

kimi
```
