const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { createModuleManager, probeCePluginPaths } = require('../module-manager');

const ROOT = path.join(__dirname, '..');
const TEST_STATE = path.join(ROOT, 'state', 'modules-state.test.json');

describe('module-manager', () => {
  const settings = { version: 1, mcp: { enabledServers: ['git'] } };
  let saved = { ...settings };

  const mgr = createModuleManager({
    root: ROOT,
    files: { modulesState: TEST_STATE },
    loadUserSettings: () => saved,
    saveUserSettings: (s) => { saved = s; },
    loadMcpCatalog: () => ({ servers: [{ id: 'git' }, { id: 'fetch' }] }),
  });

  it('modules-catalog.json has 6+ modules', () => {
    const catalog = mgr.loadCatalog();
    assert.ok(catalog.modules.length >= 6);
    assert.strictEqual(catalog.version, '2.0');
  });

  it('listModules returns compound-engineering with v2 detection fields', async () => {
    const { modules } = await mgr.listModules(null);
    const ce = modules.find((m) => m.id === 'compound-engineering');
    assert.ok(ce);
    assert.ok(ce.detection.plugin_probe);
    assert.ok('claude_plugin' in ce.detection);
    assert.ok('sync_stale' in ce);
  });

  it('getInstallPlan includes runnable targets', () => {
    const plan = mgr.getInstallPlan('compound-engineering');
    assert.ok(plan.ok);
    assert.ok(plan.steps.some((s) => s.target === 'claude_marketplace'));
    assert.ok(plan.steps.some((s) => s.target === 'sync'));
  });

  it('getLaunchPayload injects AGENTDOCK_MODULES env', () => {
    const payload = mgr.getLaunchPayload(null);
    assert.ok(payload.env.AGENTDOCK_MODULES);
    assert.ok(payload.env.AGENTDOCK_SKILLS_CACHE);
  });

  it('setEnabled toggles mcp-fetch in settings', () => {
    mgr.setEnabled('mcp-fetch', true);
    assert.ok(saved.mcp.enabledServers.includes('fetch'));
    mgr.setEnabled('mcp-fetch', false);
    assert.ok(!saved.mcp.enabledServers.includes('fetch'));
  });

  it('setAutoSyncSettings persists interval', () => {
    const r = mgr.setAutoSyncSettings({ enabled: true, interval_days: 14 });
    assert.strictEqual(r.auto_sync.interval_days, 14);
    const state = mgr.loadState();
    assert.strictEqual(state.auto_sync.interval_days, 14);
  });

  it('probeCePluginPaths returns structured probe', () => {
    const probe = probeCePluginPaths();
    assert.ok(probe.home);
    assert.ok(Array.isArray(probe.plugin_dirs));
  });

  it('builtin modules cannot be disabled', () => {
    const result = mgr.setEnabled('agentdock-coach', false);
    assert.strictEqual(result.ok, false);
  });
});