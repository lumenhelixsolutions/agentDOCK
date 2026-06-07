param(
  [string]$RepoPath = (Get-Location).Path,
  [int]$MaxEnvFiles = 250
)

function Command-Info($name) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if ($null -eq $cmd) { return @{ present = $false; path = $null; version = $null } }
  $version = $null
  try {
    switch ($name) {
      'node' { $version = (& node --version 2>$null | Out-String).Trim() }
      'npm' { $version = (& npm --version 2>$null | Out-String).Trim() }
      'python' { $version = (& python --version 2>&1 | Out-String).Trim() }
      'git' { $version = (& git --version 2>$null | Out-String).Trim() }
      'ollama' { $version = (& ollama --version 2>$null | Out-String).Trim() }
      'hermes' { $version = (& hermes --version 2>$null | Out-String).Trim() }
      'opencode' { $version = (& opencode --version 2>$null | Out-String).Trim() }
      'codex' { $version = (& codex --version 2>$null | Out-String).Trim() }
      'kimi' { $version = (& kimi --version 2>$null | Out-String).Trim() }
      'claude' { $version = (& claude --version 2>$null | Out-String).Trim() }
      'aider' { $version = (& aider --version 2>$null | Out-String).Trim() }
      'gemini' { $version = (& gemini --version 2>$null | Out-String).Trim() }
      'goose' { $version = (& goose --version 2>$null | Out-String).Trim() }
      default { $version = $null }
    }
  } catch { $version = $null }
  return @{ present = $true; path = $cmd.Source; version = $version }
}

function Env-State($name) {
  $value = [Environment]::GetEnvironmentVariable($name, 'Process')
  if ([string]::IsNullOrEmpty($value)) { $value = [Environment]::GetEnvironmentVariable($name, 'User') }
  if ([string]::IsNullOrEmpty($value)) { $value = [Environment]::GetEnvironmentVariable($name, 'Machine') }
  $isSecret = $name -match 'KEY|TOKEN|SECRET|PASSWORD'
  return @{ present = -not [string]::IsNullOrEmpty($value); value = $(if ($isSecret -and $value) { '[present-redacted]' } else { $value }) }
}

function Parse-OllamaPs($raw) {
  $models = @()
  if ([string]::IsNullOrWhiteSpace($raw)) { return $models }
  foreach ($line in ($raw -split "`r?`n")) {
    $t = $line.Trim()
    if (!$t -or $t -match '^NAME\s+') { continue }
    $rx = '^(\S+)\s+(\S+)\s+(.+?)\s+((?:\d+%\/\d+%|\d+%)\s+\S+(?:\/\S+)?)\s+(\d{3,6})\s+(.+)$'
    $m = [regex]::Match($t, $rx)
    if ($m.Success) {
      $models += @{ name = $m.Groups[1].Value; id = $m.Groups[2].Value; size = $m.Groups[3].Value.Trim(); processor = $m.Groups[4].Value; context = [int]$m.Groups[5].Value; until = $m.Groups[6].Value }
    } else {
      $models += @{ name = ($t -split '\s+')[0]; raw = $t; context = $null }
    }
  }
  return $models
}

