/**
 * C.O.R.E. — Pull model pricing from OpenRouter when available.
 * Falls back to bundled pricing.json; zero-dep HTTPS GET.
 */

const https = require('https');
const { loadPricing, savePricing } = require('./pricing');

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

function getJSON(url, headers = {}, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers, timeout: timeoutMs }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(json?.error?.message || `HTTP ${res.statusCode}`));
            return;
          }
          resolve(json);
        } catch (err) {
          reject(new Error(`JSON parse error: ${err.message}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

function perTokenToPer1k(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Number((n * 1000).toFixed(10));
}

function inferProvider(slug) {
  const s = String(slug || '').toLowerCase();
  if (s.startsWith('openai/') || s.includes('gpt')) return 'openai';
  if (s.startsWith('anthropic/') || s.includes('claude')) return 'anthropic';
  if (s.startsWith('google/') || s.includes('gemini')) return 'gemini';
  if (s.startsWith('meta-llama/') || s.includes('llama')) return 'ollama';
  return 'openrouter';
}

function modelKeys(id) {
  const keys = new Set([id]);
  const short = String(id).split('/').pop();
  if (short) keys.add(short);
  return [...keys];
}

function mergeOpenRouterModels(pricing, models) {
  const next = { ...pricing, models: { ...(pricing.models || {}) } };
  let merged = 0;
  for (const row of models || []) {
    const prompt = row?.pricing?.prompt;
    const completion = row?.pricing?.completion;
    if (prompt == null && completion == null) continue;
    const entry = {
      provider: inferProvider(row.id),
      input_per_1k: perTokenToPer1k(prompt),
      output_per_1k: perTokenToPer1k(completion),
      openrouter_id: row.id,
      source: 'openrouter',
      updated_at: new Date().toISOString(),
    };
    for (const key of modelKeys(row.id)) {
      next.models[key] = { ...(next.models[key] || {}), ...entry };
      merged += 1;
    }
  }
  next.pricing_source = 'openrouter';
  next.fetched_at = new Date().toISOString();
  return { pricing: next, merged };
}

function isStale(pricing, ttlMs = DEFAULT_TTL_MS) {
  if (!pricing?.fetched_at) return true;
  const age = Date.now() - new Date(pricing.fetched_at).getTime();
  return age > ttlMs;
}

async function fetchOpenRouterPricing({ apiKey } = {}) {
  const headers = { Accept: 'application/json' };
  const key = apiKey || process.env.OPENROUTER_API_KEY || null;
  if (key) headers.Authorization = `Bearer ${key}`;
  const json = await getJSON(OPENROUTER_MODELS_URL, headers);
  return Array.isArray(json?.data) ? json.data : [];
}

async function refreshPricing(coreDir, { force = false, ttlMs = DEFAULT_TTL_MS } = {}) {
  const current = loadPricing(coreDir);
  if (!force && !isStale(current, ttlMs)) {
    return { ok: true, refreshed: false, pricing: current, reason: 'fresh' };
  }
  try {
    const models = await fetchOpenRouterPricing();
    const { pricing, merged } = mergeOpenRouterModels(current, models);
    savePricing(coreDir, pricing);
    return { ok: true, refreshed: true, pricing, merged, source: 'openrouter' };
  } catch (err) {
    return {
      ok: false,
      refreshed: false,
      pricing: current,
      error: err.message,
      source: current.pricing_source || 'bundled',
    };
  }
}

module.exports = {
  OPENROUTER_MODELS_URL,
  DEFAULT_TTL_MS,
  perTokenToPer1k,
  mergeOpenRouterModels,
  isStale,
  fetchOpenRouterPricing,
  refreshPricing,
};