---
id: local-reasoning-deepseek-r1-32b
name: Local Reasoning (DeepSeek R1 32B)
frontend: ollama
command: ollama
backend: ollama
mode: full-local
model: deepseek-r1:32b
required_context: 65536
task_mode: heavy-refactor
status: unknown
description: Deep reasoning with DeepSeek R1 32B via Ollama. Best local choice for complex tasks. GPU strongly recommended.
---

# Local Reasoning (DeepSeek R1 32B)

Deep reasoning with DeepSeek R1 32B.

```powershell preflight
ollama ps
```

```powershell launch
cd /d {{PROJECT_PATH}}

Write-Host "Local Reasoning mode — DeepSeek R1 32B."
$env:OLLAMA_CONTEXT_LENGTH="65536"
$env:OLLAMA_FLASH_ATTENTION="1"
$env:OLLAMA_KV_CACHE_TYPE="q8_0"
$env:OLLAMA_NUM_PARALLEL="1"
$env:OLLAMA_MAX_LOADED_MODELS="1"

ollama run deepseek-r1:32b "Return exactly READY"
ollama ps
ollama run deepseek-r1:32b
```
