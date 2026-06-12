/**
 * C.O.R.E. — Transaction persistence (JSONL, Langfuse-compatible fields).
 * SQLite-compatible schema; file-first per HOOT zero-dep constraint.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function isoDate(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function resolveCoreDir(hootRoot) {
  if (process.env.AGENTDOCK_CORE_DIR) return process.env.AGENTDOCK_CORE_DIR;
  return path.join(hootRoot || path.join(__dirname, '..'), 'state', 'core');
}

function transactionsDir(coreDir) {
  return path.join(coreDir, 'transactions');
}

function budgetsFile(coreDir) {
  return path.join(coreDir, 'budgets.json');
}

function dailyFile(coreDir, date) {
  return path.join(transactionsDir(coreDir), `${date}.jsonl`);
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

function newTransactionId() {
  return crypto.randomUUID();
}

function normalizeTransaction(row) {
  if (!row || typeof row !== 'object') return null;
  return {
    id: row.id || newTransactionId(),
    timestamp: row.timestamp || new Date().toISOString(),
    project_id: row.project_id || 'default',
    model_id: row.model_id || 'unknown',
    provider: row.provider || 'unknown',
    input_tokens: Number(row.input_tokens) || 0,
    output_tokens: Number(row.output_tokens) || 0,
    latency_ms: Number(row.latency_ms) || 0,
    ttft_ms: row.ttft_ms != null ? Number(row.ttft_ms) : null,
    cost_usd: Number(row.cost_usd) || 0,
    tags: Array.isArray(row.tags) ? row.tags : [],
    cache_hit: Boolean(row.cache_hit),
    compressed: Boolean(row.compressed),
    trace_id: row.trace_id || row.id,
    status: row.status || 'success',
    error: row.error || null,
  };
}

function appendTransaction(coreDir, tx) {
  const normalized = normalizeTransaction(tx);
  const file = dailyFile(coreDir, isoDate(new Date(normalized.timestamp)));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(normalized)}\n`, 'utf8');
  return normalized;
}

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try { return JSON.parse(line); } catch { return null; }
    })
    .filter(Boolean);
}

function listDatesInRange(fromDate, toDate) {
  const out = [];
  const start = new Date(`${fromDate}T12:00:00.000Z`);
  const end = new Date(`${toDate}T12:00:00.000Z`);
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(isoDate(d));
  }
  return out;
}

function loadTransactions(coreDir, { project_id, from, to, limit = 500 } = {}) {
  const fromDate = from || isoDate();
  const toDate = to || fromDate;
  const dates = listDatesInRange(fromDate, toDate);
  const rows = [];
  for (const date of dates) {
    const file = dailyFile(coreDir, date);
    for (const row of readJsonl(file)) {
      if (project_id && row.project_id !== project_id) continue;
      rows.push(normalizeTransaction(row));
    }
  }
  rows.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
  return rows.slice(0, Math.max(1, limit));
}

function loadBudgets(coreDir) {
  const data = readJSON(budgetsFile(coreDir), { version: 1, projects: {} });
  if (!data.projects) data.projects = {};
  return data;
}

function saveBudgets(coreDir, budgets) {
  const next = { ...budgets, version: 1, updated_at: new Date().toISOString() };
  writeJSON(budgetsFile(coreDir), next);
  return next;
}

function getProjectBudget(coreDir, projectId) {
  const budgets = loadBudgets(coreDir);
  const row = budgets.projects?.[projectId];
  return {
    daily_usd_cap: row?.daily_usd_cap ?? null,
    alert_threshold: row?.alert_threshold ?? null,
    hard_stop: row?.hard_stop !== false,
  };
}

function setProjectBudget(coreDir, projectId, patch) {
  const budgets = loadBudgets(coreDir);
  const prev = budgets.projects[projectId] || {};
  budgets.projects[projectId] = {
    ...prev,
    ...patch,
    project_id: projectId,
    updated_at: new Date().toISOString(),
  };
  return saveBudgets(coreDir, budgets);
}

function queryUsage(coreDir, projectId, timeframe = 'day') {
  const today = isoDate();
  let from = today;
  let to = today;
  if (timeframe === 'week') {
    const d = new Date(`${today}T12:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() - 6);
    from = isoDate(d);
  } else if (timeframe === 'month') {
    const d = new Date(`${today}T12:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() - 29);
    from = isoDate(d);
  }
  const rows = loadTransactions(coreDir, { project_id: projectId, from, to, limit: 10000 });
  const totals = rows.reduce((acc, row) => {
    acc.input_tokens += row.input_tokens;
    acc.output_tokens += row.output_tokens;
    acc.cost_usd += row.cost_usd;
    acc.requests += 1;
    acc.latency_ms_sum += row.latency_ms;
    return acc;
  }, { input_tokens: 0, output_tokens: 0, cost_usd: 0, requests: 0, latency_ms_sum: 0 });

  return {
    project_id: projectId,
    timeframe,
    from,
    to,
    current_spend: Number(totals.cost_usd.toFixed(8)),
    input_tokens: totals.input_tokens,
    output_tokens: totals.output_tokens,
    requests: totals.requests,
    avg_latency_ms: totals.requests ? Math.round(totals.latency_ms_sum / totals.requests) : 0,
  };
}

function buildRollup(coreDir, { project_id, from, to } = {}) {
  const fromDate = from || isoDate();
  const toDate = to || fromDate;
  const rows = loadTransactions(coreDir, { project_id, from: fromDate, to: toDate, limit: 10000 });
  const byProject = {};
  const byModel = {};
  for (const row of rows) {
    const p = row.project_id || 'default';
    const m = row.model_id || 'unknown';
    if (!byProject[p]) byProject[p] = { project_id: p, cost_usd: 0, input_tokens: 0, output_tokens: 0, requests: 0 };
    if (!byModel[m]) byModel[m] = { model_id: m, cost_usd: 0, input_tokens: 0, output_tokens: 0, requests: 0 };
    byProject[p].cost_usd += row.cost_usd;
    byProject[p].input_tokens += row.input_tokens;
    byProject[p].output_tokens += row.output_tokens;
    byProject[p].requests += 1;
    byModel[m].cost_usd += row.cost_usd;
    byModel[m].input_tokens += row.input_tokens;
    byModel[m].output_tokens += row.output_tokens;
    byModel[m].requests += 1;
  }
  return {
    from: fromDate,
    to: toDate,
    total_requests: rows.length,
    total_cost_usd: Number(rows.reduce((s, r) => s + r.cost_usd, 0).toFixed(8)),
    by_project: Object.values(byProject),
    by_model: Object.values(byModel),
    recent: rows.slice(0, 20),
  };
}

function initStorage(coreDir) {
  fs.mkdirSync(transactionsDir(coreDir), { recursive: true });
  if (!fs.existsSync(budgetsFile(coreDir))) saveBudgets(coreDir, { version: 1, projects: {} });
}

module.exports = {
  resolveCoreDir,
  newTransactionId,
  normalizeTransaction,
  appendTransaction,
  loadTransactions,
  loadBudgets,
  saveBudgets,
  getProjectBudget,
  setProjectBudget,
  queryUsage,
  buildRollup,
  initStorage,
  isoDate,
};