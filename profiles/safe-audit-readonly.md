---
id: safe-audit-readonly
name: Safe Audit Read-Only
frontend: hermes
command: hermes
backend: ollama
mode: full-local
task_mode: read-only
model: llama31-hermes-64k
required_context: 64000
status: known-good
description: Local read-only audit mode. Starts Hermes after reminding user not to grant write/shell permissions.
---

# Safe Audit Read-Only

Use this mode for private code review, bug discovery, and planning without intended writes.

```powershell launch
cd /d {{PROJECT_PATH}}
Write-Host "READ-ONLY AUDIT MODE"
Write-Host "Do not approve file writes, deletes, git pushes, or destructive shell commands."
ollama run llama31-hermes-64k "Return exactly READY"
ollama ps
hermes --tui
```
