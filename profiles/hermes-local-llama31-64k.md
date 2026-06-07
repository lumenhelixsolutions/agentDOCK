---
id: hermes-local-llama31-64k
name: Hermes Local Llama 3.1 64K
frontend: hermes
command: hermes
backend: ollama
mode: full-local
model: llama31-hermes-64k
required_context: 64000
status: known-good
description: Known-good private local Hermes profile using Ollama and llama31-hermes-64k.
---

# Hermes Local Llama 3.1 64K

This is the known-good private local stack. It was verified on the RTX 4060 8GB machine with `ollama ps` showing 64,000 context.

```powershell preflight
ollama ps
```

```powershell launch
cd /d {{PROJECT_PATH}}

Write-Host "Stopping existing Ollama instance if present..."
taskkill /IM ollama.exe /F 2>$null

Write-Host "Starting Ollama in 64K optimized mode..."
$env:OLLAMA_CONTEXT_LENGTH="64000"
$env:OLLAMA_FLASH_ATTENTION="1"
$env:OLLAMA_KV_CACHE_TYPE="q8_0"
$env:OLLAMA_NUM_PARALLEL="1"
$env:OLLAMA_MAX_LOADED_MODELS="1"

Start-Process powershell -ArgumentList '-NoExit','-Command','ollama serve'
Start-Sleep -Seconds 6

Write-Host "Warming llama31-hermes-64k and verifying context..."
ollama run llama31-hermes-64k "Return exactly READY"
ollama ps

Write-Host "Starting Hermes TUI..."
hermes --tui
```
