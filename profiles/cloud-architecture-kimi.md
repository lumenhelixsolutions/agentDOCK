---
id: cloud-architecture-kimi
name: Cloud Architecture (kimi)
frontend: kimi
command: kimi
backend: moonshot
mode: full-cloud
model: kimi-k1.5
task_mode: design
required_env:
  - MOONSHOT_API_KEY
status: unknown
description: System design, planning, and structural decisions. Full cloud via kimi for speed and capability.
---

# Cloud Architecture (kimi)

System design, planning, and structural decisions.

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
