/**
 * HOOT provider cooldown registry — manual + scan-backed quota rotation state.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_STATE_FILE = path.join(__dirname, 'state', 'provider-cooldown.json');

const LIMITS_REF = {
  claude: {
    messages: 45, window_hours: 5, recovery_note: '~1 msg / 7 min',
    limit_type: 'rolling_window', max_messages: 45, replenish_rate_minutes: 7.1,
    context_penalty: true, notes: 'Long-context sessions can deplete message blocks up to 3x faster.',
  },
  chatgpt: {
    messages: 80, window_hours: 3, recovery_note: 'resets on window boundary',
    limit_type: 'rolling_window', max_messages: 80, replenish_rate_minutes: 2.25,
    notes: 'Resets 3 hours from execution of each message chunk.',
  },
  gemini: {
    messages: null, window_hours: null, recovery_note: 'daily reset 08:00 UTC',
    limit_type: 'daily_reset', reset_time_utc: '08:00:00', max_requests: 1500,
    notes: 'Daily transaction caps hit before context boundaries.',
  },
  kimi: {
    messages: null, window_hours: null, recovery_note: 'freeze on overuse — 5h lockout',
    limit_type: 'tier_based', lockout_duration_hours: 5,
    notes: 'Context freeze on overflow; rolling recovery block applies instantly.',
  },
  deepseek: {
    messages: 50, window_hours: 3, recovery_note: '429s at peak load regardless of count',
    limit_type: 'concurrency_dependent', max_messages: 50, replenish_rate_minutes: 3.6,
    notes: 'Throws 429 during high peak loads regardless of individual message count.',
  },
  perplexity: {
    messages: null, window_hours: null, recovery_note: 'daily reset 00:00 UTC',
    limit_type: 'daily_reset', reset_time_utc: '00:00:00', max_requests: 600,
    notes: 'Standard Search bypasses the daily pro execution allocation.',
  },
  ollama: { messages: null, window_hours: null, recovery_note: 'local — limited by hardware', limit_type: 'local' },
  llamacpp: { messages: null, window_hours: null, recovery_note: 'local — limited by hardware', limit_type: 'local' },
};

const PROVIDER_LABELS = {
  claude: 'Claude Pro',
  chatgpt: 'ChatGPT Plus',
  gemini: 'Gemini',
  kimi: 'Kimi',
  deepseek: 'DeepSeek',
  perplexity: 'Perplexity Pro',
  ollama: 'Ollama',
  llamacpp: 'llama.cpp',
};

const PROFILE_PROVIDER_MAP = {
  'claude-code': 'claude',
  claude: 'claude',
  codex: 'chatgpt',
  openai: 'chatgpt',
  chatgpt: 'chatgpt',
  'gemini-cli': 'gemini',
  gemini: 'gemini',
  kimi: 'kimi',
  moonshot: 'kimi',
  deepseek: 'deepseek',
  perplexity: 'perplexity',
  ollama: 'ollama',
  llamacpp: 'llamacpp',
  'llama.cpp': 'llamacpp',
};

function stateFile() {
  return process.env.AGENTDOCK_PROVIDER_COOLDOWN_FILE || DEFAULT_STATE_FILE;
}

function defaultProviderEntry(id) {
  const isLocal = id === 'ollama' || id === 'llamacpp';
  return {
    label: PROVIDER_LABELS[id] || id,
    status: isLocal ? 'local' : 'unknown',
    cooldown_until: null,
    limits_ref: LIMITS_REF[id] || null,
    last_updated: null,
    source: 'default',
  };
}

function defaultState() {
  const providers = {};
  for (const id of Object.keys(PROVIDER_LABELS)) {
    providers[id] = defaultProviderEntry(id);
  }
  return {
    version: 1,
    providers,
    current_session_provider: null,
    updated_at: new Date().toISOString(),
  };
}

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) return JSON.parse(JSON.stringify(fallback));
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return JSON.parse(JSON.stringify(fallback));
  }
}

function writeJSON(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8');
}

function loadState() {
  const base = defaultState();
  const stored = readJSON(stateFile(), base);
  const providers = { ...base.providers };
  for (const [id, row] of Object.entries(stored.providers || {})) {
    providers[id] = {
      ...defaultProviderEntry(id),
      ...row,
      limits_ref: row.limits_ref || LIMITS_REF[id] || null,
      label: row.label || PROVIDER_LABELS[id] || id,
    };
  }
  for (const id of Object.keys(PROVIDER_LABELS)) {
    if (!providers[id]) providers[id] = defaultProviderEntry(id);
  }
  return {
    version: stored.version || 1,
    providers,
    current_session_provider: stored.current_session_provider || null,
    updated_at: stored.updated_at || new Date().toISOString(),
  };
}

function saveState(state) {
  const next = { ...state, updated_at: new Date().toISOString() };
  writeJSON(stateFile(), next);
  return next;
}

function parseUntil(until) {
  if (!until) return null;
  const d = new Date(until);
  return Number.isNaN(d.getTime()) ? null : d;
}

function effectiveStatus(entry, now = new Date()) {
  const raw = String(entry?.status || 'unknown').toLowerCase();
  if (raw === 'local') return 'active';
  const until = parseUntil(entry?.cooldown_until);
  if (raw === 'cooldown' && until && until.getTime() <= now.getTime()) return 'active';
  if (raw === 'cooldown') return 'cooldown';
  if (raw === 'active') return 'active';
  return raw === 'local' ? 'active' : 'unknown';
}

function formatEta(until, now = new Date()) {
  const d = parseUntil(until);
  if (!d) return null;
  const diffMs = d.getTime() - now.getTime();
  if (diffMs <= 0) return 'ready now';
  const mins = Math.ceil(diffMs / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${hrs}h ${rem}m` : `${hrs}h`;
}

function formatCooldownUntil(until) {
  const d = parseUntil(until);
  if (!d) return null;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function nextDailyResetUtc(resetTimeUtc, now = new Date()) {
  const m = String(resetTimeUtc || '').match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const next = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
    Number(m[1]), Number(m[2]), Number(m[3] || 0), 0,
  ));
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

/** Countdown fields the deck gauges render from: remaining seconds, ring progress, recovery estimate. */
function computeGaugeFields(row, limits, status, now = new Date()) {
  const out = {
    ready_at_iso: null,
    seconds_remaining: null,
    progress: null,
    cooldown_started: null,
    est_messages_recovered: null,
    next_reset_iso: null,
  };
  if (limits?.limit_type === 'daily_reset' && limits.reset_time_utc) {
    const reset = nextDailyResetUtc(limits.reset_time_utc, now);
    out.next_reset_iso = reset ? reset.toISOString() : null;
  }
  if (status !== 'cooldown') return out;

  let until = parseUntil(row.cooldown_until);
  if (!until && out.next_reset_iso) until = new Date(out.next_reset_iso);
  if (!until) return out;

  out.ready_at_iso = until.toISOString();
  out.seconds_remaining = Math.max(0, Math.round((until.getTime() - now.getTime()) / 1000));

  const started = parseUntil(row.last_updated);
  if (started && started.getTime() < until.getTime()) {
    out.cooldown_started = started.toISOString();
    const total = until.getTime() - started.getTime();
    const elapsed = Math.min(total, Math.max(0, now.getTime() - started.getTime()));
    out.progress = Math.round((elapsed / total) * 1000) / 1000;
    if (limits?.replenish_rate_minutes && limits?.max_messages) {
      const recovered = Math.floor(elapsed / 60000 / limits.replenish_rate_minutes);
      out.est_messages_recovered = Math.min(limits.max_messages, recovered);
    }
  }
  return out;
}

