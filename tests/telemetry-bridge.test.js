const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmp = path.join(os.tmpdir(), `hoot-telemetry-${process.pid}`);
const hootRoot = path.join(tmp, 'hoot');
const dataRoot = path.join(tmp, 'data');

process.env.AGENTDOCK_PROVIDER_COOLDOWN_FILE = path.join(hootRoot, 'state', 'provider-cooldown.json');
process.env.AGENTDOCK_WORKSPACE_ROOTS_FILE = path.join(hootRoot, 'state', 'workspace-roots.json');
delete require.cache[require.resolve('../provider-cooldown')];
delete require.cache[require.resolve('../workspace-roots')];
delete require.cache[require.resolve('../telemetry-bridge')];

const { patchProvider } = require('../provider-cooldown');
const { putRoots } = require('../workspace-roots');
const {
  kernelTelemetryFile,
  mirrorTelemetryFile,
  syncTelemetryToDisk,
  readTelemetryFromDisk,
} = require('../telemetry-bridge');

describe('telemetry-bridge', () => {
  before(() => {
    fs.mkdirSync(path.join(hootRoot, 'state'), { recursive: true });
    fs.mkdirSync(path.join(dataRoot, 'telemetry'), { recursive: true });
    putRoots({
      roots: [
        { id: 'app', label: 'App', path: path.join(tmp, 'app'), role: 'ui' },
        { id: 'core', label: 'Core', path: path.join(tmp, 'core'), role: 'backend' },
        { id: 'data', label: 'Data', path: dataRoot, role: 'data' },
      ],
      active_root_id: 'core',
    }, null);
  });

  after(() => {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it('uses HOOT state/ai_status.json as kernel path', () => {
    const kernel = kernelTelemetryFile(hootRoot);
    assert.ok(kernel.replace(/\\/g, '/').endsWith('state/ai_status.json'));
  });

  it('mirrors to workspace data root when configured', () => {
    const mirror = mirrorTelemetryFile(hootRoot, null);
    assert.ok(mirror?.includes('telemetry'));
    assert.ok(mirror?.includes('ai_status.json'));
  });

  it('sync writes kernel and mirror files', () => {
    patchProvider({ provider: 'claude', status: 'active' });
    const payload = syncTelemetryToDisk({ hootRoot, activeProject: null });
    assert.ok(payload.hoot_root);
    assert.ok(payload.matrix_line);
    const kernel = kernelTelemetryFile(hootRoot);
    const mirror = mirrorTelemetryFile(hootRoot, null);
    assert.ok(fs.existsSync(kernel));
    assert.ok(fs.existsSync(mirror));
    const read = readTelemetryFromDisk(hootRoot, null);
    assert.strictEqual(read.file, kernel);
    assert.ok(read.data?.providers?.claude);
  });
});