const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { createActivityLog, capDurationMs, MAX_DURATION_MS } = require('../activity-log');

describe('activity-log', () => {
  let tmpDir;
  let log;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hoot-activity-'));
    log = createActivityLog({
      stateFile: path.join(tmpDir, 'activity-log.json'),
      diaryDir: path.join(tmpDir, 'diary'),
      root: tmpDir,
    });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('capDurationMs caps absurd durations', () => {
    const { duration_ms, meta } = capDurationMs(MAX_DURATION_MS + 5000, { pid: 9 });
    assert.strictEqual(duration_ms, MAX_DURATION_MS);
    assert.strictEqual(meta.capped, true);
  });

  it('diffRadarSnapshots uses scanned_at and links dock session_ref', () => {
    const prev = { scanned_at: '2026-06-10T09:00:00.000Z', processes: [] };
    const next = {
      scanned_at: '2026-06-10T09:05:00.000Z',
      processes: [{ pid: 42, agent_id: 'codex', agent_name: 'Codex', source: 'agentdock' }],
    };
    const dockSessionsByPid = new Map([[42, 's-test-1']]);
    const { started } = log.diffRadarSnapshots(prev, next, { project: '/proj', dockSessionsByPid });
    assert.strictEqual(started.length, 1);
    assert.strictEqual(started[0].session_ref, 's-test-1');
    assert.strictEqual(started[0].type, 'agent.dock.start');

    const stopPrev = next;
    const stopNext = { scanned_at: '2026-06-10T09:35:00.000Z', processes: [] };
    const { stopped } = log.diffRadarSnapshots(stopPrev, stopNext, { dockSessionsByPid });
    assert.strictEqual(stopped.length, 1);
    assert.strictEqual(stopped[0].duration_ms, 30 * 60 * 1000);
    assert.strictEqual(stopped[0].session_ref, 's-test-1');
  });

  it('reconcileRadarSessions prunes stale and resumes live pids', () => {
    const data = log.load();
    data.sessions['radar-99'] = { pid: 99, agent_id: 'old', started_at: '2026-06-09T00:00:00.000Z' };
    fs.writeFileSync(path.join(tmpDir, 'activity-log.json'), JSON.stringify(data));

    const live = {
      scanned_at: '2026-06-10T10:00:00.000Z',
      processes: [{ pid: 77, agent_id: 'grok', agent_name: 'Grok', source: 'external' }],
    };
    log.reconcileRadarSessions(live, { project: null, dockSessionsByPid: new Map() });
    const after = log.load();
    assert.ok(!after.sessions['radar-99']);
    assert.ok(after.sessions['radar-77']);
    assert.strictEqual(after.sessions['radar-77'].resumed, true);
  });
});