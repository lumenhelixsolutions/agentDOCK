const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { memoryBlocks } = require('../server.js');

const MEMORY_PATH = path.join(__dirname, '..', 'memory.md');

describe('memory.md', () => {
  it('should exist', () => {
    assert.ok(fs.existsSync(MEMORY_PATH), 'memory.md should exist');
  });

  const raw = fs.existsSync(MEMORY_PATH) ? fs.readFileSync(MEMORY_PATH, 'utf8') : '';

  it('should have a top-level heading', () => {
    assert.ok(/^# /.test(raw), 'Expected top-level # heading in memory.md');
  });

  it('should have a Known Successes section', () => {
    assert.ok(/## Known Successes/i.test(raw), 'Expected ## Known Successes section');
  });

  it('should have a Known Failures section', () => {
    assert.ok(/## Known Failures/i.test(raw), 'Expected ## Known Failures section');
  });

  it('should parse at least one evidence block', () => {
    const blocks = memoryBlocks(raw);
    assert.ok(blocks.length > 0, 'Expected at least one evidence block in memory.md');
  });

  it('should have known-good entries with status success or known-good', () => {
    const blocks = memoryBlocks(raw);
    const successInBlocks = blocks.filter(b => /success|known-good/i.test(b.status));
    const successInText = /Status:\s*success/i.test(raw) || /Status:\s*known-good/i.test(raw);
    assert.ok(successInBlocks.length > 0 || successInText, 'Expected at least one known-good/success entry');
  });

  it('should have known-bad or blocked entries', () => {
    const blocks = memoryBlocks(raw);
    const failures = blocks.filter(b => /blocked|failure|bad/i.test(b.status));
    assert.ok(failures.length > 0, 'Expected at least one blocked/failure/bad entry');
  });
});
