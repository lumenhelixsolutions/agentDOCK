/*
  AgentDock 1.1
  Local-only AI agent stack scanner, planner, terminal monitor, launcher, and memory system.
  - No external npm dependencies.
  - Binds to 127.0.0.1 only.
  - Executes only commands embedded in approved profile markdown files.
  - Captures launch stdout/stderr in an integrated terminal monitor.
*/

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execFile } = require('child_process');
const https = require('https');
const { advisorAnalyze } = require('./advisor');
const { processChatMessage, getChatHistory, clearChat } = require('./chat');

const ROOT = __dirname;
const HOST = '127.0.0.1';
const PORT = Number(process.env.AGENTDOCK_PORT || 7777);

const DIRS = {
  profiles: path.join(ROOT, 'profiles'),
  logs: path.join(ROOT, 'logs'),
  briefs: path.join(ROOT, 'briefs'),
  state: path.join(ROOT, 'state'),
  sessions: path.join(ROOT, 'state', 'sessions'),
};
for (const dir of Object.values(DIRS)) fs.mkdirSync(dir, { recursive: true });

const FILES = {
  index: path.join(ROOT, 'index.html'),
  scanner: path.join(ROOT, 'scanner.ps1'),
  memory: path.join(ROOT, 'memory.md'),
  rules: path.join(ROOT, 'compatibility-rules.json'),
  sources: path.join(ROOT, 'research-sources.md'),
  catalog: path.join(ROOT, 'coders-catalog.json'),
  usage: path.join(DIRS.state, 'stack-usage.json'),
  projects: path.join(DIRS.state, 'projects.json'),
};

let lastScan = null;
let activeProject = null;
const sessions = new Map();

// Load active project on startup
(function initActiveProject() {
  const proj = readJSON(FILES.projects, { projects: [], active: null });
  if (proj.active && fs.existsSync(proj.active)) activeProject = path.normalize(proj.active);
})();

function nowStamp() { return new Date().toISOString().replace(/[:.]/g, '-'); }
function isWindows() { return process.platform === 'win32'; }
function psExe() { return isWindows() ? 'powershell.exe' : (process.env.SHELL || 'pwsh'); }

function safeJoin(base, userPath) {
  const resolved = path.resolve(base, userPath || '');
  if (!resolved.startsWith(path.resolve(base))) throw new Error('Path escapes allowed directory');
  return resolved;
}

function send(res, status, body, contentType = 'application/json') {
  const data = contentType === 'application/json' ? JSON.stringify(body, null, 2) : body;
  res.writeHead(status, {
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
  });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1024 * 1024) reject(new Error('Request too large'));
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try { resolve(JSON.parse(body)); }
      catch { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

function parseScalar(v) {
  v = String(v ?? '').trim();
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+$/.test(v)) return Number(v);
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
  return v;
}

function parseFrontmatter(raw) {
  const result = { meta: {}, body: raw };
  if (!raw.startsWith('---')) return result;
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return result;
  const fm = raw.slice(3, end).trim();
  result.body = raw.slice(end + 4).trim();
  let currentKey = null;
  for (const line of fm.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const listMatch = /^\s*-\s*(.+)$/.exec(line);
    if (listMatch && currentKey) {
      if (!Array.isArray(result.meta[currentKey])) result.meta[currentKey] = [];
      result.meta[currentKey].push(parseScalar(listMatch[1]));
      continue;
    }
    const m = /^([A-Za-z0-9_\-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1];
    currentKey = key;
    const value = m[2].trim();
    if (value === '') result.meta[key] = [];
    else if (value.startsWith('[') && value.endsWith(']')) result.meta[key] = value.slice(1, -1).split(',').map(x => parseScalar(x)).filter(Boolean);
    else result.meta[key] = parseScalar(value);
  }
  return result;
}

function extractBlock(body, name) {
  const m = new RegExp('```(?:powershell|ps1)\\s+' + name + '\\s*\\n([\\s\\S]*?)```', 'i').exec(body);
  return m ? m[1].trim() : '';
}
function extractLaunchScript(body) { return extractBlock(body, 'launch'); }
function extractPreflightScript(body) { return extractBlock(body, 'preflight'); }

function listProfiles() {
  if (!fs.existsSync(DIRS.profiles)) return [];
  return fs.readdirSync(DIRS.profiles)
    .filter(f => f.endsWith('.md'))
    .map(file => {
      const full = safeJoin(DIRS.profiles, file);
      const raw = fs.readFileSync(full, 'utf8');
      const parsed = parseFrontmatter(raw);
      const id = parsed.meta.id || path.basename(file, '.md');
      return {
        id,
        file,
        name: parsed.meta.name || id,
        meta: parsed.meta,
        body: parsed.body,
        hasLaunch: Boolean(extractLaunchScript(parsed.body)),
        hasPreflight: Boolean(extractPreflightScript(parsed.body)),
      };
    });
}
function getProfile(id) { return listProfiles().find(p => p.id === id) || null; }

function getProjectDir(dirPath) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const hasGit = entries.some(e => e.isDirectory() && e.name === '.git');
    const hasPackageJson = entries.some(e => e.isFile() && e.name === 'package.json');
    const hasAgentsMd = entries.some(e => e.isFile() && e.name === 'AGENTS.md');
    const hasReadme = entries.some(e => e.isFile() && e.name.toLowerCase().startsWith('readme'));
    const subdirs = entries.filter(e => e.isDirectory() && !e.name.startsWith('.') && !e.name.startsWith('node_modules')).map(e => e.name);
    let type = 'generic';
    if (subdirs.includes('apps') && (subdirs.includes('Source') || subdirs.includes('Content'))) type = 'ue5';
    else if (hasPackageJson) type = 'node';
    else if (entries.some(e => e.isFile() && e.name.endsWith('.py'))) type = 'python';
    else if (entries.some(e => e.isFile() && e.name.endsWith('.rs'))) type = 'rust';
    else if (hasGit && subdirs.includes('.github')) type = 'github';
    return { hasGit, hasPackageJson, hasAgentsMd, hasReadme, type, subdirs: subdirs.slice(0, 10) };
  } catch { return { hasGit: false, hasPackageJson: false, hasAgentsMd: false, hasReadme: false, type: 'unknown', subdirs: [] }; }
}

