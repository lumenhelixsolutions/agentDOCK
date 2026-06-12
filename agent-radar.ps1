# HOOT Agent Radar — detect running coding-agent processes system-wide
param(
  [string]$DockPids = ''
)

$ErrorActionPreference = 'SilentlyContinue'
$dockSet = @{}
if ($DockPids) {
  foreach ($p in ($DockPids -split ',')) {
    $n = 0
    if ([int]::TryParse($p.Trim(), [ref]$n) -and $n -gt 0) { $dockSet[$n] = $true }
  }
}

$agentRules = @(
  @{ id='claude-code'; name='Claude Code'; exe=@('claude.exe','claude'); cmd=@('claude-code','@anthropic-ai/claude-code','anthropic-ai/claude') }
  @{ id='codex'; name='OpenAI Codex'; exe=@('codex.exe','codex'); cmd=@('@openai/codex','openai/codex','codex-cli') }
  @{ id='gemini-cli'; name='Gemini CLI'; exe=@('gemini.exe','gemini'); cmd=@('@google/gemini','gemini-cli','google-gemini') }
  @{ id='hermes'; name='Hermes Agent'; exe=@('hermes.exe','hermes'); cmd=@('@nousresearch/hermes','hermes-agent') }
  @{ id='opencode'; name='OpenCode'; exe=@('opencode.exe','opencode'); cmd=@('opencode','sst/opencode') }
  @{ id='kimi'; name='Kimi CLI'; exe=@('kimi.exe','kimi'); cmd=@('@moonshot-ai/kimi','kimi-cli') }
  @{ id='aider'; name='Aider'; exe=@('aider.exe','aider'); cmd=@('aider','aider-chat') }
  @{ id='grok'; name='Grok CLI'; exe=@('grok.exe','grok','agent.exe'); cmd=@('grok-cli','xai/grok','\.grok') }
  @{ id='cursor-agent'; name='Cursor Agent'; exe=@('cursor.exe','Cursor.exe'); cmd=@('cursor-agent','cursor agent','composer','cursor-cli') }
  @{ id='windsurf'; name='Windsurf'; exe=@('windsurf.exe','Windsurf.exe'); cmd=@('windsurf','codeium/windsurf') }
  @{ id='continue'; name='Continue'; exe=@('continue.exe'); cmd=@('continue.dev','continue-cli') }
  @{ id='cline'; name='Cline'; exe=@('cline.exe'); cmd=@('cline','saoudrizwan/cline') }
  @{ id='roo'; name='Roo Code'; exe=@('roo.exe'); cmd=@('roo-code','roo code') }
)

function Test-AgentMatch($procName, $cmdLine, $rule) {
  $base = ($procName -replace '\.exe$','').ToLowerInvariant()
  foreach ($e in $rule.exe) {
    $eb = ($e -replace '\.exe$','').ToLowerInvariant()
    if ($base -eq $eb) {
      if ($base -eq 'agent' -and $rule.id -eq 'grok' -and $cmdLine -notmatch '\.grok') { continue }
      return $true
    }
  }
  if (-not $cmdLine) { return $false }
  $cl = $cmdLine.ToLowerInvariant()
  foreach ($c in $rule.cmd) {
    if ($cl.Contains($c.ToLowerInvariant())) { return $true }
  }
  return $false
}

$procs = Get-CimInstance Win32_Process |
  Where-Object { $_.Name -match 'node|python|codex|claude|gemini|hermes|opencode|kimi|aider|grok|agent|cursor|windsurf|continue|cline|roo|agy|goose' }

$matches = @()
$agentMap = @{}
$seenPids = @{}

foreach ($p in $procs) {
  $cmd = $p.CommandLine
  if (-not $cmd) { continue }
  foreach ($rule in $agentRules) {
    if (-not (Test-AgentMatch $p.Name $cmd $rule)) { continue }
    $pid = [int]$p.ProcessId
    if ($seenPids.ContainsKey($pid)) { break }
    $source = if ($dockSet.ContainsKey($pid) -or $cmd -match 'AGENTDOCK_SESSION_ID') { 'agentdock' } else { 'external' }
    $entry = @{
      pid = $pid
      name = $p.Name
      command = if ($cmd.Length -gt 240) { $cmd.Substring(0, 240) + '…' } else { $cmd }
      agent_id = $rule.id
      agent_name = $rule.name
      source = $source
    }
    $matches += $entry
    if (-not $agentMap.ContainsKey($rule.id)) {
      $agentMap[$rule.id] = @{ id = $rule.id; name = $rule.name; count = 0; dock = 0; external = 0; pids = @() }
    }
    $agentMap[$rule.id].count++
    if ($source -eq 'agentdock') { $agentMap[$rule.id].dock++ } else { $agentMap[$rule.id].external++ }
    $agentMap[$rule.id].pids += $pid
    $seenPids[$pid] = $true
    break
  }
}

$agents = @($agentMap.Values | Sort-Object { -$_.count })
$total = ($matches | Measure-Object).Count
$dock = ($matches | Where-Object { $_.source -eq 'agentdock' } | Measure-Object).Count
$external = $total - $dock

@{
  scanned_at = (Get-Date).ToUniversalTime().ToString('o')
  processes = $matches
  agents = $agents
  summary = @{
    total = $total
    dock = $dock
    external = $external
    agent_types = $agents.Count
  }
} | ConvertTo-Json -Depth 6 -Compress