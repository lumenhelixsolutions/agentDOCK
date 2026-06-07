const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { parseFrontmatter } = require('../server.js');

const PROFILES_DIR = path.join(__dirname, '..', 'profiles');

function listProfileFiles() {
  if (!fs.existsSync(PROFILES_DIR)) return [];
  return fs.readdirSync(PROFILES_DIR).filter(f => f.endsWith('.md'));
}

function hasPowerShellBlock(body) {
  return /```(?:powershell|ps1)\s/.test(body);
}

describe('profiles', () => {
  const files = listProfileFiles();

  it('should have at least one profile', () => {
    assert.ok(files.length > 0, 'Expected profiles in profiles/');
  });

  for (const file of files) {
    describe(file, () => {
      const raw = fs.readFileSync(path.join(PROFILES_DIR, file), 'utf8');
      const parsed = parseFrontmatter(raw);

      it('has frontmatter delimited by ---', () => {
        assert.ok(raw.startsWith('---'), `Expected frontmatter starting with --- in ${file}`);
      });

      it('has required frontmatter: name', () => {
        assert.ok(parsed.meta.name, `Expected frontmatter 'name' in ${file}`);
        assert.strictEqual(typeof parsed.meta.name, 'string');
      });

      it('has goal-representing frontmatter (goal, task_mode, or mode)', () => {
        const hasGoal = parsed.meta.goal || parsed.meta.task_mode || parsed.meta.mode;
        assert.ok(hasGoal, `Expected frontmatter 'goal', 'task_mode', or 'mode' in ${file}`);
      });

      it('has stack-representing frontmatter (stack, frontend, or backend)', () => {
        const hasStack = parsed.meta.stack || parsed.meta.frontend || parsed.meta.backend;
        assert.ok(hasStack, `Expected frontmatter 'stack', 'frontend', or 'backend' in ${file}`);
      });

      it('has at least one PowerShell code block', () => {
        assert.ok(hasPowerShellBlock(parsed.body), `Expected PowerShell code block in ${file}`);
      });
    });
  }
});
