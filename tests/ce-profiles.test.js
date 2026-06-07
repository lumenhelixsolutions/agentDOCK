const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { parseFrontmatter } = require('../server.js');

const PROFILES_DIR = path.join(__dirname, '..', 'profiles');
const CE_PROFILES = [
  'compound-core-claude.md',
  'compound-core-codex.md',
  'compound-strategy-claude.md',
  'compound-strategy-codex.md',
  'compound-plan-work-claude.md',
  'compound-plan-work-codex.md',
  'compound-review-compound-claude.md',
  'compound-review-compound-codex.md',
];

describe('ce-profiles', () => {
  for (const file of CE_PROFILES) {
    it(`${file} exists with valid frontmatter`, () => {
      const fullPath = path.join(PROFILES_DIR, file);
      assert.ok(fs.existsSync(fullPath), `${file} missing`);
      const raw = fs.readFileSync(fullPath, 'utf8');
      const parsed = parseFrontmatter(raw);
      assert.ok(parsed.meta.name, `Expected name in ${file}`);
      assert.ok(parsed.meta.frontend, `Expected frontend in ${file}`);
      assert.ok(parsed.meta.ce_version, `Expected ce_version in ${file}`);
      assert.ok(/```(?:powershell|ps1)\s+launch/.test(raw), `Expected launch block in ${file}`);
    });
  }
});
