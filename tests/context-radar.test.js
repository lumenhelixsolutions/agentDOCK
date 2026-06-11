const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { buildContextRadar, estTokens, DEFAULT_EXTS } = require('../context-radar');

const tmpRoot = path.join(os.tmpdir(), `hoot-radar-test-${process.pid}`);

function write(rel, content, ageMinutes = 0) {
  const full = path.join(tmpRoot, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  if (ageMinutes > 0) {
    const t = new Date(Date.now() - ageMinutes * 60000);
    fs.utimesSync(full, t, t);
  }
  return full;
}

describe('context-radar', () => {
  before(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
    write('src/app.js', 'console.log("recent");', 5);
    write('src/styles.css', 'body { margin: 0 }', 30);
    write('notes.md', '# notes', 90);
    write('stale.py', 'print("old")', 60 * 26); // outside 24h window
    write('binary.exe', 'MZ', 1); // ignored extension
    write('node_modules/dep/index.js', 'module.exports = 1;', 1); // ignored dir
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('estimates tokens from bytes', () => {
    assert.strictEqual(estTokens(400), 100);
    assert.strictEqual(estTokens(1), 1);
  });

  it('finds only recent matching files inside the window', () => {
    const radar = buildContextRadar({
      rootsState: { roots: [{ id: 'core', label: 'Core', path: tmpRoot, role: 'backend' }], active_root_id: 'core' },
      hours: 2,
    });
    assert.strictEqual(radar.roots.length, 1);
    const root = radar.roots[0];
    assert.ok(root.exists);
    assert.ok(root.active);
    const paths = root.files.map((f) => f.path);
    assert.ok(paths.includes('src/app.js'));
    assert.ok(paths.includes('src/styles.css'));
    assert.ok(paths.includes('notes.md'));
    assert.ok(!paths.includes('stale.py'));
    assert.ok(!paths.includes('binary.exe'));
    assert.ok(!paths.some((p) => p.includes('node_modules')));
    assert.strictEqual(radar.totals.files, root.total_files);
    assert.ok(radar.totals.est_tokens > 0);
    // sorted most-recent first
    assert.strictEqual(root.files[0].path, 'src/app.js');
  });

  it('respects a narrower window', () => {
    const radar = buildContextRadar({
      rootsState: { roots: [{ id: 'core', label: 'Core', path: tmpRoot }] },
      hours: 0.25,
    });
    const paths = radar.roots[0].files.map((f) => f.path);
    assert.ok(paths.includes('src/app.js'));
    assert.ok(!paths.includes('src/styles.css'));
  });

  it('falls back to the active project when no roots configured', () => {
    const radar = buildContextRadar({ rootsState: { roots: [] }, activeProject: tmpRoot, hours: 2 });
    assert.strictEqual(radar.roots.length, 1);
    assert.strictEqual(radar.roots[0].id, 'project');
    assert.ok(radar.roots[0].total_files >= 3);
  });

  it('reports missing roots without throwing', () => {
    const radar = buildContextRadar({
      rootsState: { roots: [{ id: 'ghost', label: 'Ghost', path: path.join(tmpRoot, 'nope') }] },
      hours: 2,
    });
    assert.strictEqual(radar.roots[0].exists, false);
    assert.strictEqual(radar.roots[0].total_files, 0);
  });

  it('exposes the tracked extension list', () => {
    assert.ok(DEFAULT_EXTS.includes('.py'));
    assert.ok(DEFAULT_EXTS.includes('.md'));
  });
});
