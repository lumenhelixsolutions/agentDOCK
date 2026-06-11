/**
 * HOOT context radar — workspace file-system interceptor (manifest §2).
 * Scans configured workspace roots for recently modified source files and
 * estimates the token cost of feeding them to a provider. No hard-coded paths.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_EXTS = ['.py', '.js', '.jsx', '.ts', '.tsx', '.json', '.html', '.css', '.md'];

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', '.next', '.venv', 'venv',
  '__pycache__', '.cache', 'coverage', 'state', 'logs', '.agentdock',
]);

const MAX_DEPTH = 6;
const MAX_FILES_PER_ROOT = 200;
const MAX_FILE_BYTES = 2 * 1024 * 1024; // skip blobs masquerading as source

function estTokens(bytes) {
  return Math.ceil(bytes / 4);
}

function scanTree(rootPath, { sinceMs, exts, now }) {
  const files = [];
  let truncated = false;
  const walk = (dir, depth) => {
    if (depth > MAX_DEPTH || files.length >= MAX_FILES_PER_ROOT) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (files.length >= MAX_FILES_PER_ROOT) {
        truncated = true;
        return;
      }
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (!IGNORE_DIRS.has(ent.name) && !ent.name.startsWith('.')) walk(full, depth + 1);
        continue;
      }
      if (!ent.isFile()) continue;
      const ext = path.extname(ent.name).toLowerCase();
      if (!exts.includes(ext)) continue;
      let stat;
      try {
        stat = fs.statSync(full);
      } catch {
        continue;
      }
      if (stat.size > MAX_FILE_BYTES) continue;
      if (now - stat.mtimeMs > sinceMs) continue;
      files.push({
        path: path.relative(rootPath, full).split(path.sep).join('/'),
        ext: ext.replace(/^\./, ''),
        mtime_iso: new Date(stat.mtimeMs).toISOString(),
        age_minutes: Math.max(0, Math.round((now - stat.mtimeMs) / 60000)),
        size_bytes: stat.size,
        est_tokens: estTokens(stat.size),
      });
    }
  };
  walk(rootPath, 0);
  files.sort((a, b) => a.age_minutes - b.age_minutes);
  return { files, truncated };
}

/**
 * Build the radar payload from workspace roots (falls back to the active
 * project as a single pseudo-root when no roots are configured).
 */
function buildContextRadar({ rootsState, activeProject, hours = 2, exts = DEFAULT_EXTS } = {}) {
  const now = Date.now();
  const windowHours = Math.min(48, Math.max(0.25, Number(hours) || 2));
  const sinceMs = windowHours * 3600 * 1000;

  let roots = (rootsState?.roots || []).filter((r) => r.path);
  if (!roots.length && activeProject) {
    roots = [{ id: 'project', label: path.basename(activeProject), path: activeProject, role: 'project' }];
  }

  const seen = new Set();
  const results = [];
  for (const root of roots) {
    const normalized = path.normalize(root.path);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    const exists = fs.existsSync(normalized);
    const { files, truncated } = exists ? scanTree(normalized, { sinceMs, exts, now }) : { files: [], truncated: false };
    results.push({
      id: root.id,
      label: root.label || root.id,
      role: root.role || null,
      path: normalized,
      exists,
      active: rootsState?.active_root_id === root.id,
      files,
      truncated,
      total_files: files.length,
      total_est_tokens: files.reduce((sum, f) => sum + f.est_tokens, 0),
    });
  }

  return {
    generated_at: new Date(now).toISOString(),
    window_hours: windowHours,
    extensions: exts,
    roots: results,
    totals: {
      files: results.reduce((sum, r) => sum + r.total_files, 0),
      est_tokens: results.reduce((sum, r) => sum + r.total_est_tokens, 0),
    },
  };
}

module.exports = {
  DEFAULT_EXTS,
  buildContextRadar,
  estTokens,
};
