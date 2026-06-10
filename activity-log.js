/**
 * HOOT Activity log — session diary from radar diffs, launches, and module events.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_STATE = { version: 1, events: [], sessions: {}, daily: {} };
const MAX_EVENTS = 5000;

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJSON(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function createActivityLog({ stateFile, diaryDir, root }) {
  const statePath = stateFile;
  const diaryPath = diaryDir;

  function load() {
    const data = readJSON(statePath, { ...DEFAULT_STATE });
    if (!Array.isArray(data.events)) data.events = [];
    if (!data.sessions || typeof data.sessions !== 'object') data.sessions = {};
    if (!data.daily || typeof data.daily !== 'object') data.daily = {};
    return data;
  }

  function save(data) {
    data.events = (data.events || []).slice(-MAX_EVENTS);
    writeJSON(statePath, data);
  }

  function appendEvent(event) {
    const data = load();
    const entry = {
      id: event.id || `evt-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      at: event.at || new Date().toISOString(),
      type: event.type,
      agent: event.agent || null,
      agent_name: event.agent_name || null,
      source: event.source || null,
      project: event.project || null,
      session_ref: event.session_ref || null,
      duration_ms: event.duration_ms || null,
      meta: event.meta || {},
    };
    data.events.push(entry);
    const day = entry.at.slice(0, 10);
    if (!data.daily[day]) {
      data.daily[day] = { date: day, events: 0, dock_minutes: 0, external_minutes: 0, launches: 0 };
    }
    data.daily[day].events += 1;
    if (entry.type === 'session.launch') data.daily[day].launches += 1;
    if (entry.duration_ms && entry.source === 'agentdock') {
      data.daily[day].dock_minutes += Math.round(entry.duration_ms / 60000);
    }
    if (entry.duration_ms && entry.source === 'external') {
      data.daily[day].external_minutes += Math.round(entry.duration_ms / 60000);
    }
    save(data);
    return entry;
  }

  function diffRadarSnapshots(prev, next, { project = null } = {}) {
    const prevMap = new Map();
    for (const p of prev?.processes || []) {
      if (p.pid) prevMap.set(Number(p.pid), p);
    }
    const nextMap = new Map();
    for (const p of next?.processes || []) {
      if (p.pid) nextMap.set(Number(p.pid), p);
    }
    const now = next?.scanned_at || new Date().toISOString();
    const started = [];
    const stopped = [];

    for (const [pid, proc] of nextMap) {
      if (!prevMap.has(pid)) {
        const data = load();
        const key = `radar-${pid}`;
        data.sessions[key] = {
          pid,
          agent_id: proc.agent_id,
          agent_name: proc.agent_name,
          source: proc.source,
          started_at: now,
          project,
        };
        save(data);
        const ev = appendEvent({
          type: proc.source === 'agentdock' ? 'agent.dock.start' : 'agent.external.start',
          at: now,
          agent: proc.agent_id,
          agent_name: proc.agent_name,
          source: proc.source,
          project,
          meta: { pid },
        });
        started.push(ev);
      }
    }

    for (const [pid, proc] of prevMap) {
      if (!nextMap.has(pid)) {
        const data = load();
        const key = `radar-${pid}`;
        const sess = data.sessions[key];
        const startedAt = sess?.started_at ? new Date(sess.started_at).getTime() : Date.now();
        const duration_ms = Math.max(0, Date.now() - startedAt);
        delete data.sessions[key];
        save(data);
        const ev = appendEvent({
          type: proc.source === 'agentdock' ? 'agent.dock.stop' : 'agent.external.stop',
          at: now,
          agent: proc.agent_id,
          agent_name: proc.agent_name,
          source: proc.source,
          project: sess?.project || project,
          duration_ms,
          meta: { pid },
        });
        stopped.push(ev);
      }
    }

    return { started, stopped };
  }

  function recordLaunch({ id, profileId, profileName, project = null }) {
    return appendEvent({
      type: 'session.launch',
      agent: profileId,
      agent_name: profileName,
      source: 'agentdock',
      project,
      session_ref: id,
    });
  }

  function recordLaunchEnd({ id, profileId, profileName, startedAt, endedAt, exitCode, project = null }) {
    const duration_ms = startedAt && endedAt ? Math.max(0, new Date(endedAt).getTime() - new Date(startedAt).getTime()) : null;
    return appendEvent({
      type: exitCode === 0 ? 'session.end' : 'session.fail',
      agent: profileId,
      agent_name: profileName,
      source: 'agentdock',
      project,
      session_ref: id,
      duration_ms,
      meta: { exitCode },
    });
  }

  function queryEvents({ from, to, limit = 500 } = {}) {
    const data = load();
    let events = [...data.events];
    if (from) events = events.filter((e) => e.at >= from);
    if (to) events = events.filter((e) => e.at <= `${to}T23:59:59.999Z`);
    return {
      events: events.slice(-limit).reverse(),
      daily: data.daily,
      total: data.events.length,
    };
  }

  function todaySummary() {
    const day = new Date().toISOString().slice(0, 10);
    const data = load();
    const events = data.events.filter((e) => e.at.startsWith(day));
    return {
      date: day,
      rollup: data.daily[day] || { date: day, events: events.length, dock_minutes: 0, external_minutes: 0, launches: 0 },
      events: events.slice(-100).reverse(),
    };
  }

  function generateDiaryMarkdown(date) {
    const data = load();
    const day = date || new Date().toISOString().slice(0, 10);
    const events = data.events.filter((e) => e.at.startsWith(day));
    const rollup = data.daily[day] || {};
    const lines = [
      `# HOOT Activity — ${day}`,
      '',
      '## Summary',
      `- ${rollup.events || events.length} events`,
      `- ${rollup.launches || 0} HOOT launches`,
      `- ~${rollup.dock_minutes || 0}m docked agent time`,
      `- ~${rollup.external_minutes || 0}m external agent time`,
      '',
      '## Timeline',
    ];
    if (events.length === 0) {
      lines.push('- No activity logged yet.');
    } else {
      for (const e of events) {
        const t = e.at.slice(11, 16);
        const dur = e.duration_ms ? ` · ${Math.round(e.duration_ms / 60000)}m` : '';
        lines.push(`- ${t} — ${e.type}${e.agent_name ? ` · ${e.agent_name}` : ''}${dur}`);
      }
    }
    lines.push('');
    return lines.join('\n');
  }

  function writeDiary(date) {
    const day = date || new Date().toISOString().slice(0, 10);
    fs.mkdirSync(diaryPath, { recursive: true });
    const file = path.join(diaryPath, `${day}.md`);
    fs.writeFileSync(file, generateDiaryMarkdown(day), 'utf8');
    return file;
  }

  return {
    load,
    appendEvent,
    diffRadarSnapshots,
    recordLaunch,
    recordLaunchEnd,
    queryEvents,
    todaySummary,
    generateDiaryMarkdown,
    writeDiary,
  };
}

module.exports = { createActivityLog, DEFAULT_STATE };