const { describe, it } = require('node:test');
const assert = require('node:assert');
const { classifyProcesses, matchAgentProcess, buildAgentRules } = require('../agent-radar');

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
});