/**
 * Grok CLI session radar — reads ~/.grok/active_sessions.json and session telemetry
 * for HOOT production context + token burn analysis.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

function resolveGrokHome() {
  const env = process.env.GROK_HOME || process.env.GROK_CLI_HOME;
  if (env) return path.resolve(env);
  return path.join(os.homedir(), '.grok');
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

function grokSessionDir(grokHome, cwd, sessionId) {
  const enc = encodeURIComponent(String(cwd || '').replace(/\//g, '\\'));
  return path.join(grokHome, 'sessions', enc, sessionId);
}

function readJsonlTail(filePath, maxLines = 4000) {
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const lines = raw.split(/\r?\n/).filter(Boolean);
    return lines.slice(-maxLines);
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

function extractLastUserQuery(chatRows) {
  for (let i = chatRows.length - 1; i >= 0; i -= 1) {
    const row = chatRows[i];
    if (row?.type !== 'user') continue;
    const content = row.content;
    if (typeof content === 'string') return content.slice(0, 280);
    if (Array.isArray(content)) {
      const text = content
        .filter((p) => p?.type === 'text' && p.text)
        .map((p) => p.text)
        .join('\n');
      const m = /<user_query>\s*([\s\S]*?)\s*<\/user_query>/i.exec(text);
      return (m?.[1] || text).trim().slice(0, 280);
    }
  }
  return null;
}

function analyzeSessionFolder(sessionDir) {
  const eventsPath = path.join(sessionDir, 'events.jsonl');
  const chatPath = path.join(sessionDir, 'chat_history.jsonl');
  const events = parseJsonlLines(readJsonlTail(eventsPath, 8000));
  const chatLines = readJsonlTail(chatPath, 500);
  const chatRows = parseJsonlLines(chatLines);

  let lastTurn = null;
  let turnCount = 0;
  let compactionCount = 0;
  for (const ev of events) {
    if (ev.type === 'turn_started') lastTurn = ev;
    if (ev.type === 'turn_started' || ev.type === 'turn_ended') turnCount += 1;
  }
  const completedTurns = events.filter((e) => e.type === 'turn_ended').length;

  for (const row of chatRows) {
    if (row?.synthetic_reason === 'compaction_meta') compactionCount += 1;
  }

  let chatBytes = 0;
  try {
    chatBytes = fs.statSync(chatPath).size;
  } catch { /* ignore */ }

  const estContextTokens = estTokensFromText(chatLines.join('\n'));
  const userMessages = chatRows.filter((r) => r.type === 'user').length;
  const assistantMessages = chatRows.filter((r) => r.type === 'assistant').length;

  return {
    model_id: lastTurn?.model_id || null,
    conversation_message_count: lastTurn?.conversation_message_count ?? chatRows.length,
    turn_number: lastTurn?.turn_number ?? null,
    yolo_mode: Boolean(lastTurn?.yolo_mode),
    completed_turns: completedTurns,
    compaction_count: compactionCount,
    user_messages: userMessages,
    assistant_messages: assistantMessages,
    est_context_tokens: estContextTokens,
    chat_bytes: chatBytes,
    last_user_query: extractLastUserQuery(chatRows),
    events_bytes: (() => {
      try { return fs.statSync(eventsPath).size; } catch { return 0; }
    })(),
  };
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

function buildGrokSessionRadar({ activeProject } = {}) {
  const grokHome = resolveGrokHome();
  const activeFile = path.join(grokHome, 'active_sessions.json');
  if (!fs.existsSync(activeFile)) {
    return {
      grok_home: grokHome,
      scanned_at: new Date().toISOString(),
      sessions: [],
      summary: { active: 0, matched_project: 0, est_context_tokens: 0, turn_count: 0 },
    };
  }

  let entries = [];
  try {
    entries = JSON.parse(fs.readFileSync(activeFile, 'utf8'));
  } catch {
    entries = [];
  }
  if (!Array.isArray(entries)) entries = [];

  const sessions = [];
  for (const entry of entries) {
    const pid = Number(entry.pid);
    if (!isPidAlive(pid)) continue;
    const sessionDir = grokSessionDir(grokHome, entry.cwd, entry.session_id);
    const metrics = analyzeSessionFolder(sessionDir);
    const matchedProject = cwdMatchesProject(entry.cwd, activeProject);
    sessions.push({
      agent_id: 'grok',
      agent_name: 'Grok CLI',
      provider: 'grok',
      source: 'external',
      pid,
      session_id: entry.session_id,
      cwd: entry.cwd,
      opened_at: entry.opened_at,
      matched_project: matchedProject,
      process_name: 'agent.exe',
      command: `${path.join(grokHome, 'bin', 'agent.exe')} (session ${entry.session_id.slice(0, 8)}…)`,
      ...metrics,
    });
  }

  const matched = sessions.filter((s) => s.matched_project);
  const estTotal = sessions.reduce((n, s) => n + (s.est_context_tokens || 0), 0);
  const turns = sessions.reduce((n, s) => n + (s.completed_turns || 0), 0);

  return {
    grok_home: grokHome,
    scanned_at: new Date().toISOString(),
    sessions,
    summary: {
      active: sessions.length,
      matched_project: matched.length,
      est_context_tokens: estTotal,
      turn_count: turns,
      compaction_events: sessions.reduce((n, s) => n + (s.compaction_count || 0), 0),
    },
  };
}

module.exports = {
  resolveGrokHome,
  grokSessionDir,
  isPidAlive,
  analyzeSessionFolder,
  buildGrokSessionRadar,
};