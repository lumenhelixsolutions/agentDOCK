const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { inferRootsFromProject } = require('../workspace-infer');

describe('workspace-infer', () => {
  it('infers ui + root core for typical HOOT layout', () => {
    const root = path.join(os.tmpdir(), `hoot-infer-${process.pid}`);
    fs.mkdirSync(path.join(root, 'ui'), { recursive: true });
    fs.writeFileSync(path.join(root, 'server.js'), '// test', 'utf8');
    fs.mkdirSync(path.join(root, 'state'), { recursive: true });
    try {
      const inferred = inferRootsFromProject(root);
      assert.ok(inferred.roots.some((r) => r.id === 'app' && r.path.includes('ui')));
      assert.ok(inferred.roots.some((r) => r.id === 'core'));
      assert.ok(inferred.inferred);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('falls back to project root when flat repo', () => {
    const root = path.join(os.tmpdir(), `hoot-flat-${process.pid}`);
    fs.mkdirSync(root, { recursive: true });
    fs.writeFileSync(path.join(root, 'package.json'), '{}', 'utf8');
    try {
      const inferred = inferRootsFromProject(root);
      assert.strictEqual(inferred.roots.length, 1);
      assert.strictEqual(inferred.roots[0].id, 'core');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});