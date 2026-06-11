/**
 * Infer workspace roots from a project's on-disk layout (scan/registry driven).
 */

const fs = require('fs');
const path = require('path');

const APP_DIRS = ['ui', 'frontend', 'client', 'app', 'web', 'apps'];
const CORE_DIRS = ['backend', 'server', 'core', 'api', 'lib', 'src'];
const DATA_DIRS = ['data', 'state', 'generated', 'cache', 'storage', 'diary', 'telemetry'];

function listSubdirs(dirPath) {
  try {
    return fs
      .readdirSync(dirPath, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')
      .map((e) => e.name);
  } catch {
    return [];
  }
}

function pickSubdir(subdirs, candidates) {
  for (const c of candidates) {
    if (subdirs.includes(c)) return c;
  }
  return null;
}

function hasFile(dirPath, name) {
  try {
    return fs.existsSync(path.join(dirPath, name));
  } catch {
    return false;
  }
}

function inferRootsFromProject(projectPath) {
  const base = projectPath ? path.normalize(projectPath) : null;
  if (!base || !fs.existsSync(base)) {
    return { roots: [], active_root_id: null, inferred: false, inferred_from: null, hints: ['No project path'] };
  }

  const subdirs = listSubdirs(base);
  const hints = [];
  let appSub = pickSubdir(subdirs, APP_DIRS);
  let coreSub = pickSubdir(subdirs, CORE_DIRS);
  let dataSub = pickSubdir(subdirs, DATA_DIRS);

  if (!coreSub && (hasFile(base, 'server.js') || hasFile(base, 'package.json') || hasFile(base, 'pyproject.toml'))) {
    coreSub = '.';
    hints.push('Core at repo root (server/package manifest detected)');
  }
  if (!appSub && hasFile(base, 'vite.config.ts')) {
    appSub = '.';
    hints.push('App at repo root (Vite config detected)');
  }
  if (!appSub && appSub !== '.' && subdirs.includes('ui')) appSub = 'ui';

  if (!dataSub && subdirs.includes('state')) dataSub = 'state';

  const mk = (id, label, sub, role) => ({
    id,
    label,
    path: sub === '.' ? base : path.join(base, sub),
    role,
    sub: sub || null,
  });

  const roots = [];
  if (appSub) roots.push(mk('app', 'Application', appSub, 'ui'));
  if (coreSub) roots.push(mk('core', 'Core logic', coreSub, 'backend'));
  if (dataSub) roots.push(mk('data', 'Data & cache', dataSub, 'data'));

  if (roots.length === 0) {
    roots.push(mk('core', 'Project root', '.', 'backend'));
    hints.push('Single-root project — using repo root');
  }

  const active =
    roots.find((r) => r.id === 'core')?.id ||
    roots.find((r) => r.id === 'app')?.id ||
    roots[0]?.id ||
    null;

  return {
    roots,
    active_root_id: active,
    inferred: true,
    inferred_from: base,
    hints,
    subdirs_found: subdirs.slice(0, 16),
  };
}

module.exports = {
  APP_DIRS,
  CORE_DIRS,
  DATA_DIRS,
  inferRootsFromProject,
  listSubdirs,
};