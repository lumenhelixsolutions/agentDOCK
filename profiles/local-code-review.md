---
id: local-code-review
name: Local Code Review
frontend: hermes
command: hermes
backend: ollama
mode: full-local
model: llama31-hermes-64k
required_context: 64000
task_mode: review
status: known-good
description: Review code quality, patterns, and issues. Uses local Ollama + Hermes for maximum privacy.
---

# Local Code Review

Review code quality, patterns, and issues.

```powershell preflight
ollama ps
```

```powershell launch
cd /d {{PROJECT_PATH}}

Write-Host "Local Code Review mode — private, no data leaves this machine."
$env:OLLAMA_CONTEXT_LENGTH="64000"
$env:OLLAMA_FLASH_ATTENTION="1"
$env:OLLAMA_KV_CACHE_TYPE="q8_0"
$env:OLLAMA_NUM_PARALLEL="1"
$env:OLLAMA_MAX_LOADED_MODELS="1"

ollama run llama31-hermes-64k "Return exactly READY"
ollama ps

hermes --tui
```
