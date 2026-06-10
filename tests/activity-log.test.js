const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { createActivityLog } = require('../activity-log');

describe('activity-log', () => {
  let tmp;
  let log;

  before(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hoot-activity-'));
    log = createActivityLog({
      stateFile: path.join(tmp, 'activity-log.json'),
      diaryDir: path.join(tmp, 'diary'),
      root: tmp,
    });
  });

  after(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('records radar start/stop with duration', () => {
    const prev = { processes: [], scanned_at: '2026-06-10T10:00:00.000Z' };
    const next = {
      scanned_at: '2026-06-10T10:01:00.000Z',
      processes: [{ pid: 42, agent_id: 'claude-code', agent_name: 'Claude Code', source: 'external', name: 'node.exe', command: 'claude' }],
    };
    const start = log.diffRadarSnapshots(prev, next, { project: 'D:\\proj' });
    assert.strictEqual(start.started.length, 1);
    assert.strictEqual(start.started[0].type, 'agent.external.start');

    const end = log.diffRadarSnapshots(next, { processes: [], scanned_at: '2026-06-10T10:05:00.000Z' });
    assert.strictEqual(end.stopped.length, 1);
    assert.strictEqual(end.stopped[0].type, 'agent.external.stop');
    assert.ok(end.stopped[0].duration_ms >= 0);
  });

  it('writes diary markdown', () => {
    log.appendEvent({ type: 'session.launch', agent_name: 'Test Profile' });
    const md = log.generateDiaryMarkdown(new Date().toISOString().slice(0, 10));
    assert.ok(md.includes('# HOOT Activity'));
    const file = log.writeDiary();
    assert.ok(fs.existsSync(file));
  });
});