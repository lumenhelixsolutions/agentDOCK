---
id: hermes-openrouter-pareto
name: Hermes OpenRouter Pareto Code
frontend: hermes
command: hermes
backend: openrouter
mode: hybrid-cloud
model: openrouter/pareto-code
required_env:
  - OPENROUTER_API_KEY
status: unknown
description: Cloud/hybrid Hermes coding profile. Good for speed and larger contexts when privacy allows.
---

# Hermes OpenRouter Pareto Code

Use this when you want faster coding and are comfortable sending repo context to a cloud provider.

```powershell launch
cd /d {{PROJECT_PATH}}

if (-not $env:OPENROUTER_API_KEY) {
  Write-Host "OPENROUTER_API_KEY is missing. Add it to your user environment or .hermes setup first."
  Read-Host "Press Enter to exit"
  exit 1
}

Write-Host "Starting Hermes. Confirm provider/model in Hermes config if this is your first run."
Write-Host "Suggested provider: OpenRouter"
Write-Host "Suggested model: openrouter/pareto-code"
hermes --tui
```
