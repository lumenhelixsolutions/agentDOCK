/**
 * HOOT workspace roots — configurable trees for handoff + boundary tagging.
 */

const fs = require('fs');
const path = require('path');
const { inferRootsFromProject } = require('./workspace-infer');

const DEFAULT_STATE_FILE = path.join(__dirname, 'state', 'workspace-roots.json');

function stateFile() {
  return process.env.AGENTDOCK_WORKSPACE_ROOTS_FILE || DEFAULT_STATE_FILE;
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

function defaultRoots(activeProjectPath) {
  const base = activeProjectPath ? path.normalize(activeProjectPath) : null;
  const mk = (id, label, sub, role) => ({
    id,
    label,
    path: base ? path.join(base, sub) : '',
    role,
  });
  return {
    version: 1,
    roots: [
      mk('app', 'Application', 'ui', 'ui'),
      mk('core', 'Core logic', '.', 'backend'),
      mk('data', 'Data & cache', 'data', 'data'),
    ],
    active_root_id: 'core',
    enforce_boundaries: false,
    inferred: false,
    inferred_from: null,
    updated_at: new Date().toISOString(),
  };
}

function loadRoots(activeProjectPath) {
  const fallback = defaultRoots(activeProjectPath);
  const stored = readJSON(stateFile(), fallback);
  return {
    version: stored.version || 1,
    roots: Array.isArray(stored.roots) ? stored.roots : fallback.roots,
    active_root_id: stored.active_root_id || fallback.active_root_id,
    enforce_boundaries: Boolean(stored.enforce_boundaries),
    inferred: Boolean(stored.inferred),
    inferred_from: stored.inferred_from || null,
    updated_at: stored.updated_at || new Date().toISOString(),
  };
}

function saveRoots(data) {
  const next = { ...data, updated_at: new Date().toISOString() };
  writeJSON(stateFile(), next);
  return next;
}

function getActiveRoot(rootsState) {
  const id = rootsState.active_root_id;
  return (rootsState.roots || []).find((r) => r.id === id) || rootsState.roots?.[0] || null;
}

function getActiveRootPath(rootsState, fallbackPath) {
  const active = getActiveRoot(rootsState);
  if (active?.path) return path.normalize(active.path);
  return fallbackPath ? path.normalize(fallbackPath) : null;
}

function validateRoots(rootsState) {
  const results = (rootsState.roots || []).map((root) => {
    const p = root.path ? path.normalize(root.path) : '';
    const exists = p ? fs.existsSync(p) : false;
    return { ...root, path: p, exists, valid: Boolean(p && exists) };
  });
  const active = getActiveRoot(rootsState);
  return {
    roots: results,
    active_root_id: rootsState.active_root_id,
    active_root: active ? results.find((r) => r.id === active.id) || { ...active, exists: false, valid: false } : null,
    enforce_boundaries: rootsState.enforce_boundaries,
    all_valid: results.every((r) => !r.path || r.exists),
  };
}

function buildTerseContext(rootsState) {
  if (!rootsState?.enforce_boundaries) return null;
  const active = getActiveRoot(rootsState);
  if (!active?.path) return null;
  return {
    active_root: active.path,
    active_root_label: active.label,
    rule: 'Prefer minimal diffs; no filler prose in generated handoffs and operator exports.',
  };
}

function putRoots(patch, activeProjectPath) {
  const current = loadRoots(activeProjectPath);
  const next = {
    ...current,
    active_root_id: patch.active_root_id ?? current.active_root_id,
    enforce_boundaries: patch.enforce_boundaries ?? current.enforce_boundaries,
    roots: Array.isArray(patch.roots) ? patch.roots : current.roots,
    inferred: patch.inferred ?? (Array.isArray(patch.roots) ? false : current.inferred),
    inferred_from: patch.inferred_from ?? current.inferred_from,
  };
  return saveRoots(next);
}

function applyInferredRoots(projectPath, { force = false } = {}) {
  const current = loadRoots(projectPath);
  if (!force && !current.inferred && current.roots?.some((r) => r.path)) return current;
  const inferred = inferRootsFromProject(projectPath);
  if (!inferred.roots?.length) return current;
  return saveRoots({
    ...current,
    roots: inferred.roots.map(({ id, label, path: p, role }) => ({ id, label, path: p, role })),
    active_root_id: inferred.active_root_id || current.active_root_id,
    inferred: true,
    inferred_from: inferred.inferred_from,
  });
}

module.exports = {
  stateFile,
  loadRoots,
  saveRoots,
  getActiveRoot,
  getActiveRootPath,
  validateRoots,
  buildTerseContext,
  putRoots,
  applyInferredRoots,
  defaultRoots,
};