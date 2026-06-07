---
id: local-code-assist-deepseek-6.7b
name: Local Code Assist (DeepSeek Coder 6.7B)
frontend: ollama
command: ollama
backend: ollama
mode: full-local
model: deepseek-coder:6.7b
required_context: 16384
task_mode: code-review
status: unknown
description: Coding assistance with DeepSeek Coder 6.7B via Ollama. Fast and capable for most coding tasks.
---

# Local Code Assist (DeepSeek Coder 6.7B)

Coding assistance with DeepSeek Coder 6.7B.

```powershell preflight
ollama ps
```

```powershell launch
cd /d {{PROJECT_PATH}}

Write-Host "Local Code Assist mode — DeepSeek Coder 6.7B."
$env:OLLAMA_CONTEXT_LENGTH="16384"
$env:OLLAMA_FLASH_ATTENTION="1"
$env:OLLAMA_KV_CACHE_TYPE="q8_0"
$env:OLLAMA_NUM_PARALLEL="1"
$env:OLLAMA_MAX_LOADED_MODELS="1"

ollama run deepseek-coder:6.7b "Return exactly READY"
ollama ps
ollama run deepseek-coder:6.7b
```
