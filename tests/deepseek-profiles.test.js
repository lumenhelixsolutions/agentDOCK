const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { parseFrontmatter } = require('../server.js');

const PROFILES_DIR = path.join(__dirname, '..', 'profiles');
const DEEPSEEK_PROFILES = [
  'local-code-assist-deepseek-6.7b.md',
  'local-heavy-refactor-deepseek-16b.md',
  'local-reasoning-deepseek-r1-8b.md',
  'local-reasoning-deepseek-r1-32b.md',
];

describe('deepseek-profiles', () => {
  for (const file of DEEPSEEK_PROFILES) {
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