function discoverProjects() {
  const roots = ['D:/projects', 'C:/projects'];
  const found = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    try {
      const entries = fs.readdirSync(root, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const fullPath = path.join(root, entry.name);
        const info = getProjectDir(fullPath);
        if (info.hasGit || info.hasPackageJson || info.hasAgentsMd || info.hasReadme) {
          const gitInfo = readGitStatus(fullPath);
          found.push({
            id: entry.name,
            path: path.normalize(fullPath),
            name: entry.name,
            type: info.type,
            hasGit: info.hasGit,
            hasAgentsMd: info.hasAgentsMd,
            lastOpened: null,
            git: gitInfo,
          });
        }
      }
    } catch {}
  }
  return found;
}

function readGitStatus(repoPath) {
  const result = { present: false, branch: null, clean: true, ahead: 0, behind: 0, uncommitted: 0, untracked: 0, modified: 0, hasRemote: false };
  if (!fs.existsSync(path.join(repoPath, '.git'))) return result;
  try {
    const { execSync } = require('child_process');
    const opts = { cwd: repoPath, encoding: 'utf8', timeout: 5000, windowsHide: true };
    const inside = execSync('git rev-parse --is-inside-work-tree', opts).trim();
    if (inside !== 'true') return result;
    result.present = true;
    result.branch = execSync('git branch --show-current', opts).trim();
    const status = execSync('git status --short', opts).trim();
    const lines = status ? status.split(/\r?\n/) : [];
    result.uncommitted = lines.length;
    result.untracked = lines.filter(l => l.startsWith('??')).length;
    result.modified = lines.filter(l => l.startsWith(' M') || l.startsWith('M ')).length;
    result.clean = lines.length === 0;
    try {
      const upstream = execSync('git rev-parse --abbrev-ref --symbolic-full-name @{u}', opts).trim();
      result.hasRemote = Boolean(upstream);
      if (result.hasRemote) {
        const aheadBehind = execSync('git rev-list --left-right --count HEAD...@{u}', opts).trim();
        const [ahead, behind] = aheadBehind.split(/\s+/).map(Number);
        result.ahead = ahead || 0;
        result.behind = behind || 0;
      }
    } catch { result.hasRemote = false; }
  } catch {}
  return result;
}

function readProjectRegistry() {
  const data = readJSON(FILES.projects, { projects: [], active: null });
  const discovered = discoverProjects();
  const merged = [];
  const byPath = new Map();
  for (const p of data.projects) byPath.set(p.path, p);
  for (const d of discovered) {
    const existing = byPath.get(d.path);
    if (existing) {
      merged.push({ ...existing, git: d.git, type: d.type, hasGit: d.hasGit, hasAgentsMd: d.hasAgentsMd });
    } else {
      merged.push(d);
    }
  }
  data.projects = merged;
  writeJSON(FILES.projects, data);
  return data;
}

function setActiveProject(projectPath) {
  const normPath = path.normalize(projectPath || '');
  const data = readProjectRegistry();
  data.active = normPath;
  activeProject = normPath;
  const proj = data.projects.find(p => path.normalize(p.path || '') === normPath);
  if (proj) { proj.lastOpened = new Date().toISOString(); proj.git = readGitStatus(normPath); }
  writeJSON(FILES.projects, data);
  return data;
}

function readAgentsMd(projectPath) {
  const file = path.join(projectPath, 'AGENTS.md');
  if (!fs.existsSync(file)) return null;
  try { return fs.readFileSync(file, 'utf8'); } catch { return null; }
}

