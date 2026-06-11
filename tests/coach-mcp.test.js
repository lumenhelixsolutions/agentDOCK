const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const {
  isPathAllowed,
  readAllowedExcerpt,
  listOperatorTools,
  gatherOperatorContext,
} = require('../coach-mcp');

const ROOT = path.join(__dirname, '..');

describe('coach-mcp read bridge', () => {
  it('allowlists HOOT root paths only', () => {
    assert.strictEqual(isPathAllowed(ROOT, 'memory.md'), true);
    assert.strictEqual(isPathAllowed(ROOT, 'profiles/local-safe-audit.md'), true);
    assert.strictEqual(isPathAllowed(ROOT, 'state/projects.json'), true);
    assert.strictEqual(isPathAllowed(ROOT, '../outside'), false);
    assert.strictEqual(isPathAllowed(ROOT, 'package.json'), false);
  });

  it('reads memory excerpt when present', () => {
    const memPath = path.join(ROOT, 'memory.md');
    if (!fs.existsSync(memPath)) return;
    const item = readAllowedExcerpt(ROOT, 'memory.md', 200);
    assert.ok(item);
    assert.strictEqual(item.path, 'memory.md');
    assert.ok(item.excerpt.length > 0);
  });

  it('lists operator app + mcp tools', () => {
    const tools = listOperatorTools();
    assert.ok(tools.app.some((t) => t.id === 'runScan'));
    assert.ok(tools.mcp.some((t) => t.id === 'git'));
    assert.ok(tools.mcp.some((t) => t.id === 'filesystem-hoot'));
  });

  it('gatherOperatorContext returns filesystem excerpts', async () => {
    const ctx = await gatherOperatorContext({ hootRoot: ROOT, activeProject: null, settings: {} });
    assert.strictEqual(ctx.policy, 'read-only');
    assert.ok(Array.isArray(ctx.filesystem));
  });
});