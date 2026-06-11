const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const {
  buildOperatorToolSchemas,
  toolCallToCommand,
  executeNativeTool,
  toolRunsFromResults,
} = require('../coach-tools');

const ROOT = path.join(__dirname, '..');

describe('coach-tools native bridge', () => {
  it('builds OpenAI-style operator schemas', () => {
    const schemas = buildOperatorToolSchemas();
    const names = schemas.map((s) => s.function.name);
    assert.ok(names.includes('navigate'));
    assert.ok(names.includes('run_scan'));
    assert.ok(names.includes('git_snapshot'));
    assert.ok(names.includes('read_hoot_file'));
  });

  it('maps tool calls to coach commands', () => {
    assert.deepStrictEqual(toolCallToCommand('navigate', { route: '/scan' }), { type: 'navigate', route: '/scan' });
    assert.deepStrictEqual(toolCallToCommand('coach_action', { target: 'scan-run' }), { type: 'coachAction', target: 'scan-run' });
    assert.strictEqual(toolCallToCommand('unknown_tool', {}), null);
  });

  it('blocks git_snapshot when policy disables git MCP', async () => {
    const result = await executeNativeTool('git_snapshot', {}, {
      deps: {},
      hootRoot: ROOT,
      activeProject: null,
      policy: { mcp_git: false },
    });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.blocked, true);
  });

  it('summarizes tool runs for UI', () => {
    const runs = toolRunsFromResults([
      { name: 'navigate', result: { ok: true, route: '/scan' } },
      { name: 'git_snapshot', result: { ok: false, error: 'disabled' } },
    ]);
    assert.strictEqual(runs.length, 2);
    assert.strictEqual(runs[0].ok, true);
    assert.strictEqual(runs[0].route, '/scan');
    assert.strictEqual(runs[1].ok, false);
    assert.match(runs[1].summary, /blocked/);
  });
});