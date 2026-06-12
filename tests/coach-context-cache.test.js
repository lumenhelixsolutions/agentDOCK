const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  resolveContextMode,
  wantsLiveContext,
  setSessionContextCache,
  getSessionContextCache,
  isContextCacheFresh,
  clearSessionContextCache,
} = require('../coach-context-cache');
const { summarizeCoachContext } = require('../coach-chat');

describe('coach-context-cache', () => {
  it('defaults to minimal context mode', () => {
    assert.strictEqual(resolveContextMode({ text: 'hello' }), 'minimal');
    assert.strictEqual(resolveContextMode({ text: 'what should I do on this screen?' }), 'minimal');
  });

  it('uses full mode for repo/memory questions', () => {
    assert.strictEqual(resolveContextMode({ text: 'read memory and tell me blockers' }), 'full');
    assert.strictEqual(resolveContextMode({ text: 'git status for this repo' }), 'full');
  });

  it('heartbeat mode refreshes cache flag', () => {
    assert.strictEqual(resolveContextMode({ contextMode: 'heartbeat' }), 'heartbeat');
    assert.strictEqual(resolveContextMode({ event: { type: 'heartbeat' } }), 'heartbeat');
  });

  it('session cache stores mcp context with freshness', () => {
    clearSessionContextCache('test-session');
    setSessionContextCache('test-session', { mcpContext: { git: { branch: 'main' } } });
    const row = getSessionContextCache('test-session');
    assert.ok(row.mcpContext);
    assert.ok(isContextCacheFresh(row));
    clearSessionContextCache('test-session');
  });

  it('minimal summarize omits heavy pageContext blob', () => {
    const summary = summarizeCoachContext({
      coachView: '/scan',
      pageContext: {
        agentRadarAgents: [{ id: 'grok', huge: 'payload' }],
        productionSessions: [{ tokens: 99999 }],
        stackScore: 80,
        agentRadarTotal: 2,
      },
      scan: { tools: { ollama: { present: true } } },
    }, { mode: 'minimal' });
    assert.strictEqual(summary.contextMode, 'minimal');
    assert.ok(!Object.prototype.hasOwnProperty.call(summary, 'pageContext'));
    assert.ok(summary.operatorSnapshot);
  });
});