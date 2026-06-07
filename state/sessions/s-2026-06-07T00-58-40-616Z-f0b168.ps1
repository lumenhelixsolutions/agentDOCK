# AgentDock session s-2026-06-07T00-58-40-616Z-f0b168
# Profile: hermes-local-llama31-64k
$ErrorActionPreference = 'Continue'

cd /d D:\projects\agentdock

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
