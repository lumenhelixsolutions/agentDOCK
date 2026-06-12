/**
 * C.O.R.E. — Prompt cache manager (file-backed, project-scoped).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function cacheDir(coreDir) {
  return path.join(coreDir, 'cache');
}

function cacheKey(prompt, modelId, projectId) {
  const raw = `${projectId || 'default'}::${modelId || 'default'}::${String(prompt || '')}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function cacheFile(coreDir, key) {
  return path.join(cacheDir(coreDir), `${key}.json`);
}

function readJSON(file) {
  try {
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function writeJSON(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8');
}

function lookup(coreDir, { prompt, model_id, project_id }) {
  const key = cacheKey(prompt, model_id, project_id);
  const hit = readJSON(cacheFile(coreDir, key));
  if (!hit) return { hit: false, key };
  return {
    hit: true,
    key,
    response: hit.response,
    usage: hit.usage || null,
    cached_at: hit.cached_at,
  };
}

function store(coreDir, { prompt, model_id, project_id, response, usage }) {
  const key = cacheKey(prompt, model_id, project_id);
  const payload = {
    key,
    project_id: project_id || 'default',
    model_id: model_id || 'unknown',
    response,
    usage: usage || null,
    cached_at: new Date().toISOString(),
  };
  writeJSON(cacheFile(coreDir, key), payload);
  return payload;
}

function clearCache(coreDir) {
  const dir = cacheDir(coreDir);
  if (!fs.existsSync(dir)) return 0;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  for (const f of files) fs.unlinkSync(path.join(dir, f));
  return files.length;
}

module.exports = {
  cacheKey,
  lookup,
  store,
  clearCache,
};