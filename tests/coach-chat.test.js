const { describe, it } = require('node:test');
const assert = require('node:assert');
const { buildCoachChatResponse } = require('../coach-chat');
const { processChatMessage, clearChat } = require('../chat');

describe('coach-chat', () => {
  it('buildCoachChatResponse is conversational not operations report', () => {
    const res = buildCoachChatResponse({
      text: 'i need help here',
      context: {
        coachView: '/builder',
        viewGuide: {
          title: 'Stack Builder',
          summary: 'Compose stacks.',
          features: ['Wizard steps', 'Templates'],
          nextActions: ['Use Local audit template'],
        },
        pageContext: { stackScore: 40, stackIssues: ['Ollama missing'] },
        scan: { tools: { ollama: { present: false } } },
      },
    });
    assert.ok(!res.text.includes('=== AgentDock Operations Report ==='));
    assert.ok(res.text.includes('Stack Builder'));
    assert.ok(res.text.includes('help') || res.text.includes('On this screen'));
    assert.ok(res.text.includes('Ollama'));
  });

  it('processChatMessage LLM error falls back with coach-local source', async () => {
    clearChat('test-llm-fail');
    const res = await processChatMessage({
      sessionId: 'test-llm-fail',
      text: 'help me',
      context: {
        coachView: '/builder',
        viewGuide: { title: 'Stack Builder', summary: 'Compose.', features: ['Wizard'], nextActions: ['Template'] },
        pageContext: { stackScore: 50 },
        scan: { tools: { ollama: { present: false } } },
      },
      provider: 'gemini',
      apiKey: 'invalid-key-for-test',
    });
    assert.strictEqual(res.source, 'coach-local');
    assert.ok(!res.text.includes('=== AgentDock Operations Report ==='));
  });

  it('processChatMessage without API key uses local coach', async () => {
    clearChat('test-local');
    const res = await processChatMessage({
      sessionId: 'test-local',
      text: 'what should I do on this screen?',
      context: {
        coachView: '/profiles',
        viewGuide: { title: 'Profiles', summary: 'Pick profiles.', features: ['Easy mode'], nextActions: ['Use Easy 1-2-3'] },
        pageContext: { viewMode: 'easy', easyStep: 1 },
        scan: null,
        profiles: [],
      },
      provider: 'gemini',
      apiKey: undefined,
    });
    assert.strictEqual(res.source, 'coach-local');
    assert.ok(!res.text.includes('Operations Report'));
    assert.ok(res.text.includes('Profiles'));
  });
});