function injectProjectPath(script, projectPath) {
  if (!projectPath) return script;
  const winPath = projectPath.replace(/\//g, '\\');
  const unixPath = projectPath.replace(/\\/g, '/');
  return script
    .replace(/\{\{PROJECT_PATH\}\}/g, winPath)
    .replace(/\{\{PROJECT_PATH_UNIX\}\}/g, unixPath);
}

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function writeJSON(file, obj) { fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8'); }
function readMemory() { return fs.existsSync(FILES.memory) ? fs.readFileSync(FILES.memory, 'utf8') : '# AgentDock Memory\n'; }
function appendMemory(entry) {
  const block = `\n\n## Evidence: ${entry.title || entry.profileId || 'unknown'}\nDate: ${new Date().toISOString()}\nProfile: ${entry.profileId || 'n/a'}\nStatus: ${entry.status || 'unknown'}\nObserved: ${entry.observed || 'n/a'}\nReason: ${entry.reason || 'n/a'}\n`;
  fs.appendFileSync(FILES.memory, block, 'utf8');
}
function memoryBlocks(memory) {
  const blocks = [];
  const parts = memory.split(/\n(?=## Evidence: )/g);
  for (const part of parts) {
    const title = /## Evidence:\s*(.+)/.exec(part)?.[1]?.trim();
    if (!title) continue;
    const status = /^Status:\s*(.+)$/mi.exec(part)?.[1]?.trim().toLowerCase() || '';
    const profile = /^Profile:\s*(.+)$/mi.exec(part)?.[1]?.trim() || '';
    const observed = /^Observed:\s*(.+)$/mi.exec(part)?.[1]?.trim() || '';
    blocks.push({ title, status, profile, observed, raw: part });
  }
  return blocks;
}
function isBlockedByMemory(profile, memory) {
  const blocks = memoryBlocks(memory);
  const profileId = String(profile.id || '').toLowerCase();
  const profileModel = String(profile.meta.model || '').toLowerCase();
  return blocks.find(b => {
    if (b.status !== 'blocked') return false;
    const blockProfile = String(b.profile || '').toLowerCase();
    const blockTitle = String(b.title || '').toLowerCase();
    // Exact profile ID match
    if (blockProfile === profileId) return true;
    if (blockTitle === profileId) return true;
    // Exact model match (e.g. qwen blocking should not block llama)
    if (profileModel && (blockProfile === profileModel || blockTitle === profileModel)) return true;
    // Title contains profile id as a whole word (e.g. "codex-patch-test run" should not block "codex" generally)
    if (profileId && (blockTitle === profileId || blockProfile === profileId)) return true;
    return false;
  });
}

function parseOllamaPsRaw(raw) {
  const models = [];
  if (!raw) return models;
  for (const line of String(raw).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || /^NAME\s+/i.test(trimmed)) continue;
    const m = /^(\S+)\s+(\S+)\s+(.+?)\s+((?:\d+%\/\d+%|\d+%)\s+\S+(?:\/\S+)?)\s+(\d{3,6})\s+(.+)$/.exec(trimmed);
    if (m) models.push({ name: m[1], id: m[2], size: m[3].trim(), processor: m[4], context: Number(m[5]), until: m[6] });
    else models.push({ name: trimmed.split(/\s+/)[0], raw: trimmed, context: null });
  }
  return models;
}
function normalizeLoadedModels(scan) {
  const raw = scan?.ollama?.loaded_models;
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && raw.name) return [raw];
  return parseOllamaPsRaw(scan?.ollama?.ps_raw);
}
function getLoadedModelContext(scan, modelName) {
  if (!scan || !modelName) return null;
  const variants = [modelName, `${modelName}:latest`].map(x => String(x).toLowerCase());
  const loaded = normalizeLoadedModels(scan);
  const found = loaded.find(m => variants.includes(String(m.name).toLowerCase()) || variants.some(v => String(m.name).toLowerCase().startsWith(v.replace(':latest', ''))));
  return found?.context ?? null;
}
function envPresent(scan, name) { return Boolean(scan?.env?.[name]?.present); }
function envFileHas(scan, name) { return (scan?.env_files || []).some(f => (f.key_names || []).includes(name)); }
function coderById(scan, id) { return (scan?.coders || []).find(c => c.id === id || c.command === id); }
function toolPresent(scan, toolOrId) {
  if (!scan) return false;
  if (scan.tools?.[toolOrId]?.present) return true;
  const c = coderById(scan, toolOrId);
  return Boolean(c?.detection?.present);
}

function loadCatalog() {
  return readJSON(FILES.catalog, { version: 'missing', tools: [] });
}
function catalogTool(id) { return loadCatalog().tools.find(t => t.id === id || t.command === id); }

function evaluateProfile(profile, scan, memory) {
  const reasons = [];
  let state = 'UNKNOWN';
  let score = 50;
  const blocked = isBlockedByMemory(profile, memory);
  if (blocked) return { state: 'BLOCKED', score: 0, reasons: [`Blocked by memory: ${blocked.title}`], blockedEvidence: blocked.raw.slice(0, 800) };

  const frontend = String(profile.meta.frontend || '').toLowerCase();
  const command = String(profile.meta.command || frontend || '').toLowerCase();
  const backend = String(profile.meta.backend || '').toLowerCase();
  const requiredContext = Number(profile.meta.required_context || 0);
  const model = profile.meta.model;
  const requiredEnv = Array.isArray(profile.meta.required_env) ? profile.meta.required_env : (profile.meta.required_env ? [profile.meta.required_env] : []);

  if (command && scan && !toolPresent(scan, command)) {
    reasons.push(`${command} not detected on PATH`);
    score -= 25;
  } else if (command && scan) {
    reasons.push(`${command} detected`);
    score += 10;
  }

  if (backend === 'ollama') {
    if (!scan?.tools?.ollama?.present) { reasons.push('Ollama not detected'); score -= 40; }
    else {
      reasons.push('Ollama detected'); score += 10;
      if (requiredContext && model) {
        const observed = getLoadedModelContext(scan, model);
        if (observed === null) { reasons.push(`Model ${model} is not currently loaded; context must be verified before launch`); score -= 5; }
        else if (observed >= requiredContext) { reasons.push(`Observed context ${observed} satisfies required ${requiredContext}`); score += 35; }
        else { reasons.push(`Observed context ${observed} is below required ${requiredContext}`); score -= 60; state = 'DEGRADED'; }
      }
    }
  }

  for (const envName of requiredEnv) {
    if (envPresent(scan, envName)) { reasons.push(`${envName} present in environment`); score += 7; }
    else if (envFileHas(scan, envName)) { reasons.push(`${envName} found in scanned .env file but not loaded into process environment`); score -= 4; }
    else { reasons.push(`${envName} missing`); score -= 20; }
  }

  if (profile.meta.status === 'known-good') { score += 15; reasons.push('Marked known-good in profile'); }
  if (profile.meta.status === 'blocked') return { state: 'BLOCKED', score: 0, reasons: ['Profile is statically blocked'] };

  // Session intelligence: success-rate adjustment
  const stats = getProfileStats(profile.id);
  if (stats.total > 0) {
    if (stats.successRate >= 80) { score += 10; reasons.push(`Success rate ${stats.successRate}% on this profile`); }
    else if (stats.successRate <= 40) { score -= 15; reasons.push(`Low success rate ${stats.successRate}%`); state = 'DEGRADED'; }
    if (stats.lastOutcome === 'failure') { score -= 8; reasons.push('Last run failed'); }
    else if (stats.lastOutcome === 'success') { score += 5; reasons.push('Last run succeeded'); }
  }

  if (state !== 'DEGRADED') {
    if (score >= 80) state = 'READY';
    else if (score >= 40) state = 'DEGRADED';
    else state = 'UNKNOWN';
  }
  return { state, score: Math.max(0, Math.min(100, score)), reasons, stats };
}

function buildSuggestions(scan = lastScan) {
  const catalog = loadCatalog();
  const suggestions = [];
  const envFiles = scan?.env_files || [];
  const envKeys = new Set(envFiles.flatMap(f => f.key_names || []));
  for (const tool of catalog.tools || []) {
    const detected = tool.command ? toolPresent(scan, tool.command) : Boolean((scan?.coders || []).some(c => c.id === tool.id && c.detection?.present));
    const authHints = [];
    if (tool.id === 'codex') authHints.push(envPresent(scan, 'OPENAI_API_KEY') ? 'OPENAI_API_KEY loaded' : envKeys.has('OPENAI_API_KEY') ? 'OPENAI_API_KEY found in .env' : 'OPENAI_API_KEY not detected');
    if (tool.id === 'claude-code') authHints.push(envPresent(scan, 'ANTHROPIC_API_KEY') ? 'ANTHROPIC_API_KEY loaded' : envKeys.has('ANTHROPIC_API_KEY') ? 'ANTHROPIC_API_KEY found in .env' : 'Anthropic auth not detected');
    if (tool.id === 'kimi') authHints.push(envPresent(scan, 'MOONSHOT_API_KEY') ? 'MOONSHOT_API_KEY loaded' : envKeys.has('MOONSHOT_API_KEY') ? 'MOONSHOT_API_KEY found in .env' : 'MOONSHOT_API_KEY not detected');
    if (tool.id === 'opencode') authHints.push(envPresent(scan, 'OPENROUTER_API_KEY') ? 'OPENROUTER_API_KEY loaded' : envKeys.has('OPENROUTER_API_KEY') ? 'OPENROUTER_API_KEY found in .env' : 'provider key not detected');
    let status = detected ? 'INSTALLED' : 'SUGGESTED';
    let priority = detected ? 100 : 40;
    if (tool.id === 'hermes' && detected) priority += 15;
    if (tool.id === 'codex' && (envPresent(scan, 'OPENAI_API_KEY') || envKeys.has('OPENAI_API_KEY'))) priority += 20;
    if (tool.id === 'claude-code' && (envPresent(scan, 'ANTHROPIC_API_KEY') || envKeys.has('ANTHROPIC_API_KEY'))) priority += 20;
    if (tool.id === 'kimi' && (envPresent(scan, 'MOONSHOT_API_KEY') || envKeys.has('MOONSHOT_API_KEY'))) priority += 20;
    suggestions.push({ ...tool, detected, status, priority, authHints });
  }
  return suggestions.sort((a, b) => b.priority - a.priority);
}

function buildPlan(goal, scan = lastScan) {
  const profiles = listProfiles();
  const memory = readMemory();
  const evaluated = profiles.map(p => ({ ...p, ...evaluateProfile(p, scan, memory) }));
  for (const p of evaluated) {
    const mode = String(p.meta.mode || '').toLowerCase();
    if (goal === 'privacy' && mode.includes('local')) p.score += 20;
    if (goal === 'fastest' && mode.includes('cloud')) p.score += 15;
    if (goal === 'cheapest' && String(p.meta.backend || '').includes('openrouter')) p.score += 15;
    if (goal === 'heavy' && String(p.meta.task_mode || '').includes('refactor')) p.score += 20;
    if (goal === 'audit' && String(p.meta.task_mode || '').includes('read-only')) p.score += 25;
  }
  evaluated.sort((a, b) => b.score - a.score);
  return { goal, recommended: evaluated.filter(p => p.state !== 'BLOCKED').slice(0, 8), blocked: evaluated.filter(p => p.state === 'BLOCKED'), suggestions: buildSuggestions(scan) };
}

function runScanner(repoPath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(FILES.scanner)) return reject(new Error('scanner.ps1 not found'));
    const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', FILES.scanner, '-RepoPath', repoPath || process.cwd()], { windowsHide: true });
    let out = '', err = '';
    child.stdout.on('data', d => out += d.toString());
    child.stderr.on('data', d => err += d.toString());
    child.on('close', code => {
      if (code !== 0) return reject(new Error(err || `scanner exited ${code}`));
      try {
        const parsed = JSON.parse(out);
        lastScan = parsed;
        const logPath = path.join(DIRS.logs, `scan-${nowStamp()}.json`);
        fs.writeFileSync(logPath, JSON.stringify(parsed, null, 2), 'utf8');
        resolve(parsed);
      } catch (e) { reject(new Error(`Failed to parse scanner JSON: ${e.message}\n${out.slice(0, 2000)}`)); }
    });
  });
}

