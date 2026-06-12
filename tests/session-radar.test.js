const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  decodeClaudeProjectPath,
  analyzeClaudeSessionFile,
  analyzeCodexRollout,
  analyzeKimiSessionDir,
} = require('../session-radar-adapters');
const { buildAllSessionRadars } = require('../session-radar');
const { pickPrimaryProductionContext } = require('../session-radar-shared');

describe('session-radar adapters', () => {
  it('decodeClaudeProjectPath maps encoded folder to cwd', () => {
    assert.strictEqual(decodeClaudeProjectPath('D--projects'), `D:${path.sep}projects`);
  });

  it('analyzeClaudeSessionFile extracts cwd, model, and last user query', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-radar-'));
    const file = path.join(tmp, 'sess.jsonl');
    const rows = [
      JSON.stringify({ type: 'user', cwd: 'D:\\projects', message: { role: 'user', content: 'fix radar' }, isMeta: false }),
      JSON.stringify({ type: 'assistant', message: { role: 'assistant', model: 'claude-sonnet-4', content: [{ type: 'text', text: 'ok' }] } }),
    ].join('\n');
    fs.writeFileSync(file, rows);
    const metrics = analyzeClaudeSessionFile(file);
    assert.strictEqual(metrics.cwd, 'D:\\projects');
    assert.strictEqual(metrics.model_id, 'claude-sonnet-4');
    assert.strictEqual(metrics.last_user_query, 'fix radar');
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('analyzeCodexRollout reads session meta and user message', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-radar-'));
    const file = path.join(tmp, 'rollout.jsonl');
    const rows = [
      JSON.stringify({ type: 'session_meta', payload: { id: '019abc', cwd: 'D:\\codex', thread_name: 'Bubble sort' } }),
      JSON.stringify({ type: 'turn_context', payload: { model: 'gpt-5', cwd: 'D:\\codex' } }),
      JSON.stringify({ type: 'event_msg', payload: { type: 'user_message', message: 'write bubble sort' } }),
      JSON.stringify({ type: 'event_msg', payload: { type: 'task_started' } }),
    ].join('\n');
    fs.writeFileSync(file, rows);
    const metrics = analyzeCodexRollout(file);
    assert.strictEqual(metrics.session_id, '019abc');
    assert.strictEqual(metrics.model_id, 'gpt-5');
    assert.strictEqual(metrics.last_user_query, 'write bubble sort');
    assert.strictEqual(metrics.completed_turns, 1);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('analyzeKimiSessionDir sums context files', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi-radar-'));
    fs.writeFileSync(path.join(tmp, 'context.jsonl'), JSON.stringify({ role: 'user', content: 'hello kimi' }) + '\n');
    fs.writeFileSync(path.join(tmp, 'state.json'), JSON.stringify({ approval: { yolo: true }, custom_title: 'test' }));
    const metrics = analyzeKimiSessionDir(tmp, 'D:\\projects');
    assert.ok(metrics.est_context_tokens > 0);
    assert.strictEqual(metrics.thread_name, 'test');
    assert.strictEqual(metrics.yolo_mode, true);
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

describe('session-radar orchestrator', () => {
  it('buildAllSessionRadars returns unified production_sessions array', () => {
    const radar = buildAllSessionRadars({ activeProject: 'D:\\projects', processes: [] });
    assert.ok(Array.isArray(radar.production_sessions));
    assert.ok(radar.by_agent);
    assert.ok(radar.session_summary);
    assert.ok('production_context' in radar);
    assert.ok('grok_sessions' in radar);
  });

  it('pickPrimaryProductionContext prefers active matched session', () => {
    const primary = pickPrimaryProductionContext([
      { agent_id: 'codex', active: false, matched_project: true, est_context_tokens: 1000 },
      { agent_id: 'grok', active: true, matched_project: true, est_context_tokens: 50000 },
    ]);
    assert.strictEqual(primary.agent_id, 'grok');
  });
});