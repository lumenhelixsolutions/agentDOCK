---
id: local-documentation
name: Local Documentation
frontend: hermes
command: hermes
backend: ollama
mode: full-local
model: llama31-hermes-64k
required_context: 64000
task_mode: docs
status: known-good
description: Write docs, comments, README, API docs. Uses local Ollama + Hermes for maximum privacy.
---

# Local Documentation

Write docs, comments, README, API docs.

```powershell preflight
ollama ps
```

```powershell launch
cd /d {{PROJECT_PATH}}

Write-Host "Local Documentation mode — private, no data leaves this machine."
$env:OLLAMA_CONTEXT_LENGTH="64000"
$env:OLLAMA_FLASH_ATTENTION="1"
$env:OLLAMA_KV_CACHE_TYPE="q8_0"
$env:OLLAMA_NUM_PARALLEL="1"
$env:OLLAMA_MAX_LOADED_MODELS="1"

ollama run llama31-hermes-64k "Return exactly READY"
ollama ps

hermes --tui
```