function Read-InterestingEnvFile($file) {
  $interestingKeys = @(
    'OPENAI_API_KEY','ANTHROPIC_API_KEY','CLAUDE_API_KEY','OPENROUTER_API_KEY','MOONSHOT_API_KEY','DEEPSEEK_API_KEY',
    'GEMINI_API_KEY','GOOGLE_API_KEY','GROQ_API_KEY','MISTRAL_API_KEY','TOGETHER_API_KEY','COHERE_API_KEY','XAI_API_KEY',
    'HUGGINGFACE_API_KEY','HF_TOKEN','OLLAMA_HOST','OLLAMA_CONTEXT_LENGTH','OLLAMA_FLASH_ATTENTION','OLLAMA_KV_CACHE_TYPE',
    'MODEL','MODEL_NAME','MODEL_PROVIDER','PROVIDER','BASE_URL','API_BASE','AZURE_OPENAI_API_KEY','AWS_ACCESS_KEY_ID'
  )
  $providerHints = @()
  $keys = @()
  $secretKeys = @()
  $modelKeys = @()
  try {
    if ($file.Length -gt 1048576) { return $null }
    $lines = Get-Content -LiteralPath $file.FullName -ErrorAction Stop -TotalCount 500
    foreach ($line in $lines) {
      $trim = $line.Trim()
      if (!$trim -or $trim.StartsWith('#')) { continue }
      $m = [regex]::Match($trim, '^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=')
      if (!$m.Success) { continue }
      $key = $m.Groups[1].Value
      $isInteresting = ($interestingKeys -contains $key) -or ($key -match 'API|KEY|TOKEN|SECRET|MODEL|PROVIDER|BASE_URL|OLLAMA|ANTHROPIC|OPENAI|OPENROUTER|MOONSHOT|DEEPSEEK|GEMINI|GROQ|MISTRAL')
      if ($isInteresting) {
        $keys += $key
        if ($key -match 'KEY|TOKEN|SECRET|PASSWORD') { $secretKeys += $key }
        if ($key -match 'MODEL|PROVIDER|BASE_URL|OLLAMA') { $modelKeys += $key }
        switch -Regex ($key) {
          'OPENAI' { $providerHints += 'openai' }
          'ANTHROPIC|CLAUDE' { $providerHints += 'anthropic/claude' }
          'OPENROUTER' { $providerHints += 'openrouter' }
          'MOONSHOT|KIMI' { $providerHints += 'moonshot/kimi' }
          'DEEPSEEK' { $providerHints += 'deepseek' }
          'GEMINI|GOOGLE' { $providerHints += 'google/gemini' }
          'OLLAMA' { $providerHints += 'ollama' }
          'GROQ' { $providerHints += 'groq' }
          'MISTRAL' { $providerHints += 'mistral' }
          'HUGGINGFACE|HF_' { $providerHints += 'huggingface' }
        }
      }
    }
    $keys = @($keys | Select-Object -Unique)
    if ($keys.Count -eq 0) { return $null }
    return @{
      path = $file.FullName
      name = $file.Name
      size_bytes = $file.Length
      modified = $file.LastWriteTime.ToString('o')
      key_names = $keys
      secret_key_names = @($secretKeys | Select-Object -Unique)
      model_config_keys = @($modelKeys | Select-Object -Unique)
      provider_hints = @($providerHints | Select-Object -Unique)
      secret_count = @($secretKeys | Select-Object -Unique).Count
      values_redacted = $true
    }
  } catch { return $null }
}

function Find-EnvFiles($repoPath, $maxFiles) {
  $roots = @()
  if ($repoPath -and (Test-Path $repoPath)) { $roots += (Resolve-Path $repoPath).Path }
  $home = [Environment]::GetFolderPath('UserProfile')
  foreach ($candidate in @(
    (Join-Path $home '.hermes'),
    (Join-Path $home '.codex'),
    (Join-Path $home '.claude'),
    (Join-Path $home '.config'),
    (Join-Path $home 'Documents'),
    (Join-Path $home 'Desktop'),
    'D:\projects',
    'C:\projects'
  )) { if (Test-Path $candidate) { $roots += $candidate } }
  $roots = @($roots | Select-Object -Unique)
  $found = @()
  foreach ($root in $roots) {
    if ($found.Count -ge $maxFiles) { break }
    try {
      $files = Get-ChildItem -LiteralPath $root -Force -File -Recurse -Depth 5 -ErrorAction SilentlyContinue |
        Where-Object {
          $_.Name -match '^\.env(\..*)?$|\.env$|env\.local$|\.envrc$' -and
          $_.FullName -notmatch '\\(node_modules|\.git|\.venv|venv|dist|build|\.next|target|obj|bin|AppData\\Local\\Temp)\\'
        } |
        Select-Object -First ([Math]::Max(1, $maxFiles - $found.Count))
      foreach ($f in $files) {
        $info = Read-InterestingEnvFile $f
        if ($null -ne $info) { $found += $info }
      }
    } catch {}
  }
  return $found
}