function enrichRegistry(state, { scan } = {}) {
  const now = new Date();
  const providers = {};
  for (const [id, row] of Object.entries(state.providers || {})) {
    let status = effectiveStatus(row, now);
    let source = row.source || 'manual';
    if ((id === 'ollama' || id === 'llamacpp') && scan) {
      if (id === 'ollama' && scan.tools?.ollama?.present) {
        status = 'active';
        source = 'scan';
      }
      if (id === 'llamacpp') {
        const llama = (scan.local_models?.backends || []).find((b) => b.id === 'llamacpp');
        if (llama?.present || llama?.server?.reachable) {
          status = 'active';
          source = 'scan';
        }
      }
    }
    const limits = LIMITS_REF[id] || row.limits_ref || null;
    providers[id] = {
      ...row,
      effective_status: status,
      eta: status === 'cooldown' ? formatEta(row.cooldown_until, now) : null,
      cooldown_label: status === 'cooldown' ? formatCooldownUntil(row.cooldown_until) : null,
      source,
      limits_ref: limits,
      ...computeGaugeFields(row, limits, status, now),
    };
  }
  return {
    ...state,
    providers,
    limits_reference: LIMITS_REF,
    matrix_line: formatMatrixLine({ ...state, providers }),
  };
}

function formatMatrixLine(registry) {
  const parts = [];
  const order = ['claude', 'chatgpt', 'gemini', 'kimi', 'deepseek', 'perplexity', 'ollama', 'llamacpp'];
  for (const id of order) {
    const row = registry.providers?.[id];
    if (!row) continue;
    const status = row.effective_status || effectiveStatus(row);
    const label = (id === 'chatgpt' ? 'CHATGPT' : id.toUpperCase());
    if (status === 'cooldown' && row.cooldown_label) {
      parts.push(`${label}: COOLDOWN UNTIL ${row.cooldown_label}`);
    } else if (status === 'active' || status === 'local') {
      parts.push(`${label}: ACTIVE`);
    } else {
      parts.push(`${label}: ${status.toUpperCase()}`);
    }
  }
  return parts.join(' · ');
}

