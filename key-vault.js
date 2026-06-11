/**
 * Local API key vault — harvest from scan/process/.env, use for coach + launches.
 * Values stored base64-obfuscated in state/key-vault.json (local machine only).
 * API responses never include full key values — masked suffix only.
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const VAULT_FILE = process.env.AGENTDOCK_KEY_VAULT_FILE || path.join(ROOT, 'state', 'key-vault.json');

const KNOWN_KEYS = [
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'CLAUDE_API_KEY',
  'OPENROUTER_API_KEY',
  'MOONSHOT_API_KEY',
  'DEEPSEEK_API_KEY',
  'GEMINI_API_KEY',
  'GOOGLE_API_KEY',
  'GROQ_API_KEY',
  'MISTRAL_API_KEY',
  'TOGETHER_API_KEY',
  'COHERE_API_KEY',
  'XAI_API_KEY',
  'HUGGINGFACE_API_KEY',
  'HF_TOKEN',
  'AZURE_OPENAI_API_KEY',
];

const PROVIDER_FOR_KEY = {
  OPENAI_API_KEY: 'openai',
  ANTHROPIC_API_KEY: 'anthropic',
  CLAUDE_API_KEY: 'anthropic',
  OPENROUTER_API_KEY: 'openrouter',
  MOONSHOT_API_KEY: 'moonshot',
  DEEPSEEK_API_KEY: 'deepseek',
  GEMINI_API_KEY: 'gemini',
  GOOGLE_API_KEY: 'gemini',
  GROQ_API_KEY: 'groq',
  MISTRAL_API_KEY: 'mistral',
  TOGETHER_API_KEY: 'together',
  COHERE_API_KEY: 'cohere',
  XAI_API_KEY: 'xai',
  HUGGINGFACE_API_KEY: 'huggingface',
  HF_TOKEN: 'huggingface',
  AZURE_OPENAI_API_KEY: 'azure',
};

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function encode(value) {
  return Buffer.from(String(value), 'utf8').toString('base64');
}

function decode(encoded) {
  try { return Buffer.from(String(encoded), 'base64').toString('utf8'); } catch { return null; }
}

function maskKey(value) {
  const v = String(value || '');
  if (!v) return '';
  if (v.length <= 3) return '•••';
  return `${'•'.repeat(Math.min(8, v.length - 3))}${v.slice(-3)}`;
}

function loadVault() {
  const data = readJSON(VAULT_FILE, { version: 1, keys: {} });
  if (!data.keys) data.keys = {};
  return data;
}

function saveVault(vault) {
  fs.mkdirSync(path.dirname(VAULT_FILE), { recursive: true });
  fs.writeFileSync(VAULT_FILE, JSON.stringify(vault, null, 2), 'utf8');
}

function getVaultKey(name) {
  const entry = loadVault().keys[name];
  if (!entry?.value) return null;
  const decoded = decode(entry.value);
  return decoded ? decoded.trim() : null;
}

function setVaultKey(name, value, source = 'manual', { force = false } = {}) {
  const trimmed = String(value || '').trim();
  if (!trimmed || trimmed === '[present-redacted]') return false;
  const vault = loadVault();
  const existing = vault.keys[name];
  if (existing && !force && existing.source === 'manual') return false;
  vault.keys[name] = {
    value: encode(trimmed),
    source,
    updatedAt: new Date().toISOString(),
    provider: PROVIDER_FOR_KEY[name] || 'unknown',
  };
  saveVault(vault);
  return true;
}

function deleteVaultKey(name) {
  const vault = loadVault();
  if (!vault.keys[name]) return false;
  delete vault.keys[name];
  saveVault(vault);
  return true;
}

function listMaskedKeys() {
  const vault = loadVault();
  return KNOWN_KEYS
    .filter((name) => vault.keys[name])
    .map((name) => {
      const entry = vault.keys[name];
      const plain = decode(entry.value);
      return {
        name,
        provider: entry.provider || PROVIDER_FOR_KEY[name] || 'unknown',
        masked: maskKey(plain),
        source: entry.source,
        updatedAt: entry.updatedAt,
        present: true,
      };
    });
}

function getVaultEnvForLaunch() {
  const env = {};
  for (const name of KNOWN_KEYS) {
    const v = getVaultKey(name);
    if (v) env[name] = v;
  }
  if (env.GOOGLE_API_KEY && !env.GEMINI_API_KEY) env.GEMINI_API_KEY = env.GOOGLE_API_KEY;
  if (env.GEMINI_API_KEY && !env.GOOGLE_API_KEY) env.GOOGLE_API_KEY = env.GEMINI_API_KEY;
  return env;
}

function keyAvailable(name) {
  if (getVaultKey(name)) return { available: true, source: 'vault' };
  if (process.env[name]) return { available: true, source: 'process' };
  return { available: false, source: 'missing' };
}

const LOCAL_PROVIDERS = new Set(['ollama', 'llamacpp', 'coach-local']);

function isLocalProvider(provider) {
  return LOCAL_PROVIDERS.has(String(provider || '').toLowerCase());
}

function resolveProviderKey(provider) {
  const p = String(provider || 'gemini').toLowerCase();
  if (p === 'ollama' || p === 'llamacpp') return '__local__';
  const map = {
    gemini: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
    openai: ['OPENAI_API_KEY'],
    anthropic: ['ANTHROPIC_API_KEY', 'CLAUDE_API_KEY'],
    openrouter: ['OPENROUTER_API_KEY'],
    groq: ['GROQ_API_KEY'],
    moonshot: ['MOONSHOT_API_KEY'],
    deepseek: ['DEEPSEEK_API_KEY'],
    mistral: ['MISTRAL_API_KEY'],
    xai: ['XAI_API_KEY'],
    grok: ['XAI_API_KEY'],
  };
  for (const name of map[p] || []) {
    const v = getVaultKey(name) || process.env[name] || null;
    if (v) return v;
  }
  return null;
}

function parseEnvFile(content) {
  const result = {};
  for (const line of String(content).split(/\r?\n/)) {
    const trim = line.trim();
    if (!trim || trim.startsWith('#')) continue;
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(trim);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    result[m[1]] = v;
  }
  return result;
}

function harvestFromProcessEnv() {
  let count = 0;
  for (const name of KNOWN_KEYS) {
    const v = process.env[name];
    if (v && setVaultKey(name, v, 'process-env')) count++;
  }
  return count;
}

function harvestFromEnvFiles(envFiles = []) {
  let count = 0;
  for (const f of envFiles) {
    const filePath = f.path;
    if (!filePath || !fs.existsSync(filePath)) continue;
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = parseEnvFile(content);
      for (const [name, value] of Object.entries(parsed)) {
        if (!KNOWN_KEYS.includes(name)) continue;
        if (setVaultKey(name, value, `env-file:${filePath}`)) count++;
      }
    } catch { /* skip unreadable */ }
  }
  return count;
}

function harvestFromScan(scan) {
  let count = harvestFromProcessEnv();
  count += harvestFromEnvFiles(scan?.env_files || []);
  return { count, keys: listMaskedKeys() };
}

function hasVaultKey(name) {
  return Boolean(getVaultKey(name));
}

module.exports = {
  KNOWN_KEYS,
  PROVIDER_FOR_KEY,
  VAULT_FILE,
  LOCAL_PROVIDERS,
  maskKey,
  loadVault,
  getVaultKey,
  setVaultKey,
  deleteVaultKey,
  listMaskedKeys,
  getVaultEnvForLaunch,
  keyAvailable,
  isLocalProvider,
  resolveProviderKey,
  harvestFromScan,
  harvestFromProcessEnv,
  hasVaultKey,
};