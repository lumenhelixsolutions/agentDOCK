const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { hydrateLastScan, attachCacheMeta } = require('../scan-cache');

describe('scan-cache', () => {
  let tmp;

  before(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hoot-scan-cache-'));
    fs.writeFileSync(
      path.join(tmp, 'scan-2026-06-10T12-00-00-000Z.json'),
      JSON.stringify({ scanned_at: '2026-06-10T12:00:00.000Z', tools: { node: { present: true } } }),
    );
  });

  after(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('hydrates latest scan log', () => {
    const hit = hydrateLastScan(tmp);
    assert.ok(hit?.scan);
    assert.strictEqual(hit.scan.tools.node.present, true);
  });

  it('attachCacheMeta marks stale age', () => {
    const wrapped = attachCacheMeta({ scanned_at: '2020-01-01T00:00:00.000Z' }, { cached: true, source: 'logs' });
    assert.strictEqual(wrapped._cache.cached, true);
    assert.strictEqual(wrapped._cache.stale, true);
  });
});