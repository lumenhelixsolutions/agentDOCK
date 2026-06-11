const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const testFile = path.join(os.tmpdir(), `hoot-cooldown-test-${process.pid}.json`);
process.env.AGENTDOCK_PROVIDER_COOLDOWN_FILE = testFile;
delete require.cache[require.resolve('../provider-cooldown')];

const {
  loadState,
  patchProvider,
  applyCooldownPreset,
  enrichRegistry,
  effectiveStatus,
  formatEta,
  profileToProviderId,
  scoreProfileForCooldown,
} = require('../provider-cooldown');

describe('provider-cooldown', () => {
  before(() => {
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
  });

  after(() => {
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
  });

  it('loads default providers', () => {
    const state = loadState();
    assert.ok(state.providers.claude);
    assert.ok(state.providers.ollama);
    assert.strictEqual(state.providers.claude.status, 'unknown');
  });

  it('patches provider status and enriches ETA', () => {
    const until = new Date(Date.now() + 90 * 60000).toISOString();
    patchProvider({ provider: 'claude', status: 'cooldown', cooldown_until: until });
    const registry = enrichRegistry(loadState());
    assert.strictEqual(registry.providers.claude.effective_status, 'cooldown');
    assert.ok(registry.providers.claude.eta);
    assert.ok(registry.matrix_line.includes('CLAUDE: COOLDOWN'));
  });

  it('expires cooldown to active', () => {
    const past = new Date(Date.now() - 60000).toISOString();
    patchProvider({ provider: 'kimi', status: 'cooldown', cooldown_until: past });
    const row = enrichRegistry(loadState()).providers.kimi;
    assert.strictEqual(row.effective_status, 'active');
  });

  it('applyCooldownPreset sets future until', () => {
    applyCooldownPreset('chatgpt', '3hr');
    const row = loadState().providers.chatgpt;
    assert.strictEqual(row.status, 'cooldown');
    assert.ok(row.cooldown_until);
    const eta = formatEta(row.cooldown_until);
    assert.ok(eta && eta !== 'ready now');
  });

  it('maps profiles to provider ids', () => {
    assert.strictEqual(profileToProviderId({ meta: { command: 'claude-code' } }), 'claude');
    assert.strictEqual(profileToProviderId({ meta: { command: 'codex' } }), 'chatgpt');
    assert.strictEqual(profileToProviderId({ meta: { backend: 'ollama' } }), 'ollama');
  });

  it('scores profiles by cooldown state', () => {
    patchProvider({ provider: 'gemini', status: 'active' });
    patchProvider({ provider: 'claude', status: 'cooldown', cooldown_until: new Date(Date.now() + 3600000).toISOString() });
    const registry = enrichRegistry(loadState());
    const activeScore = scoreProfileForCooldown({ meta: { command: 'gemini-cli' } }, registry);
    const cooldownScore = scoreProfileForCooldown({ meta: { command: 'claude-code' } }, registry);
    assert.ok(activeScore > cooldownScore);
  });

  it('effectiveStatus treats local as active', () => {
    assert.strictEqual(effectiveStatus({ status: 'local' }), 'active');
  });
});