function Detect-VSCodeExtensions() {
  $home = [Environment]::GetFolderPath('UserProfile')
  $dirs = @(
    (Join-Path $home '.vscode\extensions'),
    (Join-Path $home '.cursor\extensions'),
    (Join-Path $home '.windsurf\extensions')
  )
  $ext = @()
  foreach ($d in $dirs) {
    if (!(Test-Path $d)) { continue }
    try {
      foreach ($item in Get-ChildItem -LiteralPath $d -Directory -ErrorAction SilentlyContinue) {
        $name = $item.Name.ToLowerInvariant()
        if ($name -match 'cline|roo|continue|copilot|cursor|windsurf') {
          $ext += @{ name = $item.Name; path = $item.FullName; family = $(if ($name -match 'cline') {'cline'} elseif ($name -match 'roo') {'roo-code'} elseif ($name -match 'continue') {'continue'} elseif ($name -match 'copilot') {'github-copilot'} else {'ide-agent'}) }
        }
      }
    } catch {}
  }
  return $ext
}

function Detect-NpmGlobals() {
  $result = @{ present = $false; packages = @(); raw = $null }
  if (!(Get-Command npm -ErrorAction SilentlyContinue)) { return $result }
  try {
    $json = (& npm list -g --depth=0 --json 2>$null | Out-String)
    $result.present = $true
    $result.raw = $json
    $obj = $json | ConvertFrom-Json
    if ($obj.dependencies) {
      foreach ($p in $obj.dependencies.PSObject.Properties) {
        if ($p.Name -match 'codex|claude|opencode|kimi|aider|gemini|continue|cline|roo') {
          $result.packages += @{ name = $p.Name; version = $p.Value.version }
        }
      }
    }
  } catch {}
  return $result
}

$system = @{ os = [System.Environment]::OSVersion.VersionString; powershell = $PSVersionTable.PSVersion.ToString(); user = [Environment]::UserName; machine = [Environment]::MachineName; timestamp = (Get-Date).ToString('o') }

$cpu = $null; $ramGb = $null
try {
  $cpu = (Get-CimInstance Win32_Processor | Select-Object -First 1).Name
  $mem = Get-CimInstance Win32_ComputerSystem
  $ramGb = [math]::Round($mem.TotalPhysicalMemory / 1GB, 2)
} catch {}

$gpus = @()
try {
  $nvsmi = Get-Command nvidia-smi -ErrorAction SilentlyContinue
  if ($nvsmi) {
    $raw = & nvidia-smi --query-gpu=name,memory.total,memory.free,driver_version --format=csv,noheader,nounits 2>$null
    foreach ($line in $raw) {
      $parts = $line -split ',\s*'
      if ($parts.Length -ge 4) { $gpus += @{ name = $parts[0]; memory_total_mb = [int]$parts[1]; memory_free_mb = [int]$parts[2]; driver = $parts[3] } }
    }
  }
  if ($gpus.Count -eq 0) {
    foreach ($vc in Get-CimInstance Win32_VideoController) {
      $gpus += @{ name = $vc.Name; memory_total_mb = $(if ($vc.AdapterRAM) { [math]::Round($vc.AdapterRAM / 1MB) } else { $null }); memory_free_mb = $null; driver = $vc.DriverVersion }
    }
  }
} catch {}

