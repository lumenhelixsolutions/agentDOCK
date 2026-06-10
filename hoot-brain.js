/**
 * HOOT local brain resolver — Ollama / llama.cpp auto-selection for coach.
 */

const { spawn } = require('child_process');

const DEFAULT_OLLAMA_MODEL = 'llama3.2:3b';
const OPERATOR_MODEL_PATTERNS = [/llama3\.2/i, /qwen2\.5/i, /^phi/i];

let pullState = { model: null, startedAt: null, status: 'idle' };

function parseOllamaListRaw(raw) {
  if (!raw) return [];
  const models = [];
  for (const line of String(raw).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || /^NAME\s+/i.test(trimmed)) continue;
    const name = trimmed.split(/\s+/)[0];
    if (name) models.push(name);
  }
  return models;
}

function installedOllamaModels(scan) {
  return parseOllamaListRaw(scan?.ollama?.list_raw);
}

function bestOperatorModelFromList(models) {
  for (const pattern of OPERATOR_MODEL_PATTERNS) {
    const hit = models.find((m) => pattern.test(m));
    if (hit) return hit;
  }
  return models[0] || null;
}

function bestLoadedOperatorModel(scan) {
  const installed = installedOllamaModels(scan);
  return bestOperatorModelFromList(installed);
}

function startOllamaPull(model = DEFAULT_OLLAMA_MODEL) {
  if (pullState.status === 'pulling' && pullState.model === model) return pullState;
  pullState = { model, startedAt: new Date().toISOString(), status: 'pulling' };
  const child = spawn('ollama', ['pull', model], { windowsHide: true, stdio: 'ignore' });
  child.on('close', (code) => {
    pullState.status = code === 0 ? 'done' : 'failed';
  });
  child.on('error', () => {
    pullState.status = 'failed';
  });
  return pullState;
}

function getPullState() {
  return { ...pullState };
}

function ollamaEndpoint(settings) {
  const host = settings?.localInference?.ollama?.host || 'http://127.0.0.1:11434';
  const base = String(host).replace(/\/$/, '');
  return `${base}/v1/chat/completions`;
}

function llamacppEndpoint(settings, scan) {
  const lc = settings?.localInference?.llamacpp || {};
  const backend = (scan?.local_models?.backends || []).find((b) => b.id === 'llamacpp');
  const port = lc.port || backend?.server?.port || 8081;
  const host = lc.host || '127.0.0.1';
  return `http://${host}:${port}/v1/chat/completions`;
}

function resolveHootBrain({ scan, settings, providerOverride } = {}) {
  const s = settings || {};
  const brainCfg = s.hoot_brain || {};
  const mode = String(providerOverride || brainCfg.mode || 'auto').toLowerCase();

  const ollamaPresent = Boolean(scan?.tools?.ollama?.present);
  const llamaBackend = (scan?.local_models?.backends || []).find((b) => b.id === 'llamacpp');
  const llamacppReachable = Boolean(llamaBackend?.server?.reachable || s.localInference?.llamacpp?.enabled);

  if (mode === 'cloud') {
    const cloud = brainCfg.cloud_provider || 'gemini';
    return { provider: cloud, model: null, endpoint: null, available: false, source: 'cloud-settings' };
  }

  if (mode === 'ollama' || (mode === 'auto' && ollamaPresent)) {
    const configured = brainCfg.ollama_model || s.localInference?.ollama?.model;
    const installed = installedOllamaModels(scan);
    const model = configured || bestOperatorModelFromList(installed) || null;
    if (model) {
      return {
        provider: 'ollama',
        model,
        endpoint: ollamaEndpoint(s),
        available: true,
        source: configured ? 'settings' : 'scan',
        ollamaPresent: true,
      };
    }
    if (ollamaPresent) {
      const pull = startOllamaPull(DEFAULT_OLLAMA_MODEL);
      return {
        provider: 'ollama',
        model: DEFAULT_OLLAMA_MODEL,
        endpoint: ollamaEndpoint(s),
        available: false,
        source: 'auto-pull',
        pulling: true,
        pull,
        ollamaPresent: true,
      };
    }
    if (mode === 'ollama') {
      return { provider: 'ollama', model: DEFAULT_OLLAMA_MODEL, endpoint: ollamaEndpoint(s), available: false, source: 'missing-ollama' };
    }
  }

  if (mode === 'llamacpp' || (mode === 'auto' && llamacppReachable)) {
    return {
      provider: 'llamacpp',
      model: s.localInference?.llamacpp?.modelPath ? 'local-gguf' : 'default',
      endpoint: llamacppEndpoint(s, scan),
      available: llamacppReachable,
      source: 'llamacpp',
    };
  }

  return { provider: 'coach-local', model: null, endpoint: null, available: false, source: 'rules' };
}

module.exports = {
  DEFAULT_OLLAMA_MODEL,
  OPERATOR_MODEL_PATTERNS,
  parseOllamaListRaw,
  installedOllamaModels,
  bestLoadedOperatorModel,
  startOllamaPull,
  getPullState,
  ollamaEndpoint,
  llamacppEndpoint,
  resolveHootBrain,
};