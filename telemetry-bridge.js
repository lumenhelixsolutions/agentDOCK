/**
 * Sync HOOT provider-cooldown registry ↔ Hermes ai_status.json telemetry file.
 */

const fs = require('fs');
const path = require('path');
const { loadState, saveState, enrichRegistry, effectiveStatus } = require('./provider-cooldown');

const DEFAULT_TELEMETRY_FILE = 'C:/web/hermes-data/telemetry/ai_status.json';

function telemetryFile() {
  return process.env.AGENTDOCK_TELEMETRY_FILE || DEFAULT_TELEMETRY_FILE;
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

function hootToTelemetry(state, scan) {
  const registry = enrichRegistry(state, { scan });
  const providers = {};
  for (const [id, row] of Object.entries(registry.providers || {})) {
    const status = row.effective_status || effectiveStatus(row);
    providers[id] = {
      label: row.label,
      status: status === 'cooldown' ? 'COOLDOWN' : 'ACTIVE',
      cooldown_until: row.cooldown_until || null,
      limits_ref: row.limits_ref || null,
      last_updated: row.last_updated || registry.updated_at,
      source: row.source || 'hoot',
      eta: row.eta || null,
    };
  }
  return {
    version: 1,
    updated_at: new Date().toISOString(),
    providers,
    current_session_provider: registry.current_session_provider || null,
    workspace_roots: {
      app: process.env.HERMES_APP_ROOT || 'C:/web/hermes-app',
      core: process.env.HERMES_CORE_ROOT || 'C:/web/hermes-core',
      data: process.env.HERMES_DATA_ROOT || 'C:/web/hermes-data',
    },
    matrix_line: registry.matrix_line,
  };
}

function syncTelemetryToDisk({ scan } = {}) {
  const state = loadState();
  const payload = hootToTelemetry(state, scan);
  writeJSON(telemetryFile(), payload);
  return payload;
}

function telemetryToHootPatch(telemetry) {
  const patches = [];
  for (const [id, row] of Object.entries(telemetry.providers || {})) {
    const status = String(row.status || '').toUpperCase() === 'COOLDOWN' ? 'cooldown' : 'active';
    patches.push({
      provider: id,
      status,
      cooldown_until: row.cooldown_until || null,
      source: 'telemetry-import',
    });
  }
  return {
    patches,
    current_session_provider: telemetry.current_session_provider || null,
  };
}

function importTelemetryFromDisk() {
  const file = telemetryFile();
  if (!fs.existsSync(file)) return { ok: false, error: 'telemetry file missing' };
  const telemetry = readJSON(file, null);
  if (!telemetry?.providers) return { ok: false, error: 'invalid telemetry format' };
  const { patches, current_session_provider } = telemetryToHootPatch(telemetry);
  let state = loadState();
  const { patchProvider } = require('./provider-cooldown');
  for (const p of patches) {
    try {
      state = patchProvider(p);
    } catch { /* skip unknown */ }
  }
  if (current_session_provider !== undefined) {
    state.current_session_provider = current_session_provider;
    state = saveState(state);
  }
  return { ok: true, state, telemetry };
}

function remainingCooldownMs(providerId, now = new Date()) {
  const telemetry = readJSON(telemetryFile(), null);
  const row = telemetry?.providers?.[providerId];
  if (!row || String(row.status).toUpperCase() !== 'COOLDOWN' || !row.cooldown_until) return 0;
  const until = new Date(row.cooldown_until).getTime();
  return Math.max(0, until - now.getTime());
}

function listActiveProviders(now = new Date()) {
  const telemetry = readJSON(telemetryFile(), null);
  if (!telemetry?.providers) return [];
  return Object.entries(telemetry.providers)
    .filter(([, row]) => {
      if (String(row.status).toUpperCase() !== 'COOLDOWN') return true;
      if (!row.cooldown_until) return false;
      return new Date(row.cooldown_until).getTime() <= now.getTime();
    })
    .map(([id]) => id);
}

module.exports = {
  telemetryFile,
  syncTelemetryToDisk,
  importTelemetryFromDisk,
  hootToTelemetry,
  remainingCooldownMs,
  listActiveProviders,
};