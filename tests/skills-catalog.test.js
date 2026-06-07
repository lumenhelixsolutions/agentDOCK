const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.join(__dirname, '..', 'skills', 'compound-engineering');
const CACHE_DIR = path.join(SKILLS_DIR, 'cache');

describe('skills-catalog', () => {
  it('skills-catalog.json exists and has required schema', () => {
    const catalogPath = path.join(SKILLS_DIR, 'skills-catalog.json');
    assert.ok(fs.existsSync(catalogPath), 'skills-catalog.json missing');
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    assert.ok(catalog.source, 'Expected source');
    assert.ok(catalog.version, 'Expected version');
    assert.ok(Array.isArray(catalog.skills), 'Expected skills array');
    assert.ok(catalog.skills.length > 0, 'Expected at least one skill');
    const skill = catalog.skills[0];
    assert.ok(skill.id, 'Expected skill id');
    assert.ok(skill.name, 'Expected skill name');
    assert.ok(skill.description, 'Expected skill description');
    assert.ok(skill.category, 'Expected skill category');
    assert.ok(Array.isArray(skill.compatible_frontends), 'Expected compatible_frontends array');
  });

  it('agents-catalog.json exists', () => {
    const agentsPath = path.join(SKILLS_DIR, 'agents-catalog.json');
    assert.ok(fs.existsSync(agentsPath), 'agents-catalog.json missing');
    const catalog = JSON.parse(fs.readFileSync(agentsPath, 'utf8'));
    assert.ok(Array.isArray(catalog.agents), 'Expected agents array');
  });

  it('cached skills have local SKILL.md files', () => {
    const catalogPath = path.join(SKILLS_DIR, 'skills-catalog.json');
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    const cached = catalog.skills.filter(s => s.cached);
    for (const skill of cached) {
      assert.ok(skill.local_path, `Expected local_path for ${skill.id}`);
      const fullPath = path.join(__dirname, '..', skill.local_path);
      assert.ok(fs.existsSync(fullPath), `Missing cached file for ${skill.id}: ${fullPath}`);
    }
  });
});
