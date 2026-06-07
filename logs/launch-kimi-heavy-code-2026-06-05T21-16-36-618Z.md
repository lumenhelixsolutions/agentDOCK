**********************
Windows PowerShell transcript start
Start time: 20260605171637
Username: DANU\cgp22
RunAs User: DANU\cgp22
Configuration Name: 
Machine: DANU (Microsoft Windows NT 10.0.26220.0)
Host Application: powershell.exe -NoExit -ExecutionPolicy Bypass -File D:\projects\agentdock\state\launch-kimi-heavy-code-2026-06-05T21-16-36-618Z.ps1
Process ID: 60464
PSVersion: 5.1.26100.8544
PSEdition: Desktop
PSCompatibleVersions: 1.0, 2.0, 3.0, 4.0, 5.0, 5.1.26100.8544
BuildVersion: 10.0.26100.8544
CLRVersion: 4.0.30319.42000
WSManStackVersion: 3.0
PSRemotingProtocolVersion: 2.3
SerializationVersion: 1.1.0.1
**********************
AgentDock launching profile: Kimi Heavy Code
Profile ID: kimi-heavy-code
Started: 2026-06-05T21:16:36.618Z
PS>TerminatingError(Set-Location): "A positional parameter cannot be found that accepts argument 'D:\projects\lookbook'."
Set-Location : A positional parameter cannot be found that accepts argument 'D:\projects\lookbook'.
At D:\projects\agentdock\state\launch-kimi-heavy-code-2026-06-05T21-16-36-618Z.ps1:11 char:1
+ cd /d D:\projects\lookbook
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidArgument: (:) [Set-Location], ParameterBindingException
    + FullyQualifiedErrorId : PositionalParameterNotFound,Microsoft.PowerShell.Commands.SetLocationCommand
Set-Location : A positional parameter cannot be found that accepts argument 'D:\projects\lookbook'.
At D:\projects\agentdock\state\launch-kimi-heavy-code-2026-06-05T21-16-36-618Z.ps1:11 char:1
+ cd /d D:\projects\lookbook
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidArgument: (:) [Set-Location], ParameterBindingException
    + FullyQualifiedErrorId : PositionalParameterNotFound,Microsoft.PowerShell.Commands.SetLocationCommand

kimi CLI is not installed or not on PATH.
