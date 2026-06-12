/**
 * Per-agent session telemetry adapters (top coding CLIs).
 */

const fs = require('fs');
const path = require('path');
const {
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
} = require('./session-radar-shared');

function resolveGrokHome() {
  const env = process.env.GROK_HOME || process.env.GROK_CLI_HOME;
  if (env) return path.resolve(env);
  return resolveHome('.grok');
}

function resolveClaudeHome() {
  const env = process.env.CLAUDE_CONFIG_DIR || process.env.CLAUDE_HOME;
  if (env) return path.resolve(env);
  return resolveHome('.claude');
}

function resolveCodexHome() {
  const env = process.env.CODEX_HOME;
  if (env) return path.resolve(env);
  return resolveHome('.codex');
}

function resolveKimiHome() {
  const env = process.env.KIMI_HOME || process.env.KIMI_CONFIG_HOME;
  if (env) return path.resolve(env);
  return resolveHome('.kimi');
}

function resolveGeminiHome() {
  const env = process.env.GEMINI_HOME || process.env.GOOGLE_GEMINI_HOME;
  if (env) return path.resolve(env);
  return resolveHome('.gemini');
}

function agentRunning(runningMap, agentId) {
  return Boolean(runningMap?.get(agentId)?.running);
}

function analyzeGrokSessionFolder(sessionDir) {
  const eventsPath = path.join(sessionDir, 'events.jsonl');
  const chatPath = path.join(sessionDir, 'chat_history.jsonl');
  const events = parseJsonlLines(readJsonlTail(eventsPath, 8000));
  const chatLines = readJsonlTail(chatPath, 500);
  const chatRows = parseJsonlLines(chatLines);

  let lastTurn = null;
  for (const ev of events) {
    if (ev.type === 'turn_started') lastTurn = ev;
  }
  const completedTurns = events.filter((e) => e.type === 'turn_ended').length;
  let compactionCount = 0;
  for (const row of chatRows) {
    if (row?.synthetic_reason === 'compaction_meta') compactionCount += 1;
  }

  let chatBytes = 0;
  try { chatBytes = fs.statSync(chatPath).size; } catch { /* ignore */ }

  let lastUserQuery = null;
  for (let i = chatRows.length - 1; i >= 0; i -= 1) {
    const row = chatRows[i];
    if (row?.type !== 'user') continue;
    const content = row.content;
    if (typeof content === 'string') {
      lastUserQuery = extractLastUserQueryFromText(content);
      break;
    }
    if (Array.isArray(content)) {
      const text = content.filter((p) => p?.type === 'text' && p.text).map((p) => p.text).join('\n');
      lastUserQuery = extractLastUserQueryFromText(text);
      break;
    }
  }

  return {
    model_id: lastTurn?.model_id || null,
    completed_turns: completedTurns,
    compaction_count: compactionCount,
    est_context_tokens: estTokensFromText(chatLines.join('\n')),
    chat_bytes: chatBytes,
    last_user_query: lastUserQuery,
    yolo_mode: Boolean(lastTurn?.yolo_mode),
  };
}

function buildGrokSessionRadar({ activeProject, runningMap } = {}) {
  const grokHome = resolveGrokHome();
  const activeFile = path.join(grokHome, 'active_sessions.json');
  if (!fs.existsSync(activeFile)) return emptyRadar('grok', 'Grok CLI', grokHome);

  const entries = readJsonSafe(activeFile, []);
  const list = Array.isArray(entries) ? entries : [];
  const sessions = [];

  for (const entry of list) {
    const pid = Number(entry.pid);
    if (!isPidAlive(pid)) continue;
    const sessionDir = grokSessionDir(grokHome, entry.cwd, entry.session_id);
    const metrics = analyzeGrokSessionFolder(sessionDir);
    sessions.push(normalizeSession({
      agent_id: 'grok',
      agent_name: 'Grok CLI',
      session_id: entry.session_id,
      cwd: entry.cwd,
      pid,
      opened_at: entry.opened_at,
      matched_project: cwdMatchesProject(entry.cwd, activeProject),
      active: true,
      telemetry_source: '~/.grok/active_sessions.json',
      process_name: 'agent.exe',
      command: `${path.join(grokHome, 'bin', 'agent.exe')} (session ${String(entry.session_id).slice(0, 8)}…)`,
      ...metrics,
    }));
  }

  return {
    agent_id: 'grok',
    agent_name: 'Grok CLI',
    grok_home: grokHome,
    scanned_at: new Date().toISOString(),
    sessions,
    summary: summarizeSessions(sessions),
  };
}

