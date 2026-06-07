# AgentDock Launch Log

Session: s-2026-06-07T02-56-48-904Z-2ef1fd
Profile: cloud-heavy-refactor-claude
Started: 2026-06-07T02:56:48.948Z
Ended: 2026-06-07T02:56:54.366Z
ExitCode: 0

## Output

```text
[stderr] Set-Location : A positional parameter cannot be found that accepts argument 'D:\projects\agentdock'.
At D:\projects\agentdock\state\sessions\s-2026-06-07T02-56-48-904Z-2ef1fd.ps1:5 char:1
+ cd /d D:\projects\agentdock
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidArgument: (:) [Set-Location], ParameterBindingException
    + FullyQualifiedErrorId : PositionalParameterNotFound,Microsoft.PowerShell.Commands.SetLocationCommand
 
ANTHROPIC_API_KEY is missing. Cloud auth may prompt.
[stderr] Warning: no stdin data received in 3s, proceeding without it. If piping from a slow command, redirect stdin explicitly: < /dev/null to skip, or wait longer.
[stderr] Error: Input must be provided either through stdin or as a prompt argument when using --print

```
