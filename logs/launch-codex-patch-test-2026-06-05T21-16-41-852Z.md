**********************
Windows PowerShell transcript start
Start time: 20260605171642
Username: DANU\cgp22
RunAs User: DANU\cgp22
Configuration Name: 
Machine: DANU (Microsoft Windows NT 10.0.26220.0)
Host Application: powershell.exe -NoExit -ExecutionPolicy Bypass -File D:\projects\agentdock\state\launch-codex-patch-test-2026-06-05T21-16-41-852Z.ps1
Process ID: 49620
PSVersion: 5.1.26100.8544
PSEdition: Desktop
PSCompatibleVersions: 1.0, 2.0, 3.0, 4.0, 5.0, 5.1.26100.8544
BuildVersion: 10.0.26100.8544
CLRVersion: 4.0.30319.42000
WSManStackVersion: 3.0
PSRemotingProtocolVersion: 2.3
SerializationVersion: 1.1.0.1
**********************
AgentDock launching profile: Codex Patch/Test
Profile ID: codex-patch-test
Started: 2026-06-05T21:16:41.852Z
PS>TerminatingError(Set-Location): "A positional parameter cannot be found that accepts argument 'D:\projects\lookbook'."
Set-Location : A positional parameter cannot be found that accepts argument 'D:\projects\lookbook'.
At D:\projects\agentdock\state\launch-codex-patch-test-2026-06-05T21-16-41-852Z.ps1:11 char:1
+ cd /d D:\projects\lookbook
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidArgument: (:) [Set-Location], ParameterBindingException
    + FullyQualifiedErrorId : PositionalParameterNotFound,Microsoft.PowerShell.Commands.SetLocationCommand
Set-Location : A positional parameter cannot be found that accepts argument 'D:\projects\lookbook'.
At D:\projects\agentdock\state\launch-codex-patch-test-2026-06-05T21-16-41-852Z.ps1:11 char:1
+ cd /d D:\projects\lookbook
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidArgument: (:) [Set-Location], ParameterBindingException
    + FullyQualifiedErrorId : PositionalParameterNotFound,Microsoft.PowerShell.Commands.SetLocationCommand

Error loading configuration: legacy `profile = "ollama-launch-codex-app"` config is no longer supported; use `--profile
ollama-launch-codex-app` with `ollama-launch-codex-app.config.toml` instead
AgentDock launch script completed.
**********************
Windows PowerShell transcript end
End time: 20260605171642
**********************
