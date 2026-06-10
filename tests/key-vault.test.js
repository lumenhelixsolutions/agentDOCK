const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const {
  VAULT_FILE,
  setVaultKey,
  getVaultKey,
  deleteVaultKey,
  listMaskedKeys,
  maskKey,
  harvestFromScan,
  resolveProviderKey,
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
    setVaultKey('OPENAI_API_KEY', 'sk-test-openai-key-xyz', 'manual', { force: true });
    assert.strictEqual(getVaultKey('OPENAI_API_KEY'), 'sk-test-openai-key-xyz');
    const list = listMaskedKeys();
    const row = list.find((k) => k.name === 'OPENAI_API_KEY');
    assert.ok(row);
    assert.ok(!JSON.stringify(list).includes('sk-test-openai-key-xyz'));
    assert.ok(row.masked.endsWith('xyz'));
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
});