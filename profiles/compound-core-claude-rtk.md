---
id: compound-core-claude-rtk
name: Compound Core (Claude + RTK)
frontend: claude
command: claude
backend: anthropic
mode: cloud-assisted
task_mode: compound-core
token_efficiency: rtk
status: unknown
description: CE brainstorm→plan→work→review on Claude Code. Pair with RTK in WSL for shell token savings.
---

# Compound Core Claude + RTK

Run Compound Engineering core workflow on Claude Code. **Install RTK in WSL** (`rtk init -g`) before long sessions.

```powershell launch
cd /d {{PROJECT_PATH}}

Write-Host "Compound Core — Claude Code + RTK recommended"
Write-Host "WSL: rtk init -g && rtk gain"
Write-Host "Launch Claude Code in this directory and run /ce-brainstorm or CE workflow."

if (Get-Command wsl -ErrorAction SilentlyContinue) {
  wsl -e bash -lc "command -v rtk >/dev/null && rtk gain || echo 'RTK not installed in WSL — see docs/TOKEN_EFFICIENCY.md'"
}

claude
```