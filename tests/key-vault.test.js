const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const testVaultPath = path.join(os.tmpdir(), `hoot-key-vault-test-${process.pid}.json`);
process.env.AGENTDOCK_KEY_VAULT_FILE = testVaultPath;
delete require.cache[require.resolve('../key-vault')];

const {
  VAULT_FILE,
  setVaultKey,
  getVaultKey,
  deleteVaultKey,
  listMaskedKeys,
  maskKey,
  isPlaceholderKey,
  isExampleEnvFile,
  harvestFromScan,
  resolveProviderKey,
  purgePlaceholderKeys,
  keyAvailable,
} = require('../key-vault');

describe('key-vault', () => {
  let backup = null;

  before(() => {
    if (fs.existsSync(VAULT_FILE)) backup = fs.readFileSync(VAULT_FILE, 'utf8');
    if (fs.existsSync(VAULT_FILE)) fs.unlinkSync(VAULT_FILE);
  });

  after(() => {
    if (fs.existsSync(VAULT_FILE)) fs.unlinkSync(VAULT_FILE);
    if (backup) fs.writeFileSync(VAULT_FILE, backup, 'utf8');
  });

  it('stores and retrieves keys without exposing full value in masked list', () => {
    setVaultKey('OPENAI_API_KEY', 'sk-proj-validtestkey1234567890abcdef', 'manual', { force: true });
    assert.strictEqual(getVaultKey('OPENAI_API_KEY'), 'sk-proj-validtestkey1234567890abcdef');
    const list = listMaskedKeys();
    const row = list.find((k) => k.name === 'OPENAI_API_KEY');
    assert.ok(row);
    assert.ok(!JSON.stringify(list).includes('sk-proj-validtestkey1234567890abcdef'));
    assert.ok(row.masked.endsWith('ef'));
  });

  it('maskKey shows last 3 characters only', () => {
    assert.strictEqual(maskKey('abcdefghij'), '•••••••hij');
  });

  it('resolveProviderKey prefers vault', () => {
    setVaultKey('GEMINI_API_KEY', 'gemini-secret-123', 'manual', { force: true });
    assert.strictEqual(resolveProviderKey('gemini'), 'gemini-secret-123');
  });

  it('harvestFromScan reads env file paths', () => {
    deleteVaultKey('GROQ_API_KEY');
    const envPath = path.join(__dirname, 'fixtures', '.env.test-harvest');
    fs.writeFileSync(envPath, 'GROQ_API_KEY=gsk_from_file_xyz\n', 'utf8');
    try {
      const result = harvestFromScan({
        env_files: [{ path: envPath, key_names: ['GROQ_API_KEY'] }],
      });
      assert.ok(result.count >= 1);
      assert.strictEqual(getVaultKey('GROQ_API_KEY'), 'gsk_from_file_xyz');
    } finally {
      fs.unlinkSync(envPath);
      deleteVaultKey('GROQ_API_KEY');
    }
  });

  it('keyAvailable reports vault source', () => {
    setVaultKey('GROQ_API_KEY', 'gsk_test_999', 'manual', { force: true });
    const k = keyAvailable('GROQ_API_KEY');
    assert.strictEqual(k.available, true);
    assert.strictEqual(k.source, 'vault');
  });

  it('rejects placeholder keys from vault read and harvest', () => {
    deleteVaultKey('OPENAI_API_KEY');
    const prior = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      assert.strictEqual(setVaultKey('OPENAI_API_KEY', 'your-openai-key', 'manual', { force: true }), false);
      assert.strictEqual(getVaultKey('OPENAI_API_KEY'), null);
      assert.strictEqual(resolveProviderKey('openai'), null);
      assert.strictEqual(isPlaceholderKey('your-openai-key'), true);
      assert.strictEqual(isPlaceholderKey('sk-proj-real-looking-key-1234567890'), false);
    } finally {
      if (prior !== undefined) process.env.OPENAI_API_KEY = prior;
      else delete process.env.OPENAI_API_KEY;
    }
  });

  it('skips .env.example files during harvest', () => {
    deleteVaultKey('ANTHROPIC_API_KEY');
    const examplePath = path.join(__dirname, 'fixtures', '.env.example.test');
    fs.writeFileSync(examplePath, 'ANTHROPIC_API_KEY=your-anthropic-key\n', 'utf8');
    try {
      const result = harvestFromScan({
        env_files: [{ path: examplePath, key_names: ['ANTHROPIC_API_KEY'] }],
      });
      assert.strictEqual(getVaultKey('ANTHROPIC_API_KEY'), null);
      assert.ok(isExampleEnvFile(examplePath));
      assert.ok(result.count >= 0);
    } finally {
      fs.unlinkSync(examplePath);
      deleteVaultKey('ANTHROPIC_API_KEY');
    }
  });

  it('purgePlaceholderKeys removes template keys', () => {
    const vault = require('../key-vault').loadVault();
    vault.keys.PLACEHOLDER_TEST_KEY = {
      value: Buffer.from('your-api-key-here').toString('base64'),
      source: 'test',
      updatedAt: new Date().toISOString(),
      provider: 'unknown',
    };
    require('fs').writeFileSync(VAULT_FILE, JSON.stringify(vault, null, 2), 'utf8');
    const purged = purgePlaceholderKeys();
    assert.ok(purged >= 1);
    assert.strictEqual(getVaultKey('PLACEHOLDER_TEST_KEY'), null);
  });
});