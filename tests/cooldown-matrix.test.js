const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const testFile = path.join(os.tmpdir(), `hoot-cooldown-matrix-test-${process.pid}.json`);
process.env.AGENTDOCK_PROVIDER_COOLDOWN_FILE = testFile;
delete require.cache[require.resolve('../provider-cooldown')];

const {
  LIMITS_REF,
  loadState,
  patchProvider,
  enrichRegistry,
  nextDailyResetUtc,
  formatMatrixLine,
} = require('../provider-cooldown');

describe('cooldown-matrix (deck gauge math)', () => {
  before(() => {
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
  });

  after(() => {
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
  });

  it('carries the full provider matrix incl. deepseek and perplexity', () => {
    assert.strictEqual(LIMITS_REF.claude.limit_type, 'rolling_window');
    assert.strictEqual(LIMITS_REF.claude.replenish_rate_minutes, 7.1);
    assert.strictEqual(LIMITS_REF.gemini.limit_type, 'daily_reset');
    assert.strictEqual(LIMITS_REF.deepseek.limit_type, 'concurrency_dependent');
    assert.strictEqual(LIMITS_REF.perplexity.reset_time_utc, '00:00:00');
    const state = loadState();
    assert.ok(state.providers.deepseek);
    assert.ok(state.providers.perplexity);
  });

  it('computes next daily reset across day boundaries', () => {
    const now = new Date('2026-06-11T09:30:00Z');
    const next = nextDailyResetUtc('08:00:00', now);
    assert.strictEqual(next.toISOString(), '2026-06-12T08:00:00.000Z');
    const sameDay = nextDailyResetUtc('23:00:00', now);
    assert.strictEqual(sameDay.toISOString(), '2026-06-11T23:00:00.000Z');
  });

  it('enriches cooldown rows with countdown + recovery fields', () => {
    const until = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
    patchProvider({ provider: 'claude', status: 'cooldown', cooldown_until: until });
    // simulate a cooldown that started 2h ago
    const state = loadState();
    state.providers.claude.last_updated = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    const registry = enrichRegistry(state);
    const row = registry.providers.claude;
    assert.strictEqual(row.effective_status, 'cooldown');
    assert.strictEqual(row.ready_at_iso, until);
    assert.ok(Math.abs(row.seconds_remaining - 7200) < 5);
    assert.ok(row.progress > 0.45 && row.progress < 0.55);
    // ~120 elapsed minutes at 7.1 min/msg ≈ 16 messages recovered
    assert.strictEqual(row.est_messages_recovered, Math.floor(120 / 7.1));
  });

  it('exposes next_reset_iso for daily-reset providers even when active', () => {
    patchProvider({ provider: 'gemini', status: 'active', cooldown_until: null });
    const registry = enrichRegistry(loadState());
    assert.ok(registry.providers.gemini.next_reset_iso);
    assert.strictEqual(registry.providers.gemini.seconds_remaining, null);
  });

  it('uses the daily reset as the cooldown deadline when none was given', () => {
    patchProvider({ provider: 'perplexity', status: 'cooldown', cooldown_until: null });
    const registry = enrichRegistry(loadState());
    const row = registry.providers.perplexity;
    assert.ok(row.ready_at_iso, 'falls back to next daily reset');
    assert.ok(row.seconds_remaining > 0);
  });

  it('includes the new providers in the matrix line', () => {
    const line = formatMatrixLine(enrichRegistry(loadState()));
    assert.ok(line.includes('DEEPSEEK'));
    assert.ok(line.includes('PERPLEXITY'));
  });
});
