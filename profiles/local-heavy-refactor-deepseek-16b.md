---
id: local-heavy-refactor-deepseek-16b
name: Local Heavy Refactor (DeepSeek 16B)
frontend: ollama
command: ollama
backend: ollama
mode: full-local
model: deepseek-coder-v2:16b
required_context: 65536
task_mode: heavy-refactor
status: unknown
description: Complex refactor with DeepSeek Coder V2 16B via Ollama. Large context, GPU recommended.
---

# Local Heavy Refactor (DeepSeek 16B)

Complex refactor with DeepSeek Coder V2 16B.

```powershell preflight
ollama ps
```

```powershell launch
cd /d {{PROJECT_PATH}}

Write-Host "Local Heavy Refactor mode — DeepSeek Coder V2 16B."
$env:OLLAMA_CONTEXT_LENGTH="65536"
$env:OLLAMA_FLASH_ATTENTION="1"
$env:OLLAMA_KV_CACHE_TYPE="q8_0"
$env:OLLAMA_NUM_PARALLEL="1"
$env:OLLAMA_MAX_LOADED_MODELS="1"

ollama run deepseek-coder-v2:16b "Return exactly READY"
ollama ps
ollama run deepseek-coder-v2:16b
```
