# AgentDock Launch Log

Session: s-2026-06-07T00-58-40-616Z-f0b168
Profile: hermes-local-llama31-64k
Started: 2026-06-07T00:58:40.662Z
Ended: 2026-06-07T01:38:57.628Z
ExitCode: 1

## Output

```text
[stderr] Set-Location : A positional parameter cannot be found that accepts argument 'D:\projects\agentdock'.
At D:\projects\agentdock\state\sessions\s-2026-06-07T00-58-40-616Z-f0b168.ps1:5 char:1
[stderr] + cd /d D:\projects\agentdock
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidArgument: (:) [Set-Location], ParameterBindingException
    + FullyQualifiedErrorId : PositionalParameterNotFound,Microsoft.PowerShell.Commands.SetLocationCommand
 
Stopping existing Ollama instance if present...
SUCCESS: The process "ollama.exe" with PID 81304 has been terminated.
Starting Ollama in 64K optimized mode...
Warming llama31-hermes-64k and verifying context...

```
