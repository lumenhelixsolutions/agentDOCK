---
id: local-reasoning-deepseek-r1-8b
name: Local Reasoning (DeepSeek R1 8B)
frontend: ollama
command: ollama
backend: ollama
mode: full-local
model: deepseek-r1:8b
required_context: 32768
task_mode: architecture
status: unknown
description: Reasoning tasks with DeepSeek R1 8B via Ollama. Good for step-by-step analysis.
---

# Local Reasoning (DeepSeek R1 8B)

Reasoning tasks with DeepSeek R1 8B.

```powershell preflight
ollama ps
```

```powershell launch
cd /d {{PROJECT_PATH}}

Write-Host "Local Reasoning mode — DeepSeek R1 8B."
$env:OLLAMA_CONTEXT_LENGTH="32768"
$env:OLLAMA_FLASH_ATTENTION="1"
$env:OLLAMA_KV_CACHE_TYPE="q8_0"
$env:OLLAMA_NUM_PARALLEL="1"
$env:OLLAMA_MAX_LOADED_MODELS="1"

ollama run deepseek-r1:8b "Return exactly READY"
ollama ps
ollama run deepseek-r1:8b
```
