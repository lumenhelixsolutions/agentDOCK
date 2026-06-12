/**
 * HOOT version metadata — reads project-folder sources (VERSION, package.json, README).
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname);

function readText(file) {
  try {
    if (!fs.existsSync(file)) return null;
    return fs.readFileSync(file, 'utf8').trim();
  } catch {
    return null;
  }
}

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function readVersionFile(hootRoot = ROOT) {
  const raw = readText(path.join(hootRoot, 'VERSION'));
  if (!raw) return null;
  return raw.split('\n')[0].trim();
}

function readPackageVersion(hootRoot = ROOT) {
  const pkg = readJSON(path.join(hootRoot, 'package.json'), {});
  return pkg.version || null;
}

function readUiVersion(hootRoot = ROOT) {
  const pkg = readJSON(path.join(hootRoot, 'ui', 'package.json'), {});
  return pkg.version || null;
}

function readCeCacheVersion(hootRoot = ROOT) {
  return readText(path.join(hootRoot, 'skills', 'compound-engineering', 'cache', '.version'));
}

function readGitInfo(hootRoot = ROOT) {
  try {
    const commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: hootRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: hootRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    let dirty = false;
    try {
      const status = execFileSync('git', ['status', '--porcelain'], {
        cwd: hootRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      dirty = Boolean(status);
    } catch { /* ignore */ }
    return { commit, branch, dirty };
  } catch {
    return null;
  }
}

function parseChangelogHeadline(readmeText, version) {
  if (!readmeText || !version) return null;
  const marker = `### v${version}`;
  const idx = readmeText.indexOf(marker);
  if (idx < 0) return null;
  const slice = readmeText.slice(idx + marker.length);
  const end = slice.search(/\n### v|\n## /);
  const block = (end >= 0 ? slice.slice(0, end) : slice).trim();
  const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
  const inlineTitle = lines[0] || '';
  if (inlineTitle.startsWith('—') || inlineTitle.startsWith('--')) {
    const title = inlineTitle.replace(/^—+\s*/, '').trim();
    if (title) return title;
  }
  const bullet = lines.find((l) => l.startsWith('-') || l.startsWith('*'));
  if (bullet) return bullet.replace(/^[-*]\s*/, '').trim();
  return inlineTitle || null;
}

function buildVersionInfo({ hootRoot = ROOT, startedAt } = {}) {
  const versionFile = readVersionFile(hootRoot);
  const enginePkg = readPackageVersion(hootRoot);
  const version = versionFile || enginePkg || '0.0.0';
  const readme = readText(path.join(hootRoot, 'README.md')) || '';
  const git = readGitInfo(hootRoot);

  return {
    product: 'HOOT',
    package: 'agentdock',
    version,
    display: `HOOT v${version}`,
    legacy_name: 'AgentDock',
    subtitle: 'Local AI Command Center',
    sources: {
      version_file: versionFile,
      engine_package: enginePkg,
      ui_package: readUiVersion(hootRoot),
      ce_cache: readCeCacheVersion(hootRoot),
    },
    engine: {
      version,
      package_version: enginePkg,
      node: process.version,
      platform: process.platform,
    },
    ui: {
      version: readUiVersion(hootRoot),
    },
    core: {
      version: 1,
      name: 'C.O.R.E.',
    },
    git,
    changelog_headline: parseChangelogHeadline(readme, version),
    started_at: startedAt || null,
    root: hootRoot,
  };
}

module.exports = {
  buildVersionInfo,
  readVersionFile,
  parseChangelogHeadline,
};