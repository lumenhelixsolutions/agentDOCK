const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { createPrefabInventory } = require('../prefab-inventory');
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

  it('reports bundled counts', () => {
    const inv = createPrefabInventory({ root: ROOT, moduleManager: mgr, lastScan: null });
    assert.ok(inv.bundled.plugin_packs >= 1);
    assert.strictEqual(inv.bundled.skills_cached, 9);
    assert.ok(inv.bundled.skills_catalog >= 39);
    assert.ok(inv.bundled.agents_catalog >= 21);
    assert.strictEqual(inv.bundled.agents_upstream, 51);
    assert.ok(inv.bundled.launch_profiles >= 90);
    assert.strictEqual(inv.bundled.stack_templates, 9);
    assert.ok(inv.bundled.builtins.length >= 4);
  });

  it('documents gaps', () => {
    const inv = createPrefabInventory({ root: ROOT, moduleManager: mgr, lastScan: null });
    assert.ok(inv.gaps.skills_metadata_only >= 20);
    assert.strictEqual(inv.gaps.on_demand_skill_fetch, false);
  });
});