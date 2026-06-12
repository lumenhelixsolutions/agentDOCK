/**
 * coach-approval-log.js — Track gated coach command executions for Phase 4 entry.
 */

const fs = require('fs');
const path = require('path');

const LOG_PATH = path.join(__dirname, 'state', 'coach-approvals.jsonl');
const HARD_TYPES = new Set([
  'launch', 'launchProfile', 'setMemory', 'appendMemory', 'switchProject',
]);

function ensureDir() {
  const dir = path.dirname(LOG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function isHardCommand(cmd) {
  return HARD_TYPES.has(String(cmd?.type || ''));
}

function appendApprovalLog(entry) {
  ensureDir();
  const line = JSON.stringify({ ...entry, at: new Date().toISOString() }) + '\n';
  fs.appendFileSync(LOG_PATH, line, 'utf8');
}

function logCoachExecution(cmd, result) {
  if (!isHardCommand(cmd)) return null;
  const row = {
    type: cmd.type,
    ok: Boolean(result?.ok),
    profileId: cmd.profileId || cmd.profile || null,
    project: cmd.path || cmd.project || null,
    blocked: !result?.ok,
    error: result?.error || null,
  };
  appendApprovalLog(row);
  return row;
}

function loadApprovalLog(limit = 50) {
  if (!fs.existsSync(LOG_PATH)) return { path: LOG_PATH, rows: [], count: 0 };
  const lines = fs.readFileSync(LOG_PATH, 'utf8').trim().split(/\r?\n/).filter(Boolean);
  const rows = lines.slice(-limit).map((line) => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);
  return { path: LOG_PATH, rows, count: lines.length };
}

module.exports = {
  LOG_PATH,
  isHardCommand,
  logCoachExecution,
  loadApprovalLog,
};