function analyzeClaudeSessionFile(filePath) {
  const lines = readJsonlTail(filePath, 2000);
  const rows = parseJsonlLines(lines);
  let cwd = null;
  let model_id = null;
  let completed_turns = 0;
  let last_user_query = null;

  for (const row of rows) {
    if (!cwd && row.cwd) cwd = row.cwd;
    if (row.type === 'assistant' && row.message?.model && row.message.model !== '<synthetic>') {
      model_id = row.message.model;
    }
    if (row.type === 'user' && row.message?.content && !row.isMeta) {
      const content = row.message.content;
      if (typeof content === 'string' && !content.startsWith('<local-command') && !content.startsWith('<command-name>')) {
        last_user_query = truncate(content);
      }
    }
    if (row.type === 'assistant') completed_turns += 1;
  }

  let chat_bytes = 0;
  try { chat_bytes = fs.statSync(filePath).size; } catch { /* ignore */ }

  return {
    cwd,
    model_id,
    completed_turns,
    compaction_count: rows.filter((r) => r.type === 'file-history-snapshot').length,
    est_context_tokens: estTokensFromText(lines.join('\n')),
    chat_bytes,
    last_user_query,
    updated_at: newestFile([filePath])?.mtimeMs ? new Date(newestFile([filePath]).mtimeMs).toISOString() : null,
  };
}

function buildClaudeSessionRadar({ activeProject, runningMap } = {}) {
  const claudeHome = resolveClaudeHome();
  const projectsRoot = path.join(claudeHome, 'projects');
  if (!fs.existsSync(projectsRoot)) return emptyRadar('claude-code', 'Claude Code', claudeHome);

  const running = agentRunning(runningMap, 'claude-code');
  const candidates = [];
  const projectDirs = fs.readdirSync(projectsRoot, { withFileTypes: true }).filter((d) => d.isDirectory());

  for (const dir of projectDirs) {
    const projectDir = path.join(projectsRoot, dir.name);
    const files = fs.readdirSync(projectDir).filter((f) => f.endsWith('.jsonl'));
    for (const file of files) {
      const full = path.join(projectDir, file);
      const stat = fs.statSync(full);
      candidates.push({ full, mtimeMs: stat.mtimeMs, encoded: dir.name });
    }
  }

  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const sessions = [];
  const seen = new Set();

  for (const cand of candidates.slice(0, 12)) {
    const sessionId = path.basename(cand.full, '.jsonl');
    if (seen.has(sessionId)) continue;
    seen.add(sessionId);
    const metrics = analyzeClaudeSessionFile(cand.full);
    const cwd = metrics.cwd || decodeClaudeProjectPath(cand.encoded);
    const matched = cwdMatchesProject(cwd, activeProject);
    const active = running && isRecentlyActive(cand.mtimeMs);
    if (!active && !matched && sessions.length >= 3) continue;

    sessions.push(normalizeSession({
      agent_id: 'claude-code',
      agent_name: 'Claude Code',
      session_id: sessionId,
      cwd,
      matched_project: matched,
      active,
      telemetry_source: '~/.claude/projects/<cwd>/*.jsonl',
      updated_at: metrics.updated_at,
      ...metrics,
    }));
  }

  return {
    agent_id: 'claude-code',
    agent_name: 'Claude Code',
    home: claudeHome,
    scanned_at: new Date().toISOString(),
    sessions: sessions.filter((s) => s.active || s.matched_project).slice(0, 4),
    summary: summarizeSessions(sessions),
  };
}

function decodeClaudeProjectPath(encoded) {
  if (!encoded) return null;
  const m = /^([A-Za-z])--(.*)$/.exec(encoded);
  if (!m) return encoded.replace(/-/g, path.sep);
  return `${m[1]}:${path.sep}${m[2].replace(/-/g, path.sep)}`;
}

