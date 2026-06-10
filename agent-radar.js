/**
 * HOOT agent radar — finds running coding agents on the machine (dock vs external).
 */

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const ROOT = __dirname;
const RADAR_SCRIPT = path.join(ROOT, 'agent-radar.ps1');
const CATALOG_PATH = path.join(ROOT, 'coders-catalog.json');

const BUILTIN_RULES = [
  { id: 'claude-code', name: 'Claude Code', exe: ['claude.exe', 'claude'], cmd: ['claude-code', '@anthropic-ai/claude-code'] },
  { id: 'codex', name: 'OpenAI Codex', exe: ['codex.exe', 'codex'], cmd: ['@openai/codex', 'codex-cli'] },
  { id: 'gemini-cli', name: 'Gemini CLI', exe: ['gemini.exe', 'gemini'], cmd: ['@google/gemini', 'gemini-cli'] },
  { id: 'hermes', name: 'Hermes Agent', exe: ['hermes.exe', 'hermes'], cmd: ['@nousresearch/hermes', 'hermes-agent'] },
  { id: 'opencode', name: 'OpenCode', exe: ['opencode.exe', 'opencode'], cmd: ['opencode', 'sst/opencode'] },
  { id: 'kimi', name: 'Kimi CLI', exe: ['kimi.exe', 'kimi'], cmd: ['@moonshot-ai/kimi', 'kimi-cli'] },
  { id: 'aider', name: 'Aider', exe: ['aider.exe', 'aider'], cmd: ['aider'] },
  { id: 'grok', name: 'Grok CLI', exe: ['grok.exe', 'grok'], cmd: ['grok-cli'] },
];

function loadCatalogRules() {
  try {
    const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
    return (catalog.tools || [])
      .filter((t) => t.command && t.category === 'agent-frontend')
      .map((t) => ({
        id: t.id,
        name: t.name,
        exe: [`${t.command}.exe`, t.command],
        cmd: [t.command, t.id],
      }));
  } catch {
    return [];
  }
}

function buildAgentRules() {
  const byId = new Map();
  for (const rule of [...BUILTIN_RULES, ...loadCatalogRules()]) {
    if (!byId.has(rule.id)) byId.set(rule.id, rule);
  }
  return [...byId.values()];
}

function normalizeExe(name) {
  return String(name || '').replace(/\.exe$/i, '').toLowerCase();
}

function matchAgentProcess(proc, rules) {
  const name = normalizeExe(proc.name);
  const cmd = String(proc.command || proc.commandLine || '').toLowerCase();
  for (const rule of rules) {
    if (rule.exe.some((e) => normalizeExe(e) === name)) return rule;
    if (cmd && rule.cmd.some((c) => cmd.includes(String(c).toLowerCase()))) return rule;
  }
  return null;
}

function classifyProcesses(rawProcesses, dockPids = []) {
  const rules = buildAgentRules();
  const dockSet = new Set(dockPids.map((p) => Number(p)).filter((p) => p > 0));
  const processes = [];
  const agentMap = new Map();

  for (const raw of rawProcesses || []) {
    const rule = matchAgentProcess(raw, rules);
    if (!rule) continue;
    const pid = Number(raw.pid || raw.ProcessId);
    const cmd = String(raw.command || raw.commandLine || '');
    const source = dockSet.has(pid) || /AGENTDOCK_SESSION_ID/i.test(cmd) ? 'agentdock' : 'external';
    processes.push({
      pid,
      name: raw.name || raw.Name,
      command: cmd.length > 240 ? `${cmd.slice(0, 240)}…` : cmd,
      agent_id: rule.id,
      agent_name: rule.name,
      source,
    });
    if (!agentMap.has(rule.id)) {
      agentMap.set(rule.id, { id: rule.id, name: rule.name, count: 0, dock: 0, external: 0, pids: [] });
    }
    const bucket = agentMap.get(rule.id);
    bucket.count += 1;
    if (source === 'agentdock') bucket.dock += 1;
    else bucket.external += 1;
    bucket.pids.push(pid);
  }

  const agents = [...agentMap.values()].sort((a, b) => b.count - a.count);
  const total = processes.length;
  const dock = processes.filter((p) => p.source === 'agentdock').length;
  return {
    scanned_at: new Date().toISOString(),
    processes,
    agents,
    summary: {
      total,
      dock,
      external: total - dock,
      agent_types: agents.length,
    },
  };
}

function runAgentRadar({ dockPids = [] } = {}) {
  if (process.platform !== 'win32') {
    return Promise.resolve({
      scanned_at: new Date().toISOString(),
      processes: [],
      agents: [],
      summary: { total: 0, dock: 0, external: 0, agent_types: 0 },
      platform: process.platform,
      note: 'Agent radar is Windows-only today',
    });
  }
  if (!fs.existsSync(RADAR_SCRIPT)) {
    return Promise.reject(new Error('agent-radar.ps1 not found'));
  }
  const pidArg = dockPids.join(',');
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', RADAR_SCRIPT, '-DockPids', pidArg],
      { windowsHide: true, maxBuffer: 8 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message || 'agent radar failed'));
        try {
          const parsed = JSON.parse(stdout.trim());
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Failed to parse agent radar JSON: ${e.message}\n${stdout.slice(0, 500)}`));
        }
      },
    );
  });
}

module.exports = {
  buildAgentRules,
  matchAgentProcess,
  classifyProcesses,
  runAgentRadar,
};