function shouldWarnDanger(script) {
  const danger = /(remove-item|del\s+|rmdir|git\s+push|format-|setx\s+|reg\s+add|invoke-webrequest|irm\s+|iex\s+|curl\s+.*\|\s*(bash|sh|iex)|npm\s+i\s+-g)/i;
  return danger.test(script);
}

function writeSessionUsage(entry) {
  const usage = readJSON(FILES.usage, { launches: [] });
  usage.launches.push(entry);
  usage.launches = usage.launches.slice(-500);
  writeJSON(FILES.usage, usage);
}

function recordSessionOutcome(sessionId, outcome, notes) {
  const usage = readJSON(FILES.usage, { launches: [], outcomes: [] });
  if (!usage.outcomes) usage.outcomes = [];
  const launch = usage.launches.find(l => l.id === sessionId);
  usage.outcomes.push({
    sessionId,
    profileId: launch?.profileId,
    profileName: launch?.profileName,
    project: activeProject,
    outcome,
    notes: notes || '',
    timestamp: new Date().toISOString(),
  });
  usage.outcomes = usage.outcomes.slice(-500);
  writeJSON(FILES.usage, usage);
  // Smart memory: auto-block on repeated failures
  if (outcome === 'failure') {
    const recent = usage.outcomes.filter(o => o.profileId === launch?.profileId && o.project === activeProject && o.outcome === 'failure');
    if (recent.length >= 2) {
      appendMemory({ title: `${launch.profileId} auto-block`, profileId: launch.profileId, status: 'blocked', observed: `2 failures on ${activeProject}`, reason: `Auto-blocked after repeated failures on this project` });
    }
  }
}

