const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  buildVersionInfo,
  readVersionFile,
  parseChangelogHeadline,
} = require('../version-info');

describe('version-info', () => {
  it('readVersionFile returns first line from VERSION', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hoot-ver-'));
    fs.writeFileSync(path.join(dir, 'VERSION'), '9.8.7\n', 'utf8');
    assert.strictEqual(readVersionFile(dir), '9.8.7');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('parseChangelogHeadline extracts release note', () => {
    const readme = [
      '## Changelog',
      '### v2.3.0 — LAN + Activity',
      '- LAN mode ships',
      '- Activity diary',
      '### v2.2.0 — Token burn',
    ].join('\n');
    assert.strictEqual(parseChangelogHeadline(readme, '2.3.0'), 'LAN + Activity');
  });

  it('buildVersionInfo prefers VERSION file over package.json', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hoot-ver-'));
    fs.writeFileSync(path.join(dir, 'VERSION'), '2.3.0\n', 'utf8');
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'agentdock', version: '2.0.0' }), 'utf8');
    fs.writeFileSync(path.join(dir, 'README.md'), '### v2.3.0 — Test\n- First bullet\n', 'utf8');
    const info = buildVersionInfo({ hootRoot: dir });
    assert.strictEqual(info.version, '2.3.0');
    assert.strictEqual(info.display, 'HOOT v2.3.0');
    assert.strictEqual(info.sources.version_file, '2.3.0');
    assert.strictEqual(info.changelog_headline, 'Test');
    fs.rmSync(dir, { recursive: true, force: true });
  });
});