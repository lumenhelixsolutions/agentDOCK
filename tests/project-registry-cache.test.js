const { describe, it } = require('node:test');
const assert = require('node:assert');
const { createProjectRegistryCache } = require('../project-registry-cache');

describe('project-registry-cache', () => {
  it('caches registry reads until busted', () => {
    let calls = 0;
    const cache = createProjectRegistryCache({
      ttlMs: 60_000,
      readRegistry: () => {
        calls += 1;
        return { projects: [{ name: 'a' }], active: null };
      },
    });
    const a = cache.get();
    const b = cache.get();
    assert.strictEqual(calls, 1);
    assert.strictEqual(a._cache.hit, false);
    assert.strictEqual(b._cache.hit, true);
    cache.bust();
    cache.get(true);
    assert.strictEqual(calls, 2);
  });
});