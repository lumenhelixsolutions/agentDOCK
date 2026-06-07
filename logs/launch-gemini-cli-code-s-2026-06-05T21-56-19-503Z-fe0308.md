# AgentDock Launch Log

Session: s-2026-06-05T21-56-19-503Z-fe0308
Profile: gemini-cli-code
Started: 2026-06-05T21:56:19.540Z
Ended: 2026-06-05T21:56:21.398Z
ExitCode: 0

## Output

```text
[stderr] Set-Location : A positional parameter cannot be found that accepts argument 'D:\projects\lookbook'.
[stderr] At D:\projects\agentdock\state\sessions\s-2026-06-05T21-56-19-503Z-fe0308.ps1:5 char:1
+ cd /d D:\projects\lookbook
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidArgument: (:) [Set-Location], ParameterBindingException
    + FullyQualifiedErrorId : PositionalParameterNotFound,Microsoft.PowerShell.Commands.SetLocationCommand
 
[stderr] [31mGemini CLI is not running in a trusted directory. To proceed, either use `--skip-trust`, set the `GEMINI_CLI_TRUST_WORKSPACE=true` environment variable, or trust this directory in interactive mode. For more details, see https://geminicli.com/docs/cli/trusted-folders/#headless-and-automated-environments[0m

```
