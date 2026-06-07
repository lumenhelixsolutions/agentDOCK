const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('compatibility-rules', () => {
  const rules = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'compatibility-rules.json'), 'utf8'));

  it('has modelCapabilities with gemma:4b', () => {
    assert.ok(rules.modelCapabilities, 'Expected modelCapabilities key');
    assert.ok(rules.modelCapabilities['gemma:4b'], 'Expected gemma:4b entry');
    assert.strictEqual(rules.modelCapabilities['gemma:4b'].max_tier, 'light');
  });

  it('has ceCompatibility with ce-plan', () => {
    assert.ok(rules.ceCompatibility, 'Expected ceCompatibility key');
    assert.ok(rules.ceCompatibility['ce-plan'], 'Expected ce-plan entry');
    assert.ok(rules.ceCompatibility['ce-plan'].frontends.includes('claude'));
  });

  it('has taskTiers mapping', () => {
    assert.ok(rules.taskTiers, 'Expected taskTiers key');
    assert.strictEqual(rules.taskTiers['heavy-refactor'], 'advanced');
    assert.strictEqual(rules.taskTiers['safe-audit'], 'light');
  });

  const { auditProfile } = require('../server.js');

  it('auditProfile warns on gemma:4b heavy-refactor', () => {
    const profile = {
      id: 'local-heavy-refactor-gemma4b',
      meta: { model: 'gemma:4b', frontend: 'ollama', task_mode: 'heavy-refactor' }
    };
    const audit = auditProfile(profile);
    assert.ok(audit.warnings.some(w => w.includes("'light' tier") && w.includes("'advanced' tier")));
  });

  it('auditProfile suggests alternatives for gemma:4b heavy-refactor', () => {
    const profile = {
      id: 'local-heavy-refactor-gemma4b',
      meta: { model: 'gemma:4b', frontend: 'ollama', task_mode: 'heavy-refactor' }
    };
    const audit = auditProfile(profile);
    assert.ok(audit.suggestions.length > 0 || audit.warnings.length > 0);
  });
});
