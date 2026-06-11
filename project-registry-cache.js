/**
 * TTL cache wrapper for project registry discovery + git probes.
 */

const DEFAULT_TTL_MS = 60_000;

function createProjectRegistryCache({ readRegistry, ttlMs = DEFAULT_TTL_MS } = {}) {
  let cache = { at: 0, data: null };

  function get(force = false) {
    const fresh = cache.data && Date.now() - cache.at < ttlMs;
    if (!force && fresh) {
      return { ...cache.data, _cache: { hit: true, age_ms: Date.now() - cache.at, ttl_ms: ttlMs } };
    }
    const data = readRegistry();
    cache = { at: Date.now(), data };
    return { ...data, _cache: { hit: false, age_ms: 0, ttl_ms: ttlMs } };
  }

  function bust() {
    cache = { at: 0, data: null };
  }

  return { get, bust };
}

module.exports = { createProjectRegistryCache, DEFAULT_TTL_MS };