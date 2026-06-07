---
id: local-safe-audit-gemma4b
name: Local Safe Audit (Gemma 4B)
frontend: ollama
command: ollama
backend: ollama
mode: full-local
model: gemma:4b
required_context: 8192
task_mode: safe-audit
status: unknown
description: Read-only privacy audit using Gemma 4B locally. Lightweight and fast.
---

# Local Safe Audit (Gemma 4B)

Read-only audit with Gemma 4B via Ollama.

```powershell preflight
ollama ps
```

```powershell launch
cd /d {{PROJECT_PATH}}

Write-Host "Local Safe Audit mode — Gemma 4B, private, no data leaves this machine."
$env:OLLAMA_CONTEXT_LENGTH="8192"
$env:OLLAMA_FLASH_ATTENTION="1"
$env:OLLAMA_KV_CACHE_TYPE="q8_0"
$env:OLLAMA_NUM_PARALLEL="1"
$env:OLLAMA_MAX_LOADED_MODELS="1"

ollama run gemma:4b "Return exactly READY"
ollama ps
ollama run gemma:4b
```
