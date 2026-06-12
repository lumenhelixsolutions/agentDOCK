/**
 * bench-results.js — Parse Ollama bench CSV and feed profile scoring.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const DEFAULT_CSV = path.join(__dirname, 'state', 'bench-results.csv');
const BENCH_SCRIPT = path.join(__dirname, 'scripts', 'bench-local-models.mjs');

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i += 1; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

function parseBenchCsv(content) {
  const lines = String(content || '').trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0]).map((h) => h.trim());
  const rows = [];
  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line);
    const row = {};
    header.forEach((key, idx) => { row[key] = (cols[idx] || '').trim(); });
    if (row.model) rows.push(normalizeBenchRow(row));
  }
  return rows;
}

function normalizeBenchRow(row) {
  return {
    model: row.model,
    status: row.status || 'unknown',
    latency_ms: Number(row.latency_ms) || 0,
    tokens_per_sec: Number(row.tokens_per_sec) || 0,
    note: row.note || '',
    updated_at: row.updated_at || null,
  };
}

function loadBenchResults(csvPath = DEFAULT_CSV) {
  if (!fs.existsSync(csvPath)) return { path: csvPath, rows: [], updated_at: null };
  const raw = fs.readFileSync(csvPath, 'utf8');
  const rows = parseBenchCsv(raw);
  let updated_at = null;
  try { updated_at = fs.statSync(csvPath).mtime.toISOString(); } catch { /* ignore */ }
  return { path: csvPath, rows, updated_at };
}

function modelVariants(name) {
  const base = String(name || '').trim().toLowerCase();
  if (!base) return [];
  const noTag = base.split(':')[0];
  return [...new Set([base, `${noTag}:latest`, noTag])];
}

function findBenchRow(rows, modelName) {
  if (!modelName || !rows?.length) return null;
  const variants = modelVariants(modelName);
  return rows.find((r) => variants.includes(String(r.model).toLowerCase())
    || variants.some((v) => String(r.model).toLowerCase().startsWith(v.replace(':latest', ''))));
}

function benchScoreAdjustment(row) {
  if (!row) return { delta: 0, reason: null, tier: 'unknown' };
  if (row.status === 'pass') {
    if (row.tokens_per_sec >= 20) return { delta: 12, reason: `Bench pass ${row.tokens_per_sec} tok/s`, tier: 'fast' };
    if (row.tokens_per_sec >= 8) return { delta: 8, reason: `Bench pass ${row.tokens_per_sec} tok/s`, tier: 'ok' };
    return { delta: 4, reason: `Bench pass (slow ${row.tokens_per_sec} tok/s)`, tier: 'slow' };
  }
  if (row.status === 'weak') return { delta: -5, reason: 'Bench weak response quality', tier: 'weak' };
  if (row.status === 'missing') return { delta: -10, reason: `Model not pulled (${row.model})`, tier: 'missing' };
  if (row.status === 'error') return { delta: -15, reason: `Bench error: ${row.note || 'failed'}`, tier: 'error' };
  return { delta: 0, reason: null, tier: row.status };
}

function applyBenchToProfile(evalResult, profile, benchData) {
  const model = profile?.meta?.model;
  const backend = String(profile?.meta?.backend || '').toLowerCase();
  if (!model || (backend !== 'ollama' && backend !== 'llamacpp' && backend !== 'llama.cpp')) {
    return evalResult;
  }
  const row = findBenchRow(benchData?.rows || [], model);
  if (!row) return evalResult;
  const adj = benchScoreAdjustment(row);
  if (!adj.reason) return evalResult;
  const reasons = [...(evalResult.reasons || []), adj.reason];
  let score = Math.max(0, Math.min(100, (evalResult.score || 0) + adj.delta));
  let state = evalResult.state;
  if (adj.tier === 'error' || adj.tier === 'missing') state = state === 'BLOCKED' ? state : 'DEGRADED';
  return {
    ...evalResult,
    score,
    state,
    reasons,
    bench: { model: row.model, status: row.status, tokens_per_sec: row.tokens_per_sec, tier: adj.tier },
  };
}

function runBenchScript(models = [], csvPath = DEFAULT_CSV) {
  return new Promise((resolve, reject) => {
    const args = [BENCH_SCRIPT, ...models, '--out', csvPath];
    const child = spawn(process.execPath, args, { cwd: __dirname, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(stderr || stdout || `bench exit ${code}`));
      resolve(loadBenchResults(csvPath));
    });
  });
}

module.exports = {
  DEFAULT_CSV,
  parseBenchCsv,
  loadBenchResults,
  findBenchRow,
  benchScoreAdjustment,
  applyBenchToProfile,
  runBenchScript,
};