---
id: hybrid-performance-gemini
name: Hybrid Performance (gemini)
frontend: gemini
command: gemini
backend: google
mode: hybrid-cloud
model: gemini-2.0-flash
task_mode: optimize
required_env:
  - GEMINI_API_KEY
status: unknown
description: Profile and optimize performance bottlenecks. Hybrid mode via gemini.
---

# Hybrid Performance (gemini)

Profile and optimize performance bottlenecks.

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not (Get-Command gemini -ErrorAction SilentlyContinue)) {
  Write-Host "gemini CLI is not installed or not on PATH."
  Read-Host "Press Enter to exit"
  exit 1
}

if (-not $env:GEMINI_API_KEY) { Write-Host "GEMINI_API_KEY is missing." }

gemini
```