function getProfileStats(profileId) {
  const usage = readJSON(FILES.usage, { launches: [], outcomes: [] });
  const outcomes = (usage.outcomes || []).filter(o => o.profileId === profileId);
  const total = outcomes.length;
  if (!total) return { total, successRate: null, lastOutcome: null };
  const successes = outcomes.filter(o => o.outcome === 'success').length;
  const last = outcomes[outcomes.length - 1];
  return { total, successRate: Math.round((successes / total) * 100), lastOutcome: last.outcome };
}

function searchSessions(query) {
  const usage = readJSON(FILES.usage, { launches: [], outcomes: [] });
  const results = [];
  for (const launch of usage.launches || []) {
    const logFile = path.join(DIRS.logs, `launch-${launch.profileId}-${launch.id}.md`);
    let text = '';
    try { text = fs.readFileSync(logFile, 'utf8'); } catch { continue; }
    if (text.toLowerCase().includes(query.toLowerCase())) {
      results.push({ id: launch.id, profileId: launch.profileId, profileName: launch.profileName, startedAt: launch.startedAt, exitCode: launch.exitCode });
    }
  }
  return results.slice(-50);
}

function getQuickTemplates() {
  const proj = activeProject ? readProjectRegistry().projects.find(p => p.path === activeProject) : null;
  const type = proj?.type || 'generic';
  const templates = [];
  if (type === 'ue5') {
    templates.push({ id: 'local-safe-audit', label: 'Audit C++', reason: 'UE5 projects benefit from local context' });
    templates.push({ id: 'cloud-heavy-refactor-claude', label: 'Refactor Blueprints', reason: 'Claude excels at Unreal patterns' });
    templates.push({ id: 'hybrid-bug-hunt-aider', label: 'Git-aware Bug Hunt', reason: 'Aider tracks C++ diffs cleanly' });
  } else if (type === 'node') {
    templates.push({ id: 'cloud-patch-test-codex', label: 'Quick JS Patch', reason: 'Codex is fast for JS/TS fixes' });
    templates.push({ id: 'hybrid-code-review-gemini', label: 'Review & Docs', reason: 'Gemini handles large JS files well' });
    templates.push({ id: 'local-safe-audit', label: 'Private Audit', reason: 'Keep proprietary code local' });
  } else if (type === 'python') {
    templates.push({ id: 'cloud-heavy-refactor-claude', label: 'Refactor Python', reason: 'Claude handles large Python repos' });
    templates.push({ id: 'hybrid-patch-test-aider', label: 'Git Patch Loop', reason: 'Aider manages Python diffs' });
    templates.push({ id: 'local-performance', label: 'Local Optimize', reason: 'Profile Python locally first' });
  } else {
    templates.push({ id: 'local-safe-audit', label: 'Safe Audit', reason: 'Start with read-only local analysis' });
    templates.push({ id: 'cloud-heavy-refactor-claude', label: 'Heavy Refactor', reason: 'Cloud power for big changes' });
    templates.push({ id: 'hybrid-patch-test-codex', label: 'Quick Patch', reason: 'Fast cloud patch/test loop' });
  }
  return { projectType: type, templates };
}

function scanMcpConfigs() {
  const home = os.homedir();
  const configs = [];
  const candidates = [
    { name: 'Claude Desktop', path: path.join(home, '.claude', 'mcp.json') },
    { name: 'Cursor', path: path.join(home, '.cursor', 'mcp.json') },
    { name: 'Cline', path: path.join(home, '.config', 'cline', 'mcp.json') },
  ];
  for (const c of candidates) {
    if (fs.existsSync(c.path)) {
      try {
        const data = JSON.parse(fs.readFileSync(c.path, 'utf8'));
        const servers = Object.keys(data.mcpServers || {});
        configs.push({ name: c.name, path: c.path, servers, count: servers.length });
      } catch {
        configs.push({ name: c.name, path: c.path, servers: [], count: 0, error: 'parse failed' });
      }
    }
  }
  return configs;
}

