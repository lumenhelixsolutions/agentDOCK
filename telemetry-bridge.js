/**
 * HOOT telemetry export — provider cooldown registry → ai_status.json
 * Canonical file: <HOOT_ROOT>/state/ai_status.json
 * Optional mirror: <workspace data root>/telemetry/ai_status.json (from workspace-roots)
 */

const fs = require('fs');
const path = require('path');
const { loadState, saveState, enrichRegistry, effectiveStatus } = require('./provider-cooldown');
const { loadRoots } = require('./workspace-roots');

function resolveHootRoot(hootRoot) {
  return hootRoot || path.join(__dirname);
}

function kernelTelemetryFile(hootRoot) {
  const root = resolveHootRoot(hootRoot);
  if (process.env.AGENTDOCK_AI_STATUS_FILE) return process.env.AGENTDOCK_AI_STATUS_FILE;
  return path.join(root, 'state', 'ai_status.json');
}

function mirrorTelemetryFile(hootRoot, activeProject) {
  const rootsState = loadRoots(activeProject);
  const dataRoot = (rootsState.roots || []).find((r) => r.id === 'data' || r.role === 'data');
  if (!dataRoot?.path) return null;
  return path.join(path.normalize(dataRoot.path), 'telemetry', 'ai_status.json');
}

function telemetryTargets(hootRoot, activeProject) {
  const kernel = kernelTelemetryFile(hootRoot);
  const mirror = mirrorTelemetryFile(hootRoot, activeProject);
  const files = [kernel];
  if (mirror && path.normalize(mirror) !== path.normalize(kernel)) files.push(mirror);
  return { kernel, mirror, files };
}

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback == null ? null : JSON.parse(JSON.stringify(fallback));
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback == null ? null : JSON.parse(JSON.stringify(fallback));
  }
}

function writeJSON(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8');
}

function rootsMap(rootsState) {
  const map = {};
  for (const r of rootsState?.roots || []) {
    if (r.id && r.path) map[r.id] = path.normalize(r.path);
  }
  return map;
}

function hootToTelemetry(state, { scan, hootRoot, activeProject } = {}) {
  const registry = enrichRegistry(state, { scan });
  const rootsState = loadRoots(activeProject);
  const targets = telemetryTargets(hootRoot, activeProject);
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
    hoot_root: resolveHootRoot(hootRoot),
    telemetry_files: targets,
    providers,
    current_session_provider: registry.current_session_provider || null,
    workspace_roots: rootsMap(rootsState),
    active_root_id: rootsState.active_root_id || null,
    matrix_line: registry.matrix_line,
  };
}

function syncTelemetryToDisk({ scan, hootRoot, activeProject } = {}) {
  const state = loadState();
  const payload = hootToTelemetry(state, { scan, hootRoot, activeProject });
  const { files } = telemetryTargets(hootRoot, activeProject);
  for (const file of files) writeJSON(file, payload);
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

function readTelemetryFromDisk(hootRoot, activeProject) {
  const { kernel, mirror } = telemetryTargets(hootRoot, activeProject);
  if (fs.existsSync(kernel)) return { file: kernel, data: readJSON(kernel, null) };
  if (mirror && fs.existsSync(mirror)) return { file: mirror, data: readJSON(mirror, null) };
  return { file: null, data: null };
}

function importTelemetryFromDisk({ hootRoot, activeProject } = {}) {
  const { file, data } = readTelemetryFromDisk(hootRoot, activeProject);
  if (!file || !data?.providers) return { ok: false, error: 'telemetry file missing' };
  const { patches, current_session_provider } = telemetryToHootPatch(data);
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
  return { ok: true, state, telemetry: data, file };
}

function remainingCooldownMs(providerId, { hootRoot, activeProject } = {}, now = new Date()) {
  const { data } = readTelemetryFromDisk(hootRoot, activeProject);
  const row = data?.providers?.[providerId];
  if (!row || String(row.status).toUpperCase() !== 'COOLDOWN' || !row.cooldown_until) return 0;
  const until = new Date(row.cooldown_until).getTime();
  return Math.max(0, until - now.getTime());
}

function listActiveProviders({ hootRoot, activeProject } = {}, now = new Date()) {
  const { data } = readTelemetryFromDisk(hootRoot, activeProject);
  if (!data?.providers) return [];
  return Object.entries(data.providers)
    .filter(([, row]) => {
      if (String(row.status).toUpperCase() !== 'COOLDOWN') return true;
      if (!row.cooldown_until) return false;
      return new Date(row.cooldown_until).getTime() <= now.getTime();
    })
    .map(([id]) => id);
}

module.exports = {
  kernelTelemetryFile,
  mirrorTelemetryFile,
  telemetryTargets,
  syncTelemetryToDisk,
  importTelemetryFromDisk,
  readTelemetryFromDisk,
  hootToTelemetry,
  remainingCooldownMs,
  listActiveProviders,
};