function formatRegistryHeader(registry, { sessionProvider, activeRoot, projectName } = {}) {
  const updated = registry.updated_at ? new Date(registry.updated_at) : new Date();
  const hh = String(updated.getHours()).padStart(2, '0');
  const mm = String(updated.getMinutes()).padStart(2, '0');
  const lines = [
    `PROVIDER MATRIX · updated ${hh}:${mm}`,
    registry.matrix_line || formatMatrixLine(registry),
  ];
  if (sessionProvider || activeRoot || projectName) {
    const tail = [
      sessionProvider ? `SESSION: ${sessionProvider}` : null,
      activeRoot ? `ROOT: ${activeRoot}` : null,
      projectName ? `PROJECT: ${projectName}` : null,
    ].filter(Boolean);
    if (tail.length) lines.push(tail.join(' · '));
  }
  return lines.join('\n');
}

function profileToProviderId(profile) {
  const command = String(profile?.meta?.command || profile?.meta?.frontend || '').toLowerCase();
  const backend = String(profile?.meta?.backend || '').toLowerCase();
  if (backend === 'ollama') return 'ollama';
  if (backend === 'llamacpp' || backend === 'llama.cpp') return 'llamacpp';
  if (PROFILE_PROVIDER_MAP[command]) return PROFILE_PROVIDER_MAP[command];
  for (const [key, val] of Object.entries(PROFILE_PROVIDER_MAP)) {
    if (command.includes(key)) return val;
  }
  return null;
}

function isProviderActive(providerId, registry) {
  if (!providerId) return true;
  const row = registry.providers?.[providerId];
  if (!row) return true;
  return (row.effective_status || effectiveStatus(row)) === 'active';
}

function patchProvider(patch) {
  const state = loadState();
  const id = String(patch.provider || '').toLowerCase();
  if (!state.providers[id]) throw new Error(`Unknown provider: ${id}`);
  const row = state.providers[id];
  if (patch.status) row.status = String(patch.status).toLowerCase();
  if (patch.cooldown_until !== undefined) row.cooldown_until = patch.cooldown_until || null;
  if (patch.label) row.label = patch.label;
  row.last_updated = new Date().toISOString();
  row.source = patch.source || 'manual';
  if (patch.current_session_provider !== undefined) {
    state.current_session_provider = patch.current_session_provider || null;
  }
  return saveState(state);
}

function applyCooldownPreset(providerId, preset, now = new Date()) {
  const presets = {
    '3hr': 3 * 60 * 60 * 1000,
    '5hr': 5 * 60 * 60 * 1000,
    midnight_pt: null,
  };
  let until = null;
  if (preset === 'midnight_pt') {
    const d = new Date(now);
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    const pt = new Date(utc - 7 * 3600000);
    pt.setHours(24, 0, 0, 0);
    until = new Date(pt.getTime() + 7 * 3600000 - d.getTimezoneOffset() * 60000).toISOString();
  } else if (presets[preset]) {
    until = new Date(now.getTime() + presets[preset]).toISOString();
  } else if (preset) {
    const parsed = parseUntil(preset);
    if (parsed) until = parsed.toISOString();
  }
  return patchProvider({ provider: providerId, status: 'cooldown', cooldown_until: until, source: 'manual' });
}

function scoreProfileForCooldown(profile, registry) {
  const providerId = profileToProviderId(profile);
  if (!providerId) return 0;
  const row = registry.providers?.[providerId];
  const status = row?.effective_status || effectiveStatus(row || {});
  if (status === 'active') return 30;
  if (status === 'cooldown') return -50;
  if (status === 'unknown') return -5;
  return 0;
}

module.exports = {
  LIMITS_REF,
  PROVIDER_LABELS,
  PROFILE_PROVIDER_MAP,
  stateFile,
  loadState,
  saveState,
  enrichRegistry,
  patchProvider,
  applyCooldownPreset,
  effectiveStatus,
  formatEta,
  nextDailyResetUtc,
  computeGaugeFields,
  formatMatrixLine,
  formatRegistryHeader,
  profileToProviderId,
  isProviderActive,
  scoreProfileForCooldown,
};