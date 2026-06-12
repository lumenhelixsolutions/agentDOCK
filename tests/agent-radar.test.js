const { describe, it } = require('node:test');
const assert = require('node:assert');
const { classifyProcesses, matchAgentProcess, buildAgentRules, mergeGrokIntoRadar } = require('../agent-radar');

describe('agent-radar', () => {
  it('builds agent rules from catalog and builtins', () => {
    const rules = buildAgentRules();
    assert.ok(rules.length >= 4);
    assert.ok(rules.some((r) => r.id === 'claude-code'));
    assert.ok(rules.some((r) => r.id === 'codex'));
  });

  it('matches claude node wrapper by command line', () => {
    const rules = buildAgentRules();
    const rule = matchAgentProcess(
      { name: 'node.exe', command: 'node C:/npm/@anthropic-ai/claude-code/cli.js' },
      rules,
    );
    assert.strictEqual(rule?.id, 'claude-code');
  });

  it('classifies dock vs external processes', () => {
    const result = classifyProcesses(
      [
        { pid: 1001, name: 'codex.exe', command: 'codex run' },
        { pid: 2002, name: 'node.exe', command: 'node @openai/codex with AGENTDOCK_SESSION_ID=abc' },
        { pid: 3003, name: 'claude.exe', command: 'claude' },
      ],
      [2002],
    );
    assert.strictEqual(result.summary.total, 3);
    assert.strictEqual(result.summary.dock, 1);
    assert.strictEqual(result.summary.external, 2);
    assert.ok(result.agents.some((a) => a.id === 'codex'));
    assert.ok(result.processes.every((p) => p.agent_id));
  });

  it('returns empty summary for no matches', () => {
    const result = classifyProcesses([{ pid: 1, name: 'notepad.exe', command: 'notepad' }]);
    assert.strictEqual(result.summary.total, 0);
    assert.deepStrictEqual(result.agents, []);
  });

  it('dedupes duplicate pids from process scan', () => {
    const result = classifyProcesses(
      [
        { pid: 1001, name: 'codex.exe', command: 'codex run' },
        { pid: 1001, name: 'codex.exe', command: 'codex run duplicate' },
      ],
      [],
    );
    assert.strictEqual(result.summary.total, 1);
  });

  it('matches grok agent.exe only when cmd references .grok', () => {
    const rules = buildAgentRules();
    assert.strictEqual(
      matchAgentProcess({ name: 'agent.exe', command: 'C:\\Users\\me\\.grok\\bin\\agent.exe' }, rules)?.id,
      'grok',
    );
    assert.strictEqual(
      matchAgentProcess({ name: 'agent.exe', command: 'C:\\other\\agent.exe' }, rules),
      null,
    );
  });

  it('mergeGrokIntoRadar adds grok sessions missing from ps radar', () => {
    const merged = mergeGrokIntoRadar(
      {
        scanned_at: new Date().toISOString(),
        processes: [{ pid: 1, name: 'codex.exe', command: 'codex', agent_id: 'codex', agent_name: 'Codex', source: 'external' }],
        agents: [{ id: 'codex', name: 'Codex', count: 1, dock: 0, external: 1, pids: [1] }],
        summary: { total: 1, dock: 0, external: 1, agent_types: 1 },
      },
      {
        activeProject: 'D:\\projects',
      },
    );
    assert.ok(Array.isArray(merged.grok_sessions));
    assert.ok(merged.grok_summary);
    if (merged.grok_sessions.length > 0) {
      assert.ok(merged.summary.total >= merged.grok_sessions.length);
      assert.ok(merged.agents.some((a) => a.id === 'grok'));
    }
  });
});