function buildPortfolioHealth() {
  const data = readProjectRegistry();
  const items = [];
  for (const p of data.projects) {
    const issues = [];
    if (!p.hasGit) issues.push('NO_GIT');
    else if (!p.git.hasRemote) issues.push('NO_REMOTE');
    else if (!p.git.clean) issues.push('UNCOMMITTED');
    items.push({ name: p.name, path: p.path, type: p.type, hasGit: p.hasGit, hasRemote: p.git?.hasRemote, clean: p.git?.clean, issues });
  }
  return items;
}
function createSession(profile, script, options = {}) {
  const id = `s-${nowStamp()}-${Math.random().toString(16).slice(2, 8)}`;
  const scriptPath = path.join(DIRS.sessions, `${id}.ps1`);
  const header = `# AgentDock session ${id}\n# Profile: ${profile.id}\n$ErrorActionPreference = 'Continue'\n`;
  fs.writeFileSync(scriptPath, header + '\n' + script + '\n', 'utf8');
  const args = ['-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath];
  const startedAt = new Date().toISOString();
  const child = spawn('powershell.exe', args, { cwd: ROOT, env: { ...process.env, AGENTDOCK_SESSION_ID: id }, windowsHide: false });
  const sess = { id, profileId: profile.id, profileName: profile.name, pid: child.pid, status: 'running', startedAt, endedAt: null, exitCode: null, output: '', outputLimit: 1024 * 1024 * 2, scriptPath, dangerous: shouldWarnDanger(script) };
  sessions.set(id, sess);
  const add = (prefix, data) => {
    const text = data.toString();
    sess.output += prefix ? `[${prefix}] ${text}` : text;
    if (sess.output.length > sess.outputLimit) sess.output = sess.output.slice(-sess.outputLimit);
  };
  child.stdout.on('data', d => add('', d));
  child.stderr.on('data', d => add('stderr', d));
  child.on('close', code => {
    sess.status = 'exited'; sess.exitCode = code; sess.endedAt = new Date().toISOString();
    const log = `# AgentDock Launch Log\n\nSession: ${id}\nProfile: ${profile.id}\nStarted: ${startedAt}\nEnded: ${sess.endedAt}\nExitCode: ${code}\n\n## Output\n\n\`\`\`text\n${sess.output}\n\`\`\`\n`;
    fs.writeFileSync(path.join(DIRS.logs, `launch-${profile.id}-${id}.md`), log, 'utf8');
    writeSessionUsage({ id, profileId: profile.id, profileName: profile.name, startedAt, endedAt: sess.endedAt, exitCode: code, pid: sess.pid });
    appendMemory({ title: `${profile.id} run`, profileId: profile.id, status: code === 0 ? 'observed-run' : 'observed-failure', observed: `exitCode=${code}`, reason: `Terminal-monitored AgentDock session ${id}` });
  });
  child.on('error', e => { sess.status = 'error'; sess.output += `\n[error] ${e.message}\n`; });
  sess.child = child;
  return sess;
}
function publicSession(sess) {
  if (!sess) return null;
  return { id: sess.id, profileId: sess.profileId, profileName: sess.profileName, pid: sess.pid, status: sess.status, startedAt: sess.startedAt, endedAt: sess.endedAt, exitCode: sess.exitCode, outputLength: sess.output.length, dangerous: sess.dangerous };
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'AgentDock/1.1 research-watch' }, timeout: 12000 }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk.toString(); if (data.length > 200000) req.destroy(); });
      res.on('end', () => resolve({ url, status: res.statusCode, text: data.slice(0, 20000) }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
  });
}
async function runResearchWatch() {
  const sources = fs.existsSync(FILES.sources) ? fs.readFileSync(FILES.sources, 'utf8') : '';
  const urls = [...sources.matchAll(/https?:\/\/\S+/g)].map(m => m[0].replace(/[)>.,]+$/, '')).slice(0, 20);
  const results = [];
  for (const url of urls) {
    try { results.push(await fetchText(url)); }
    catch (e) { results.push({ url, error: e.message, text: '' }); }
  }
  const lines = [];
  lines.push(`# AgentDock Research Brief`);
  lines.push(`Date: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Executive recommendation');
  lines.push('Use known-good stacks first. Retest blocked stacks only when the runtime, model tag, or provider changed.');
  lines.push('');
  lines.push('## Source checks');
  for (const r of results) lines.push(`- ${r.url} — ${r.error ? 'ERROR: ' + r.error : 'HTTP ' + r.status}`);
  lines.push('');
  lines.push('## Local action items');
  lines.push('- Re-run System Scan after installing or updating any coder CLI.');
  lines.push('- Verify model context with `ollama ps`; do not trust model names.');
  lines.push('- Keep Qwen local 64K blocked until a scan proves a 64K loaded context.');
  lines.push('- Prefer q8_0 KV cache on 8GB VRAM unless a benchmark shows quality loss for your task.');
  const text = lines.join('\n');
  const file = path.join(DIRS.briefs, `${nowStamp()}-biweekly-brief.md`);
  fs.writeFileSync(file, text, 'utf8');
  return { file: path.basename(file), text };
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  const full = safeJoin(ROOT, pathname.slice(1));
  if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) return send(res, 404, { error: 'Not found' });
  const ext = path.extname(full).toLowerCase();
  const type = ext === '.html' ? 'text/html; charset=utf-8' : ext === '.css' ? 'text/css' : ext === '.js' ? 'application/javascript' : ext === '.json' ? 'application/json' : 'text/plain; charset=utf-8';
  send(res, 200, fs.readFileSync(full), type);
}

async function route(req, res) {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const pathName = url.pathname;
  try {
    if (pathName === '/api/status' && req.method === 'GET') {
      return send(res, 200, { ok: true, version: '2.0.0' });
    }
    if (pathName === '/api/scan' && req.method === 'GET') {
      const repo = url.searchParams.get('repo') || process.cwd();
      return send(res, 200, await runScanner(repo));
    }
    if (pathName === '/api/catalog' && req.method === 'GET') return send(res, 200, loadCatalog());
    if (pathName === '/api/suggestions' && req.method === 'GET') return send(res, 200, { suggestions: buildSuggestions(lastScan) });
    if (pathName === '/api/profiles' && req.method === 'GET') return send(res, 200, listProfiles());
    if (pathName.startsWith('/api/profile/') && req.method === 'GET') {
      const id = decodeURIComponent(pathName.split('/').pop());
      const p = getProfile(id); if (!p) return send(res, 404, { error: 'Profile not found' });
      return send(res, 200, p);
    }
    if (pathName === '/api/memory' && req.method === 'GET') return send(res, 200, { text: readMemory() });
    if (pathName === '/api/memory' && req.method === 'POST') {
      const body = await readBody(req);
      fs.writeFileSync(FILES.memory, String(body.text || ''), 'utf8');
      return send(res, 200, { ok: true });
    }
    if (pathName === '/api/plan' && req.method === 'POST') {
      const body = await readBody(req);
      return send(res, 200, buildPlan(body.goal || 'privacy', lastScan));
    }
    if (pathName.startsWith('/api/launch/') && req.method === 'POST') {
      const id = decodeURIComponent(pathName.split('/').pop());
      const p = getProfile(id); if (!p) return send(res, 404, { error: 'Profile not found' });
      const body = await readBody(req);
      let script = extractLaunchScript(p.body);
      if (!script) return send(res, 400, { error: 'No launch block in profile' });
      script = injectProjectPath(script, activeProject);
      const blocked = isBlockedByMemory(p, readMemory());
      if (blocked && !body.overrideReason && !body.dryRun) return send(res, 200, { blocked: true, message: `Profile is blocked by memory: ${blocked.title}`, evidence: blocked.raw.slice(0, 1200) });
      if (body.dryRun) return send(res, 200, { profile: p.id, script, dangerous: shouldWarnDanger(script), project: activeProject });
      const sess = createSession(p, script, body);
      return send(res, 200, { launched: true, terminal: true, session: publicSession(sess), project: activeProject });
    }
    if (pathName.startsWith('/api/block/') && req.method === 'POST') {
      const id = decodeURIComponent(pathName.split('/').pop());
      const body = await readBody(req);
      appendMemory({ title: id, profileId: id, status: 'blocked', observed: body.observed || 'manual block', reason: body.reason || 'manual block' });
      return send(res, 200, { ok: true });
    }
    if (pathName === '/api/sessions' && req.method === 'GET') return send(res, 200, { sessions: [...sessions.values()].map(publicSession) });
    if (pathName.match(/^\/api\/session\/[^/]+\/output$/) && req.method === 'GET') {
      const id = decodeURIComponent(pathName.split('/')[3]);
      const sess = sessions.get(id); if (!sess) return send(res, 404, { error: 'Session not found' });
      const since = Number(url.searchParams.get('since') || 0);
      return send(res, 200, { session: publicSession(sess), chunk: sess.output.slice(since), cursor: sess.output.length });
    }
    if (pathName.match(/^\/api\/session\/[^/]+\/input$/) && req.method === 'POST') {
      const id = decodeURIComponent(pathName.split('/')[3]);
      const sess = sessions.get(id); if (!sess || !sess.child) return send(res, 404, { error: 'Session not found' });
      const body = await readBody(req);
      sess.child.stdin.write(String(body.text || '') + (body.raw ? '' : os.EOL));
      return send(res, 200, { ok: true });
    }
    if (pathName.match(/^\/api\/session\/[^/]+\/stop$/) && req.method === 'POST') {
      const id = decodeURIComponent(pathName.split('/')[3]);
      const sess = sessions.get(id); if (!sess || !sess.child) return send(res, 404, { error: 'Session not found' });
      if (isWindows()) execFile('taskkill', ['/PID', String(sess.pid), '/T', '/F'], () => {});
      else sess.child.kill('SIGTERM');
      sess.status = 'stopping';
      return send(res, 200, { ok: true });
    }
    if (pathName === '/api/research/run' && req.method === 'POST') return send(res, 200, await runResearchWatch());
    if (pathName === '/api/research/latest' && req.method === 'GET') {
      const files = fs.existsSync(DIRS.briefs) ? fs.readdirSync(DIRS.briefs).filter(f => f.endsWith('.md')).sort().reverse() : [];
      if (!files.length) return send(res, 200, { name: null, text: 'No research brief yet.' });
      const file = safeJoin(DIRS.briefs, files[0]);
      return send(res, 200, { name: files[0], text: fs.readFileSync(file, 'utf8') });
    }
    if (pathName === '/api/logs' && req.method === 'GET') {
      const logs = fs.readdirSync(DIRS.logs).sort().reverse().slice(0, 80);
      return send(res, 200, { logs });
    }
    if (pathName.startsWith('/api/log/') && req.method === 'GET') {
      const name = decodeURIComponent(pathName.split('/').pop());
      const file = safeJoin(DIRS.logs, name);
      if (!fs.existsSync(file)) return send(res, 404, { error: 'Log not found' });
      return send(res, 200, { name, text: fs.readFileSync(file, 'utf8') });
    }
    if (pathName === '/api/usage' && req.method === 'GET') return send(res, 200, readJSON(FILES.usage, { launches: [] }));
    if (pathName === '/api/projects' && req.method === 'GET') {
      const data = readProjectRegistry();
      return send(res, 200, { projects: data.projects, active: data.active });
    }
    if (pathName === '/api/projects/discover' && req.method === 'POST') {
      const data = readProjectRegistry();
      return send(res, 200, { projects: data.projects, active: data.active, discovered: data.projects.length });
    }
    if (pathName === '/api/active-project' && req.method === 'POST') {
      const body = await readBody(req);
      const data = setActiveProject(body.path || null);
      return send(res, 200, { active: data.active, projects: data.projects });
    }
    if (pathName === '/api/active-project' && req.method === 'GET') {
      const data = readProjectRegistry();
      const activeNorm = path.normalize(data.active || '');
      const proj = data.projects.find(p => path.normalize(p.path || '') === activeNorm);
      return send(res, 200, { active: data.active, project: proj || null });
    }
    if (pathName.startsWith('/api/project/') && pathName.endsWith('/agents-md') && req.method === 'GET') {
      const projectPath = decodeURIComponent(pathName.split('/')[3]);
      const text = readAgentsMd(projectPath);
      return send(res, 200, { path: projectPath, present: text !== null, text: text || '' });
    }
    if (pathName.startsWith('/api/project/') && pathName.endsWith('/git-status') && req.method === 'GET') {
      const projectPath = decodeURIComponent(pathName.split('/')[3]);
      return send(res, 200, readGitStatus(projectPath));
    }
    if (pathName === '/api/advisor/analyze' && req.method === 'POST') {
      const body = await readBody(req);
      const proj = activeProject ? readProjectRegistry().projects.find(p => p.path === activeProject) : null;
      const result = await advisorAnalyze({
        scan: lastScan,
        project: proj,
        profiles: listProfiles(),
        sessions: [...sessions.values()].map(publicSession),
        question: body.question || '',
        useGemini: body.useGemini !== false,
      });
      return send(res, 200, result);
    }
    if (pathName.match(/^\/api\/session\/[^/]+\/outcome$/) && req.method === 'POST') {
      const id = decodeURIComponent(pathName.split('/')[3]);
      const body = await readBody(req);
      recordSessionOutcome(id, body.outcome, body.notes);
      return send(res, 200, { ok: true });
    }
    if (pathName === '/api/sessions/search' && req.method === 'GET') {
      const q = url.searchParams.get('q') || '';
      return send(res, 200, { query: q, results: searchSessions(q) });
    }
    if (pathName === '/api/templates' && req.method === 'GET') {
      return send(res, 200, getQuickTemplates());
    }
    if (pathName === '/api/mcp' && req.method === 'GET') {
      return send(res, 200, { configs: scanMcpConfigs() });
    }
    if (pathName === '/api/portfolio/health' && req.method === 'GET') {
      return send(res, 200, { items: buildPortfolioHealth() });
    }
    if (pathName === '/api/race' && req.method === 'POST') {
      const body = await readBody(req);
      const launched = [];
      for (const profileId of body.profiles || []) {
        const p = getProfile(profileId);
        if (!p) continue;
        let script = extractLaunchScript(p.body);
        if (!script) continue;
        script = injectProjectPath(script, activeProject);
        const sess = createSession(p, script, body);
        launched.push(publicSession(sess));
      }
      return send(res, 200, { launched, count: launched.length });
    }
    if (pathName === '/api/chat' && req.method === 'POST') {
      const body = await readBody(req);
      const proj = activeProject ? readProjectRegistry().projects.find(p => p.path === activeProject) : null;
      const context = {
        activeProject: proj,
        installedAgents: (lastScan?.coders || []).filter(c => c.detection?.present).map(c => c.id),
        missingAgents: (lastScan?.coders || []).filter(c => !c.detection?.present).map(c => c.id),
        envKeys: Object.entries(lastScan?.env || {}).filter(([_, v]) => v?.present).map(([k]) => k),
        profiles: listProfiles().map(p => ({ id: p.id, name: p.name, mode: p.meta.mode, status: p.meta.status })),
        scan: lastScan ? { system: lastScan.system, hardware: lastScan.hardware } : null,
      };
      const result = await processChatMessage({
        sessionId: body.sessionId || 'default',
        text: body.text,
        event: body.event,
        context,
      });
      return send(res, 200, result);
    }
    if (pathName === '/api/chat/history' && req.method === 'GET') {
      const sessionId = url.searchParams.get('session') || 'default';
      return send(res, 200, { history: getChatHistory(sessionId) });
    }
    if (pathName === '/api/chat/clear' && req.method === 'POST') {
      const body = await readBody(req);
      clearChat(body.sessionId || 'default');
      return send(res, 200, { ok: true });
    }
    return serveStatic(req, res);
  } catch (e) {
    return send(res, 500, { error: e.message, stack: process.env.AGENTDOCK_DEBUG ? e.stack : undefined });
  }
}

const __server = http.createServer(route);
__server.listen(PORT, HOST, () => {
  console.log(`AgentDock running at http://${HOST}:${PORT}`);
});
__server.on('error', (err) => {
  console.error(`AgentDock server error: ${err.message}`);
});

module.exports = {
  parseFrontmatter,
  parseOllamaPsRaw,
  normalizeLoadedModels,
  memoryBlocks,
  __server,
};