$disk = @()
try {
  foreach ($d in Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3") { $disk += @{ name = $d.DeviceID; free_gb = [math]::Round($d.FreeSpace/1GB,2); size_gb = [math]::Round($d.Size/1GB,2) } }
} catch {}

$commands = @('ollama','hermes','opencode','codex','kimi','claude','aider','gemini','goose','git','node','npm','python','code','cursor','windsurf','docker')
$tools = @{}
foreach ($t in $commands) { $tools[$t] = Command-Info $t }

$coders = @(
  @{ id='hermes'; name='Hermes Agent'; command='hermes'; detection=$tools.hermes },
  @{ id='opencode'; name='OpenCode'; command='opencode'; detection=$tools.opencode },
  @{ id='codex'; name='OpenAI Codex CLI'; command='codex'; detection=$tools.codex },
  @{ id='kimi'; name='Kimi Code CLI'; command='kimi'; detection=$tools.kimi },
  @{ id='claude-code'; name='Claude Code'; command='claude'; detection=$tools.claude },
  @{ id='aider'; name='Aider'; command='aider'; detection=$tools.aider },
  @{ id='gemini-cli'; name='Gemini CLI'; command='gemini'; detection=$tools.gemini },
  @{ id='goose'; name='Goose'; command='goose'; detection=$tools.goose }
)

$extensions = Detect-VSCodeExtensions
foreach ($x in $extensions) { $coders += @{ id=$x.family; name=$x.name; command=$null; detection=@{ present=$true; path=$x.path; version=$null; source='vscode-extension' } } }

$ollamaListRaw = ''
$ollamaPsRaw = ''
if ($tools.ollama.present) {
  try { $ollamaListRaw = (& ollama list 2>$null | Out-String) } catch { $ollamaListRaw = '' }
  try { $ollamaPsRaw = (& ollama ps 2>$null | Out-String) } catch { $ollamaPsRaw = '' }
}

$env = @{}
foreach ($e in @('OLLAMA_CONTEXT_LENGTH','OLLAMA_FLASH_ATTENTION','OLLAMA_KV_CACHE_TYPE','OLLAMA_NUM_PARALLEL','OLLAMA_MAX_LOADED_MODELS','OPENAI_API_KEY','OPENROUTER_API_KEY','MOONSHOT_API_KEY','DEEPSEEK_API_KEY','ANTHROPIC_API_KEY','GEMINI_API_KEY','GOOGLE_API_KEY','GROQ_API_KEY','MISTRAL_API_KEY','HF_TOKEN')) { $env[$e] = Env-State $e }

$repo = @{ path = $RepoPath; exists = (Test-Path $RepoPath); git = @{ present = $false } }
try {
  if ((Test-Path $RepoPath) -and $tools.git.present) {
    Push-Location $RepoPath
    $inside = (& git rev-parse --is-inside-work-tree 2>$null | Out-String).Trim()
    if ($inside -eq 'true') {
      $repo.git.present = $true
      $repo.git.branch = (& git branch --show-current 2>$null | Out-String).Trim()
      $repo.git.status_short = (& git status --short 2>$null | Out-String).Trim()
      $repo.git.clean = [string]::IsNullOrWhiteSpace($repo.git.status_short)
    }
    $packageJson = Join-Path $RepoPath 'package.json'
    $repo.package_json = (Test-Path $packageJson)
    if ($repo.package_json) {
      try { $pkg = Get-Content $packageJson -Raw | ConvertFrom-Json; $repo.scripts = $pkg.scripts } catch {}
    }
    Pop-Location
  }
} catch { try { Pop-Location } catch {} }

$envFiles = Find-EnvFiles -repoPath $RepoPath -maxFiles $MaxEnvFiles
$npmGlobals = Detect-NpmGlobals

$result = @{
  system = $system
  hardware = @{ cpu = $cpu; ram_gb = $ramGb; gpu = $gpus; disk = $disk }
  tools = $tools
  coders = $coders
  ide_extensions = $extensions
  npm_globals = $npmGlobals
  env = $env
  env_files = $envFiles
  ollama = @{ list_raw = $ollamaListRaw; ps_raw = $ollamaPsRaw; loaded_models = (Parse-OllamaPs $ollamaPsRaw) }
  repo = $repo
}

$result | ConvertTo-Json -Depth 12
