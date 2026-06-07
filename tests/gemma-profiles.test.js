const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { parseFrontmatter } = require('../server.js');

const PROFILES_DIR = path.join(__dirname, '..', 'profiles');
const GEMMA_PROFILES = [
  'local-safe-audit-gemma4b.md',
  'local-code-review-gemma4b.md',
  'local-bug-hunt-gemma4b.md',
  'local-architecture-gemma4b.md',
  'local-documentation-gemma4b.md',
  'local-performance-gemma4b.md',
  'local-security-audit-gemma4b.md',
  'local-patch-test-gemma4b.md',
  'local-heavy-refactor-gemma4b.md',
];

describe('gemma-profiles', () => {
  for (const file of GEMMA_PROFILES) {
    it(`${file} exists with valid frontmatter`, () => {
      const fullPath = path.join(PROFILES_DIR, file);
      assert.ok(fs.existsSync(fullPath), `${file} missing`);
      const raw = fs.readFileSync(fullPath, 'utf8');
      const parsed = parseFrontmatter(raw);
      assert.ok(parsed.meta.name, `Expected name in ${file}`);
      assert.strictEqual(parsed.meta.backend, 'ollama');
      assert.ok(parsed.meta.model, `Expected model in ${file}`);
      assert.ok(/```(?:powershell|ps1)\s+launch/.test(raw), `Expected launch block in ${file}`);
    });
  }
});
