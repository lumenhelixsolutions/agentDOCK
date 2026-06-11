/**
 * HOOT operator read bridge — git + allowlisted filesystem excerpts.
 * Read-only; no write/exec MCP tools. Used to ground coach chat answers.
 */

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const MAX_EXCERPT = 1400;
const MAX_GIT_LINES = 24;

const ALLOWED_REL_PREFIXES = [
  'memory.md',
  path.join('profiles'),
  path.join('state'),
  path.join('logs'),
  path.join('skills', 'compound-engineering', 'cache'),
];

function normalizeRel(rel) {
  return String(rel || '').replace(/\\/g, '/').replace(/^\/+/, '');
}

function isPathAllowed(hootRoot, relPath) {
  const rel = normalizeRel(relPath);
  if (!rel || rel.includes('..')) return false;
  return ALLOWED_REL_PREFIXES.some((prefix) => rel === prefix || rel.startsWith(`${prefix}/`));
}

function resolveAllowedPath(hootRoot, relPath) {
  if (!isPathAllowed(hootRoot, relPath)) return null;
  const abs = path.resolve(hootRoot, normalizeRel(relPath));
  if (!abs.startsWith(path.resolve(hootRoot))) return null;
  return abs;
}

function truncate(text, max = MAX_EXCERPT) {
  const s = String(text || '').trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

async function runGit(repoPath, args) {
  if (!repoPath || !fs.existsSync(repoPath)) return null;
  try {
    const gitDir = path.join(repoPath, '.git');
    if (!fs.existsSync(gitDir)) return null;
    const { stdout } = await execFileAsync('git', args, {
      cwd: repoPath,
      timeout: 8000,
      maxBuffer: 256 * 1024,
      windowsHide: true,
    });
    return String(stdout || '').trim();
  } catch {
    return null;
  }
}

async function gitSnapshot(repoPath) {
  const branch = await runGit(repoPath, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const status = await runGit(repoPath, ['status', '--short', '--branch']);
  const log = await runGit(repoPath, ['log', '-n', '5', '--oneline', '--no-decorate']);
  const diffStat = await runGit(repoPath, ['diff', '--stat', 'HEAD~1..HEAD']);
  if (!branch && !status && !log) return null;
  return {
    repo: repoPath,
    branch: branch || 'unknown',
    status: truncate(status, 600),
    recentCommits: truncate(log, 500),
    lastDiffStat: diffStat ? truncate(diffStat, 400) : null,
  };
}

function readAllowedExcerpt(hootRoot, relPath, max = MAX_EXCERPT) {
  const abs = resolveAllowedPath(hootRoot, relPath);
  if (!abs || !fs.existsSync(abs)) return null;
  try {
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      const names = fs.readdirSync(abs).slice(0, 12);
      return { path: normalizeRel(relPath), kind: 'directory', listing: names };
    }
    const text = fs.readFileSync(abs, 'utf8');
    return { path: normalizeRel(relPath), kind: 'file', excerpt: truncate(text, max) };
  } catch {
    return null;
  }
}

async function gatherOperatorContext({ hootRoot, activeProject, settings = {} }) {
  const filesystem = [];
  const defaultReads = ['memory.md', 'state/projects.json'];
  for (const rel of defaultReads) {
    const item = readAllowedExcerpt(hootRoot, rel, 900);
    if (item) filesystem.push(item);
  }

  let git = null;
  const repo = activeProject || settings?.activeProject || null;
  if (repo) git = await gitSnapshot(repo);

  return {
    policy: 'read-only',
    hootRoot,
    activeRepo: repo || null,
    git,
    filesystem,
    truncated: true,
  };
}

function listOperatorTools() {
  return {
    app: [
      { id: 'navigate', readOnly: true },
      { id: 'runScan', readOnly: false },
      { id: 'getStatus', readOnly: true },
      { id: 'launchProfile', readOnly: false, policy: 'safe-audit-only' },
      { id: 'readMemory', readOnly: true },
      { id: 'appendMemory', readOnly: false, policy: 'structured-blocks-only' },
      { id: 'coachAction', readOnly: false, policy: 'ui-actions-only' },
      { id: 'makePlan', readOnly: true },
      { id: 'getPrefab', readOnly: true },
      { id: 'getActivity', readOnly: true },
    ],
    mcp: [
      {
        id: 'git',
        package: 'mcp-server-git',
        readOnly: true,
        operator_allowed: true,
        capabilities: ['status', 'log', 'diff-stat'],
      },
      {
        id: 'filesystem-hoot',
        package: 'mcp-server-filesystem',
        readOnly: true,
        operator_allowed: true,
        roots: ['{{HOOT_ROOT}}'],
        allowed_paths: ALLOWED_REL_PREFIXES.map(normalizeRel),
        deny_write: true,
      },
    ],
  };
}

module.exports = {
  ALLOWED_REL_PREFIXES,
  isPathAllowed,
  readAllowedExcerpt,
  gitSnapshot,
  gatherOperatorContext,
  listOperatorTools,
  truncate,
};