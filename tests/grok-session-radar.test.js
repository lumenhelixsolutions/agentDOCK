const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  grokSessionDir,
  isPidAlive,
  analyzeSessionFolder,
  buildGrokSessionRadar,
} = require('../grok-session-radar');

describe('grok-session-radar', () => {
  it('isPidAlive returns false for invalid pid', () => {
    assert.strictEqual(isPidAlive(0), false);
    assert.strictEqual(isPidAlive(-1), false);
  });

  it('grokSessionDir encodes cwd for session path', () => {
    const dir = grokSessionDir('/home/.grok', 'D:\\projects', 'sess-1');
    assert.ok(dir.includes('sess-1'));
    assert.ok(dir.includes('sessions'));
  });

  it('analyzeSessionFolder reads events and chat telemetry', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'grok-radar-'));
    const events = [
      JSON.stringify({ type: 'turn_started', model_id: 'grok-4', conversation_message_count: 12, turn_number: 3 }),
      JSON.stringify({ type: 'turn_ended', turn_number: 3 }),
    ].join('\n');
    const chat = [
      JSON.stringify({ type: 'user', content: '<user_query>Fix HOOT radar</user_query>' }),
      JSON.stringify({ type: 'assistant', content: 'On it.' }),
      JSON.stringify({ synthetic_reason: 'compaction_meta' }),
    ].join('\n');
    fs.writeFileSync(path.join(tmp, 'events.jsonl'), events);
    fs.writeFileSync(path.join(tmp, 'chat_history.jsonl'), chat);
    const metrics = analyzeSessionFolder(tmp);
    assert.strictEqual(metrics.model_id, 'grok-4');
    assert.strictEqual(metrics.completed_turns, 1);
    assert.strictEqual(metrics.compaction_count, 1);
    assert.ok(metrics.est_context_tokens > 0);
    assert.ok(metrics.last_user_query.includes('Fix HOOT radar'));
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('buildGrokSessionRadar returns valid scanned_at', () => {
    const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'grok-home-'));
    fs.writeFileSync(path.join(fakeHome, 'active_sessions.json'), '[]');
    const orig = process.env.GROK_HOME;
    process.env.GROK_HOME = fakeHome;
    try {
      const radar = buildGrokSessionRadar({ activeProject: 'D:\\projects' });
      assert.ok(radar.scanned_at);
      assert.ok(!Number.isNaN(Date.parse(radar.scanned_at)));
      assert.deepStrictEqual(radar.sessions, []);
    } finally {
      if (orig === undefined) delete process.env.GROK_HOME;
      else process.env.GROK_HOME = orig;
      fs.rmSync(fakeHome, { recursive: true, force: true });
    }
  });
});