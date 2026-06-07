# AgentDock Launch Log

Session: s-2026-06-05T21-55-53-752Z-0291d7
Profile: codex-patch-test
Started: 2026-06-05T21:55:53.806Z
Ended: 2026-06-05T21:55:54.285Z
ExitCode: 0

## Output

```text
[stderr] Set-Location : A positional parameter cannot be found that accepts argument 'D:\projects\lookbook'.
At D:\projects\agentdock\state\sessions\s-2026-06-05T21-55-53-752Z-0291d7.ps1:5 char:1
[stderr] + cd /d D:\projects\lookbook
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidArgument: (:) [Set-Location], ParameterBindingException
    + FullyQualifiedErrorId : PositionalParameterNotFound,Microsoft.PowerShell.Commands.SetLocationCommand
 
[stderr] Error loading configuration: legacy `profile = "ollama-launch-codex-app"` config is no longer supported; use `--profile ollama-launch-codex-app` with `ollama-launch-codex-app.config.toml` instead

```
