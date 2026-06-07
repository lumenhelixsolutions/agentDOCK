---
id: local-patch-test-gemma4b
name: Local Patch Test (Gemma 4B)
frontend: ollama
command: ollama
backend: ollama
mode: full-local
model: gemma:4b
required_context: 8192
task_mode: patch-test
status: unknown
description: Patch validation using Gemma 4B locally.
---

# Local Patch Test (Gemma 4B)

Patch test with Gemma 4B via Ollama.

```powershell preflight
ollama ps
```

```powershell launch
cd /d {{PROJECT_PATH}}

Write-Host "Local Patch Test mode — Gemma 4B."
$env:OLLAMA_CONTEXT_LENGTH="8192"
$env:OLLAMA_FLASH_ATTENTION="1"
$env:OLLAMA_KV_CACHE_TYPE="q8_0"
$env:OLLAMA_NUM_PARALLEL="1"
$env:OLLAMA_MAX_LOADED_MODELS="1"

ollama run gemma:4b "Return exactly READY"
ollama ps
```
