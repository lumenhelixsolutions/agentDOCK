const { describe, it } = require('node:test');
const assert = require('node:assert');
const { buildOnboardingState, suggestSessionProvider, scanReady } = require('../onboarding');

describe('onboarding', () => {
  it('scanReady detects populated scan', () => {
    assert.strictEqual(scanReady({ tools: { ollama: { present: true } }, coders: [] }), true);
    assert.strictEqual(scanReady({ empty: true }), false);
  });

  it('suggestSessionProvider prefers detected installed agent', () => {
    const scan = { coders: [{ id: 'gemini-cli', detection: { present: true } }], tools: { ollama: { present: true } } };
    const registry = { providers: { gemini: { effective_status: 'active' }, ollama: { effective_status: 'active' } } };
    assert.strictEqual(suggestSessionProvider(scan, registry), 'gemini');
  });

  it('buildOnboardingState starts at scan when no scan', () => {
    const state = buildOnboardingState({
      settings: { onboarding: { completed: false } },
      scan: null,
      activeProject: null,
      registry: { projects: [] },
      rootsState: { roots: [], inferred: false },
      rootsValidated: { roots: [] },
      portfolioRoots: ['D:/projects'],
      cooldownRaw: { version: 1, providers: {} },
    });
    assert.strictEqual(state.current_step, 'scan');
    assert.strictEqual(state.completed, false);
    assert.deepStrictEqual(state.portfolio_roots, ['D:/projects']);
  });
});