function analyzeCodexRollout(filePath) {
  const lines = readJsonlTail(filePath, 3000);
  const rows = parseJsonlLines(lines);
  let session_id = null;
  let cwd = null;
  let model_id = null;
  let thread_name = null;
  let completed_turns = 0;
  let last_user_query = null;

  for (const row of rows) {
    if (row.type === 'session_meta' && row.payload) {
      session_id = row.payload.id || session_id;
      cwd = row.payload.cwd || cwd;
      thread_name = row.payload.thread_name || thread_name;
    }
    if (row.type === 'turn_context' && row.payload) {
      model_id = row.payload.model || model_id;
      cwd = row.payload.cwd || cwd;
    }
    if (row.type === 'event_msg' && row.payload?.type === 'task_started') completed_turns += 1;
    if (row.type === 'event_msg' && row.payload?.type === 'user_message' && row.payload.message) {
      last_user_query = truncate(row.payload.message);
    }
    if (row.type === 'response_item' && row.payload?.role === 'user') {
      const text = row.payload.content?.find?.((p) => p.type === 'input_text')?.text;
      if (text && !String(text).startsWith('# AGENTS.md') && !String(text).startsWith('<environment_context>')) {
        last_user_query = truncate(text);
      }
    }
  }

  let chat_bytes = 0;
  try { chat_bytes = fs.statSync(filePath).size; } catch { /* ignore */ }

  return {
    session_id: session_id || path.basename(filePath).match(/(019[a-f0-9-]{32,})/i)?.[1] || path.basename(filePath),
    cwd,
    model_id,
    thread_name,
    completed_turns,
    compaction_count: 0,
    est_context_tokens: estTokensFromText(lines.join('\n')),
    chat_bytes,
    last_user_query,
    updated_at: newestFile([filePath])?.mtimeMs ? new Date(newestFile([filePath]).mtimeMs).toISOString() : null,
  };
}

