const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  isCoachActionAllowed,
  normalizeCoachActionTarget,
  listCoachActions,
} = require('../coach-actions');

describe('coach-actions registry', () => {
  it('allows all UI action targets from hints/pages', () => {
    const required = [
      'scan-run',
      'radar-refresh',
      'token-burn-refresh',
      'launch-review-first',
      'launch-staged-go',
      'profiles-easy-mode',
      'wizard-agent',
      'template-local-audit',
      'modules-auto-sync',
      'hoot-dismiss',
    ];
    for (const id of required) {
      assert.strictEqual(isCoachActionAllowed(id), true, id);
    }
  });

  it('normalizes stack template alias', () => {
    assert.strictEqual(normalizeCoachActionTarget('stack-template-local-audit'), 'template-local-audit');
    assert.strictEqual(isCoachActionAllowed('stack-template-local-audit'), true);
  });

  it('lists actions for operator prompt', () => {
    const list = listCoachActions();
    assert.ok(list.length >= 20);
    assert.ok(list.some((a) => a.id === 'scan-run'));
  });
});