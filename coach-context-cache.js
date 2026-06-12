/**
 * HOOT coach — session context cache (avoid re-reading git/files every chat turn).
 */

const DEFAULT_TTL_MS = 90_000;
const caches = new Map();

function resolveContextMode(body = {}) {
  if (body.contextMode === 'full' || body.contextMode === 'heartbeat') return body.contextMode;
  if (body.event?.type === 'heartbeat') return 'heartbeat';
  if (wantsLiveContext(body.text)) return 'full';
  return 'minimal';
}

function wantsLiveContext(text) {
  const t = String(text || '').toLowerCase();
  if (!t.trim()) return false;
  return /\b(git status|git health|uncommitted|repo state|read memory|memory file|what(?:'s| is) in memory|handoff packet|full context|refresh context|read(?: the)? repo|agents\.md|project brain|filesystem context|live context)\b/.test(t);
}

function getSessionContextCache(sessionId) {
  return caches.get(sessionId || 'default') || null;
}

function setSessionContextCache(sessionId, patch) {
  const key = sessionId || 'default';
  const prev = caches.get(key) || {};
  const next = {
    ...prev,
    ...patch,
    sessionId: key,
    cached_at: new Date().toISOString(),
    cached_at_ms: Date.now(),
  };
  caches.set(key, next);
  return next;
}

function isContextCacheFresh(cache, ttlMs = DEFAULT_TTL_MS) {
  if (!cache?.cached_at_ms) return false;
  return Date.now() - cache.cached_at_ms < ttlMs;
}

function clearSessionContextCache(sessionId) {
  caches.delete(sessionId || 'default');
}

module.exports = {
  DEFAULT_TTL_MS,
  resolveContextMode,
  wantsLiveContext,
  getSessionContextCache,
  setSessionContextCache,
  isContextCacheFresh,
  clearSessionContextCache,
};