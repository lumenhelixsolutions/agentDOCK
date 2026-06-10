---
id: local-safe-audit-llamacpp
name: Local Safe Audit (llama.cpp)
frontend: openai-compatible
command: llama-server
backend: llamacpp
mode: full-local
model: local-gguf
required_context: 8192
task_mode: safe-audit
token_efficiency: rtk
status: unknown
description: Read-only privacy audit via llama-server (llama.cpp). Uses user settings from AgentDock Settings.
---

# Local Safe Audit (llama.cpp)

Starts `llama-server` with your configured GGUF from **Settings → Local Inference**, then opens an OpenAI-compatible chat client pointed at the local server.

```powershell preflight
where {{LLAMACPP_BINARY}}
if (-not (Test-Path "{{LLAMACPP_MODEL}}")) { throw "GGUF model not configured. Set modelPath in AgentDock Settings → Local Inference." }
```

```powershell launch
cd /d {{PROJECT_PATH}}

Write-Host "Local Safe Audit — llama.cpp server on {{LLAMACPP_HOST}}:{{LLAMACPP_PORT}}"
Write-Host "Model: {{LLAMACPP_MODEL}}"

$bin = "{{LLAMACPP_BINARY}}"
$model = "{{LLAMACPP_MODEL}}"
$hostAddr = "{{LLAMACPP_HOST}}"
$port = {{LLAMACPP_PORT}}
$ctx = {{LLAMACPP_CONTEXT}}
$ngl = {{LLAMACPP_NGL}}
$threads = {{LLAMACPP_THREADS}}
$extra = "{{LLAMACPP_EXTRA_ARGS}}"

$args = @("-m", $model, "--host", $hostAddr, "--port", $port, "-c", "$ctx", "-ngl", "$ngl", "-t", "$threads")
if ($extra) { $args += $extra.Split(' ', [System.StringSplitOptions]::RemoveEmptyEntries) }

Write-Host "Starting: $bin $($args -join ' ')"
Start-Process -FilePath $bin -ArgumentList $args -NoNewWindow -PassThru
Start-Sleep -Seconds 3
Invoke-RestMethod -Uri "http://${hostAddr}:${port}/v1/models" -Method Get | ConvertTo-Json -Depth 4
Write-Host "OpenAI-compatible endpoint: http://${hostAddr}:${port}/v1"
Write-Host "Connect your agent with base URL above. Press Ctrl+C in server window to stop."
```