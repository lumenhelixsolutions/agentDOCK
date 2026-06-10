const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { loadPrefabManifest, createPrefabInventory } = require('../prefab-inventory');
const { createModuleManager } = require('../module-manager');

const ROOT = path.join(__dirname, '..');

describe('prefab inventory', () => {
  const mgr = createModuleManager({
    root: ROOT,
    files: { modulesState: path.join(ROOT, 'state', 'modules-state.test.json') },
    loadUserSettings: () => ({ version: 1, mcp: { enabledServers: ['git'] } }),
    saveUserSettings: () => {},
    loadMcpCatalog: () => ({ servers: [{ id: 'git' }, { id: 'fetch' }] }),
  });

  it('ships prefab-manifest.json (repo root) with packs, builtins, mcp_servers', () => {
    const manifest = loadPrefabManifest(ROOT);
    assert.strictEqual(manifest.packs.length, 1);
    assert.strictEqual(manifest.packs[0].id, 'compound-engineering');
    assert.strictEqual(manifest.builtins.length, 4);
    assert.strictEqual(manifest.mcp_servers.length, 2);
    assert.ok(manifest.mcp_servers.some((s) => s.id === 'git'));
    assert.ok(manifest.mcp_servers.some((s) => s.id === 'fetch'));
  });

  it('API inventory returns only prefab deliverable shape', () => {
    const inv = createPrefabInventory({ root: ROOT, moduleManager: mgr, lastScan: null });
    assert.ok(inv.prefab);
    assert.strictEqual(inv.counts.packs, 1);
    assert.strictEqual(inv.counts.builtins, 4);
    assert.strictEqual(inv.counts.mcp_servers, 2);
    assert.ok(inv.prefab.packs[0].name);
    assert.ok(inv.prefab.builtins.every((b) => b.always_on));
    assert.ok(!inv.bundled);
    assert.ok(!inv.gaps);
  });
});