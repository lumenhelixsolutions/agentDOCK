/**
 * Shared helpers for external agent session radars.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const ACTIVE_RECENCY_MS = 6 * 60 * 60 * 1000;

function resolveHome(...parts) {
  return path.join(os.homedir(), ...parts);
}

function isPidAlive(pid) {
  const n = Number(pid);
  if (!n || n <= 0) return false;
  try {
    process.kill(n, 0);
    return true;
  } catch (e) {
    return e && e.code === 'EPERM';
  }
}

function readJsonSafe(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function readJsonlTail(filePath, maxLines = 4000) {
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return raw.split(/\r?\n/).filter(Boolean).slice(-maxLines);
  } catch {
    return [];
  }
}

function parseJsonlLines(lines) {
  const out = [];
  for (const line of lines) {
    try {
      out.push(JSON.parse(line));
    } catch { /* skip */ }
  }
  return out;
}

function estTokensFromText(text) {
  return Math.ceil(String(text || '').length / 4);
}

function estTokensFromFiles(filePaths = []) {
  let total = 0;
  for (const fp of filePaths) {
    if (!fp || !fs.existsSync(fp)) continue;
    try {
      total += fs.statSync(fp).size;
    } catch { /* ignore */ }
  }
  return estTokensFromText('x'.repeat(total));
}

function truncate(text, max = 280) {
  const s = String(text || '').trim();
  if (!s) return null;
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function extractLastUserQueryFromText(text) {
  const m = /<user_query>\s*([\s\S]*?)\s*<\/user_query>/i.exec(String(text || ''));
  return truncate(m?.[1] || text);
}

function cwdMatchesProject(cwd, activeProject) {
  if (!cwd || !activeProject) return true;
  const norm = (p) => path.resolve(String(p)).toLowerCase();
  try {
    const c = norm(cwd);
    const a = norm(activeProject);
    return c === a || c.startsWith(`${a}${path.sep}`) || a.startsWith(`${c}${path.sep}`);
  } catch {
    return false;
  }
}

function encodePathKey(cwd) {
  return path.resolve(String(cwd || '')).replace(/\\/g, '-').replace(/:/g, '-');
}

function grokSessionDir(grokHome, cwd, sessionId) {
  const enc = encodeURIComponent(String(cwd || '').replace(/\//g, '\\'));
  return path.join(grokHome, 'sessions', enc, sessionId);
}

function isRecentlyActive(mtimeMs, windowMs = ACTIVE_RECENCY_MS) {
  if (!mtimeMs) return false;
  return Date.now() - mtimeMs < windowMs;
}

function listFilesRecursive(dir, { maxDepth = 6, depth = 0 } = {}) {
  if (!dir || !fs.existsSync(dir) || depth > maxDepth) return [];
  const out = [];
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isFile()) out.push(full);
      else if (entry.isDirectory()) out.push(...listFilesRecursive(full, { maxDepth, depth: depth + 1 }));
    }
  } catch { /* ignore */ }
  return out;
}

function newestFile(paths = []) {
  let best = null;
  for (const fp of paths) {
    if (!fp || !fs.existsSync(fp)) continue;
    try {
      const mtime = fs.statSync(fp).mtimeMs;
      if (!best || mtime > best.mtimeMs) best = { path: fp, mtimeMs: mtime };
    } catch { /* ignore */ }
  }
  return best;
}

function normalizeSession({
  agent_id,
  agent_name,
  provider,
  session_id,
  cwd = null,
  pid = null,
  model_id = null,
  est_context_tokens = 0,
  completed_turns = 0,
  compaction_count = 0,
  last_user_query = null,
  matched_project = true,
  source = 'external',
  active = false,
  telemetry_source = null,
  chat_bytes = 0,
  yolo_mode = false,
  thread_name = null,
  opened_at = null,
  updated_at = null,
  process_name = null,
  command = null,
}) {
  return {
    agent_id,
    agent_name,
    provider: provider || agent_id,
    source,
    pid,
    session_id,
    cwd,
    opened_at,
    updated_at,
    matched_project,
    active,
    telemetry_source,
    process_name,
    command,
    model_id,
    completed_turns,
    compaction_count,
    user_messages: null,
    assistant_messages: null,
    est_context_tokens,
    chat_bytes,
    last_user_query,
    yolo_mode,
    thread_name,
  };
}

function emptyRadar(agent_id, agent_name, grokHomeLike = null) {
  return {
    agent_id,
    agent_name,
    home: grokHomeLike,
    scanned_at: new Date().toISOString(),
    sessions: [],
    summary: { active: 0, matched_project: 0, est_context_tokens: 0, turn_count: 0, compaction_events: 0 },
  };
}

function summarizeSessions(sessions = []) {
  const matched = sessions.filter((s) => s.matched_project);
  return {
    active: sessions.filter((s) => s.active).length,
    matched_project: matched.length,
    est_context_tokens: sessions.reduce((n, s) => n + (s.est_context_tokens || 0), 0),
    turn_count: sessions.reduce((n, s) => n + (s.completed_turns || 0), 0),
    compaction_events: sessions.reduce((n, s) => n + (s.compaction_count || 0), 0),
  };
}

function buildAgentRunningMap(processes = []) {
  const map = new Map();
  for (const proc of processes || []) {
    const id = proc.agent_id;
    if (!id) continue;
    if (!map.has(id)) map.set(id, { running: false, pids: [] });
    const bucket = map.get(id);
    bucket.running = true;
    if (proc.pid) bucket.pids.push(Number(proc.pid));
  }
  return map;
}

function pickPrimaryProductionContext(sessions = []) {
  const activeMatched = sessions.filter((s) => s.active && s.matched_project);
  const activeAny = sessions.filter((s) => s.active);
  const matched = sessions.filter((s) => s.matched_project);
  const primary = activeMatched[0] || activeAny[0] || matched[0] || sessions[0];
  if (!primary) return null;
  return {
    provider: primary.provider,
    agent_id: primary.agent_id,
    agent_name: primary.agent_name,
    model_id: primary.model_id,
    est_context_tokens: primary.est_context_tokens,
    completed_turns: primary.completed_turns,
    compaction_count: primary.compaction_count,
    last_user_query: primary.last_user_query,
    session_id: primary.session_id,
    cwd: primary.cwd,
    matched_project: primary.matched_project,
    yolo_mode: primary.yolo_mode,
    chat_bytes: primary.chat_bytes,
    active: primary.active,
    telemetry_source: primary.telemetry_source,
    thread_name: primary.thread_name,
  };
}

module.exports = {
  ACTIVE_RECENCY_MS,
  resolveHome,
  isPidAlive,
  readJsonSafe,
  readJsonlTail,
  parseJsonlLines,
  estTokensFromText,
  estTokensFromFiles,
  truncate,
  extractLastUserQueryFromText,
  cwdMatchesProject,
  encodePathKey,
  grokSessionDir,
  isRecentlyActive,
  listFilesRecursive,
  newestFile,
  normalizeSession,
  emptyRadar,
  summarizeSessions,
  buildAgentRunningMap,
  pickPrimaryProductionContext,
};