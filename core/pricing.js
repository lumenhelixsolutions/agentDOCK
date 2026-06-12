/**
 * C.O.R.E. — model pricing map and cost calculator.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_PRICING = {
  version: 1,
  updated_at: null,
  models: {
    'gpt-4o-mini': { provider: 'openai', input_per_1k: 0.00015, output_per_1k: 0.0006 },
    'gpt-4o': { provider: 'openai', input_per_1k: 0.0025, output_per_1k: 0.01 },
    'claude-3-5-sonnet-20241022': { provider: 'anthropic', input_per_1k: 0.003, output_per_1k: 0.015 },
    'gemini-2.0-flash': { provider: 'gemini', input_per_1k: 0.0001, output_per_1k: 0.0004 },
    'llama3.2:3b': { provider: 'ollama', input_per_1k: 0, output_per_1k: 0 },
    default: { provider: 'unknown', input_per_1k: 0.001, output_per_1k: 0.003 },
  },
};

function resolvePricingFile(coreDir) {
  return path.join(coreDir, 'pricing.json');
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

function loadPricing(coreDir) {
  const file = resolvePricingFile(coreDir);
  const data = readJSON(file, DEFAULT_PRICING);
  if (!data.models) data.models = { ...DEFAULT_PRICING.models };
  return data;
}

function savePricing(coreDir, pricing) {
  const file = resolvePricingFile(coreDir);
  const next = { ...pricing, version: 1, updated_at: new Date().toISOString() };
  writeJSON(file, next);
  return next;
}

function resolveModelPricing(pricing, modelId) {
  const models = pricing?.models || {};
  return models[modelId] || models.default || DEFAULT_PRICING.models.default;
}

function estimateTokens(text) {
  const s = String(text || '');
  if (!s.length) return 0;
  return Math.max(1, Math.ceil(s.length / 4));
}

function calculateCost(usage, pricing, modelId) {
  const rates = resolveModelPricing(pricing, modelId);
  const input = Number(usage?.input_tokens) || 0;
  const output = Number(usage?.output_tokens) || 0;
  const inputCost = (input / 1000) * (Number(rates.input_per_1k) || 0);
  const outputCost = (output / 1000) * (Number(rates.output_per_1k) || 0);
  return {
    cost_usd: Number((inputCost + outputCost).toFixed(8)),
    rates,
    input_cost_usd: Number(inputCost.toFixed(8)),
    output_cost_usd: Number(outputCost.toFixed(8)),
  };
}

function estimateCost(prompt, modelId, pricing, outputRatio = 0.25) {
  const inputTokens = estimateTokens(prompt);
  const outputTokens = Math.ceil(inputTokens * outputRatio);
  return calculateCost({ input_tokens: inputTokens, output_tokens: outputTokens }, pricing, modelId);
}

module.exports = {
  DEFAULT_PRICING,
  loadPricing,
  savePricing,
  resolveModelPricing,
  estimateTokens,
  calculateCost,
  estimateCost,
};