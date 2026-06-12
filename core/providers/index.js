/**
 * C.O.R.E. — Provider adapter map.
 */

const { OpenAIAdapter } = require('./openai');
const { GeminiAdapter } = require('./gemini');
const { LocalModelAdapter } = require('./ollama');
const { AnthropicAdapter } = require('./anthropic');
const { BrowserAutomationAdapter } = require('./browser');

const PROVIDER_ALIASES = {
  openai: 'openai',
  chatgpt: 'openai',
  codex: 'openai',
  gemini: 'gemini',
  google: 'gemini',
  anthropic: 'anthropic',
  claude: 'anthropic',
  ollama: 'ollama',
  local: 'ollama',
  llamacpp: 'ollama',
  'llama.cpp': 'ollama',
  browser: 'browser',
  web: 'browser',
  'web-sub': 'browser',
};

function createProviderRegistry(deps = {}) {
  const map = {
    openai: new OpenAIAdapter(deps),
    gemini: new GeminiAdapter(deps),
    ollama: new LocalModelAdapter(deps),
    anthropic: new AnthropicAdapter(deps),
    browser: new BrowserAutomationAdapter(deps),
  };
  return map;
}

function resolveProviderId(provider) {
  const key = String(provider || 'openai').toLowerCase();
  return PROVIDER_ALIASES[key] || key;
}

function getProvider(registry, provider) {
  const id = resolveProviderId(provider);
  const adapter = registry[id];
  if (!adapter) throw new Error(`Unknown provider adapter: ${provider}`);
  return adapter;
}

module.exports = {
  PROVIDER_ALIASES,
  createProviderRegistry,
  resolveProviderId,
  getProvider,
  OpenAIAdapter,
  GeminiAdapter,
  LocalModelAdapter,
  AnthropicAdapter,
  BrowserAutomationAdapter,
};