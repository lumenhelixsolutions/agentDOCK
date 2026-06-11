/**
 * HOOT scan cache — hydrate lastScan from logs, serve cached scans without PowerShell.
 */

const fs = require('fs');
const path = require('path');

function findLatestScanLog(logsDir) {
  if (!fs.existsSync(logsDir)) return null;
  let best = null;
  let bestMtime = 0;
  for (const name of fs.readdirSync(logsDir)) {
    if (!name.startsWith('scan-') || !name.endsWith('.json')) continue;
    const full = path.join(logsDir, name);
    try {
      const mtime = fs.statSync(full).mtimeMs;
      if (mtime >= bestMtime) {
        bestMtime = mtime;
        best = full;
      }
    } catch { /* skip */ }
  }
  return best;
}

function loadScanFromFile(file) {
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!raw || typeof raw !== 'object') return null;
    return raw;
  } catch {
    return null;
  }
}

function hydrateLastScan(logsDir) {
  const file = findLatestScanLog(logsDir);
  if (!file) return null;
  const scan = loadScanFromFile(file);
  if (!scan) return null;
  return {
    scan,
    meta: {
      source: 'logs',
      file: path.basename(file),
      loaded_at: new Date().toISOString(),
      scanned_at: scan.scanned_at || null,
    },
  };
}

function attachCacheMeta(scan, { cached = true, source = 'memory', file = null } = {}) {
  const scannedAt = scan?.scanned_at ? new Date(scan.scanned_at).getTime() : null;
  const age_ms = scannedAt ? Math.max(0, Date.now() - scannedAt) : null;
  return {
    ...scan,
    _cache: {
      cached,
      source,
      file,
      age_ms,
      scanned_at: scan?.scanned_at || null,
      stale: age_ms != null ? age_ms > 6 * 60 * 60 * 1000 : true,
    },
  };
}

module.exports = {
  findLatestScanLog,
  loadScanFromFile,
  hydrateLastScan,
  attachCacheMeta,
};