function buildCodexSessionRadar({ activeProject, runningMap } = {}) {
  const codexHome = resolveCodexHome();
  const sessionsRoot = path.join(codexHome, 'sessions');
  if (!fs.existsSync(sessionsRoot)) return emptyRadar('codex', 'OpenAI Codex', codexHome);

  const running = agentRunning(runningMap, 'codex');
  const rollouts = listFilesRecursive(sessionsRoot).filter((f) => /rollout-.*\.jsonl$/i.test(f));
  const ranked = rollouts
    .map((full) => {
      try {
        return { full, mtimeMs: fs.statSync(full).mtimeMs };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  const sessions = [];
  const seen = new Set();
  for (const item of ranked.slice(0, 12)) {
    const metrics = analyzeCodexRollout(item.full);
    const sid = metrics.session_id || item.full;
    if (seen.has(sid)) continue;
    seen.add(sid);
    const matched = cwdMatchesProject(metrics.cwd, activeProject);
    const active = running && isRecentlyActive(item.mtimeMs);
    if (!active && !matched && sessions.length >= 3) continue;
    sessions.push(normalizeSession({
      agent_id: 'codex',
      agent_name: 'OpenAI Codex',
      session_id: sid,
      matched_project: matched,
      active,
      telemetry_source: '~/.codex/sessions/**/rollout-*.jsonl',
      ...metrics,
    }));
  }

  return {
    agent_id: 'codex',
    agent_name: 'OpenAI Codex',
    home: codexHome,
    scanned_at: new Date().toISOString(),
    sessions: sessions.filter((s) => s.active || s.matched_project).slice(0, 4),
    summary: summarizeSessions(sessions),
  };
}

function findKimiSessionDir(kimiHome, sessionId) {
  const root = path.join(kimiHome, 'sessions');
  if (!sessionId || !fs.existsSync(root)) return null;
  for (const hash of fs.readdirSync(root)) {
    const candidate = path.join(root, hash, sessionId);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function analyzeKimiSessionDir(sessionDir, cwdHint = null) {
  const contextFiles = listFilesRecursive(sessionDir).filter((f) => /context.*\.jsonl$/i.test(path.basename(f)));
  const wirePath = path.join(sessionDir, 'wire.jsonl');
  const state = readJsonSafe(path.join(sessionDir, 'state.json'), {});
  const wireLines = readJsonlTail(wirePath, 400);
  const wireRows = parseJsonlLines(wireLines);

  let model_id = null;
  let last_user_query = null;
  let completed_turns = 0;
  for (const row of wireRows) {
    const msg = row.message;
    if (!msg) continue;
    if (msg.type === 'TurnBegin') completed_turns += 1;
    if (msg.type === 'ContentPart' && msg.payload?.type === 'text' && msg.payload.text) {
      last_user_query = truncate(msg.payload.text);
    }
    if (msg.type === 'ToolResult') { /* skip */ }
    if (!model_id && row.model) model_id = row.model;
  }

  const chat_bytes = contextFiles.reduce((n, f) => {
    try { return n + fs.statSync(f).size; } catch { return n; }
  }, 0) + (fs.existsSync(wirePath) ? fs.statSync(wirePath).size : 0);

  let mtimeMs = 0;
  for (const f of [...contextFiles, wirePath, path.join(sessionDir, 'state.json')]) {
    if (!fs.existsSync(f)) continue;
    try { mtimeMs = Math.max(mtimeMs, fs.statSync(f).mtimeMs); } catch { /* ignore */ }
  }

  return {
    session_id: path.basename(sessionDir),
    cwd: cwdHint,
    model_id,
    completed_turns,
    compaction_count: wireRows.filter((r) => String(r.message?.payload?.type || '').includes('compaction')).length,
    est_context_tokens: estTokensFromFiles([...contextFiles, wirePath]),
    chat_bytes,
    last_user_query,
    yolo_mode: Boolean(state?.approval?.yolo),
    thread_name: state?.custom_title || null,
    updated_at: mtimeMs ? new Date(mtimeMs).toISOString() : null,
    mtimeMs,
  };
}

function buildKimiSessionRadar({ activeProject, runningMap } = {}) {
  const kimiHome = resolveKimiHome();
  const manifest = readJsonSafe(path.join(kimiHome, 'kimi.json'), {});
  const workDirs = Array.isArray(manifest.work_dirs) ? manifest.work_dirs : [];
  const running = agentRunning(runningMap, 'kimi');
  const sessions = [];
  const seen = new Set();

  const ordered = [...workDirs].sort((a, b) => {
    const am = cwdMatchesProject(a.path, activeProject) ? 1 : 0;
    const bm = cwdMatchesProject(b.path, activeProject) ? 1 : 0;
    return bm - am;
  });

  for (const entry of ordered) {
    if (!entry.last_session_id || seen.has(entry.last_session_id)) continue;
    const sessionDir = findKimiSessionDir(kimiHome, entry.last_session_id);
    if (!sessionDir) continue;
    seen.add(entry.last_session_id);
    const metrics = analyzeKimiSessionDir(sessionDir, entry.path);
    const matched = cwdMatchesProject(entry.path, activeProject);
    const active = running && isRecentlyActive(metrics.mtimeMs);
    sessions.push(normalizeSession({
      agent_id: 'kimi',
      agent_name: 'Kimi CLI',
      matched_project: matched,
      active,
      telemetry_source: '~/.kimi/kimi.json + sessions/<hash>/<id>/',
      ...metrics,
    }));
  }

  return {
    agent_id: 'kimi',
    agent_name: 'Kimi CLI',
    home: kimiHome,
    scanned_at: new Date().toISOString(),
    sessions: sessions.filter((s) => s.active || s.matched_project).slice(0, 4),
    summary: summarizeSessions(sessions),
  };
}

function buildGeminiSessionRadar({ activeProject, runningMap } = {}) {
  const geminiHome = resolveGeminiHome();
  const projects = readJsonSafe(path.join(geminiHome, 'projects.json'), {});
  const projectMap = projects?.projects && typeof projects.projects === 'object' ? projects.projects : {};
  const running = agentRunning(runningMap, 'gemini-cli');

  const convDir = path.join(geminiHome, 'antigravity', 'conversations');
  const convFiles = fs.existsSync(convDir)
    ? fs.readdirSync(convDir).map((name) => path.join(convDir, name)).filter((f) => fs.statSync(f).isFile())
    : [];

  const sessions = [];
  for (const [rawPath, label] of Object.entries(projectMap)) {
    const cwd = rawPath.replace(/\//g, '\\');
    const matched = cwdMatchesProject(cwd, activeProject);
    const historyDir = path.join(geminiHome, 'history', label);
    const historyFiles = fs.existsSync(historyDir) ? listFilesRecursive(historyDir) : [];
    const newest = newestFile([...convFiles, ...historyFiles]);
    const active = running && isRecentlyActive(newest?.mtimeMs);
    if (!matched && !active) continue;

    sessions.push(normalizeSession({
      agent_id: 'gemini-cli',
      agent_name: 'Gemini CLI',
      session_id: label || encodePathKey(cwd),
      cwd,
      matched_project: matched,
      active,
      telemetry_source: '~/.gemini/projects.json + antigravity/conversations',
      model_id: 'gemini',
      completed_turns: 0,
      est_context_tokens: estTokensFromFiles(newest ? [newest.path] : []),
      chat_bytes: newest ? fs.statSync(newest.path).size : 0,
      last_user_query: null,
      thread_name: label,
      updated_at: newest?.mtimeMs ? new Date(newest.mtimeMs).toISOString() : null,
    }));
  }

  if (!sessions.length && convFiles.length) {
    const newest = newestFile(convFiles);
    sessions.push(normalizeSession({
      agent_id: 'gemini-cli',
      agent_name: 'Gemini CLI',
      session_id: path.basename(newest.path, path.extname(newest.path)),
      cwd: null,
      matched_project: false,
      active: running && isRecentlyActive(newest.mtimeMs),
      telemetry_source: '~/.gemini/antigravity/conversations',
      model_id: 'gemini',
      est_context_tokens: estTokensFromFiles([newest.path]),
      chat_bytes: newest ? fs.statSync(newest.path).size : 0,
      thread_name: 'conversation',
      updated_at: newest?.mtimeMs ? new Date(newest.mtimeMs).toISOString() : null,
    }));
  }

  return {
    agent_id: 'gemini-cli',
    agent_name: 'Gemini CLI',
    home: geminiHome,
    scanned_at: new Date().toISOString(),
    sessions: sessions.slice(0, 4),
    summary: summarizeSessions(sessions),
  };
}

function buildCursorSessionRadar({ activeProject, runningMap } = {}) {
  const roots = [
    path.join(process.env.APPDATA || '', 'Cursor', 'User'),
    path.join(process.env.LOCALAPPDATA || '', 'Cursor', 'User'),
    resolveHome('.cursor'),
  ].filter((p) => p && fs.existsSync(p));

  if (!roots.length) return emptyRadar('cursor-agent', 'Cursor Agent');

  const running = agentRunning(runningMap, 'cursor-agent');
  const storageFiles = [];
  for (const root of roots) {
    storageFiles.push(
      ...listFilesRecursive(path.join(root, 'workspaceStorage'), { maxDepth: 4 }),
      ...listFilesRecursive(path.join(root, 'globalStorage'), { maxDepth: 3 }),
    );
  }

  const stateFiles = storageFiles.filter((f) => /state\.vscdb|storage\.json|composer/i.test(path.basename(f)));
  const newest = newestFile(stateFiles.length ? stateFiles : storageFiles);
  if (!newest) return emptyRadar('cursor-agent', 'Cursor Agent');

  const matched = cwdMatchesProject(activeProject, activeProject);
  const session = normalizeSession({
    agent_id: 'cursor-agent',
    agent_name: 'Cursor Agent',
    session_id: path.basename(path.dirname(newest.path)),
    cwd: activeProject,
    matched_project: Boolean(activeProject),
    active: running && isRecentlyActive(newest.mtimeMs),
    telemetry_source: 'Cursor User/workspaceStorage',
    model_id: 'cursor',
    est_context_tokens: estTokensFromFiles([newest.path]),
    chat_bytes: fs.statSync(newest.path).size,
    last_user_query: null,
    thread_name: 'workspace',
    updated_at: new Date(newest.mtimeMs).toISOString(),
  });

  return {
    agent_id: 'cursor-agent',
    agent_name: 'Cursor Agent',
    home: roots[0],
    scanned_at: new Date().toISOString(),
    sessions: session.active || session.matched_project ? [session] : [],
    summary: summarizeSessions([session]),
  };
}

const SESSION_RADAR_ADAPTERS = [
  { id: 'grok', name: 'Grok CLI', build: buildGrokSessionRadar },
  { id: 'claude-code', name: 'Claude Code', build: buildClaudeSessionRadar },
  { id: 'codex', name: 'OpenAI Codex', build: buildCodexSessionRadar },
  { id: 'gemini-cli', name: 'Gemini CLI', build: buildGeminiSessionRadar },
  { id: 'kimi', name: 'Kimi CLI', build: buildKimiSessionRadar },
  { id: 'cursor-agent', name: 'Cursor Agent', build: buildCursorSessionRadar },
];

module.exports = {
  SESSION_RADAR_ADAPTERS,
  resolveGrokHome,
  resolveClaudeHome,
  resolveCodexHome,
  resolveKimiHome,
  resolveGeminiHome,
  buildGrokSessionRadar,
  buildClaudeSessionRadar,
  buildCodexSessionRadar,
  buildKimiSessionRadar,
  buildGeminiSessionRadar,
  buildCursorSessionRadar,
  analyzeGrokSessionFolder,
  analyzeClaudeSessionFile,
  analyzeCodexRollout,
  analyzeKimiSessionDir,
  findKimiSessionDir,
  decodeClaudeProjectPath,
};