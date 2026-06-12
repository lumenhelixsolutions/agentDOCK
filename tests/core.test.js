const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { AgentClient } = require('../core/agent-client');
const { AccessDeniedException } = require('../core/errors');
const { calculateCost } = require('../core/pricing');
const { mergeOpenRouterModels, perTokenToPer1k } = require('../core/pricing-fetch');
const { compressPrompt } = require('../core/policy');
const { BaseProvider } = require('../core/providers/base');
const {
  pushNotification,
  listActiveNotifications,
  evaluateBudgetNotifications,
  toCoachHints,
} = require('../core/notifications');
const { transactionsToLangfuseBatch } = require('../core/langfuse-export');

function tempCoreDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'hoot-core-'));
}

class MockProvider extends BaseProvider {
  constructor() {
    super('mock');
    this.calls = 0;
  }

  async execute(prompt) {
    this.calls += 1;
    return {
      text: `echo:${prompt}`,
      usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
      provider: 'mock',
      model_id: 'mock-model',
      latency_ms: 12,
      ttft_ms: 8,
    };
  }
}

describe('C.O.R.E. engine', () => {
  let coreDir;

  before(() => {
    coreDir = tempCoreDir();
    process.env.AGENTDOCK_CORE_DIR = coreDir;
  });

  after(() => {
    delete process.env.AGENTDOCK_CORE_DIR;
    fs.rmSync(coreDir, { recursive: true, force: true });
  });

  it('calculateCost maps tokens to model pricing', () => {
    const pricing = {
      models: {
        'gpt-4o-mini': { input_per_1k: 0.00015, output_per_1k: 0.0006 },
      },
    };
    const cost = calculateCost({ input_tokens: 1000, output_tokens: 500 }, pricing, 'gpt-4o-mini');
    assert.ok(Math.abs(cost.cost_usd - 0.00045) < 0.0000001);
  });

  it('compressPrompt truncates oversized prompts', () => {
    const long = 'a'.repeat(20000);
    const out = compressPrompt(long, { threshold: 1000, head: 200, tail: 100 });
    assert.strictEqual(out.compressed, true);
    assert.ok(out.final_length < out.original_length);
  });

  it('AgentClient.query records transactions via middleware', async () => {
    const mock = new MockProvider();
    const client = new AgentClient({
      deps: {},
      options: { budget: false },
    });
    client.gateway.registry.mock = mock;
    const originalGet = client.gateway.getAdapter.bind(client.gateway);
    client.gateway.getAdapter = (provider) => {
      if (provider === 'mock') return mock;
      return originalGet(provider);
    };

    const res = await client.query({
      prompt: 'hello core',
      project_id: 'proj-a',
      model_config: { provider: 'mock', model: 'mock-model', tags: ['test'] },
    });

    assert.strictEqual(res.ok, true);
    assert.match(res.text, /echo:hello core/);
    assert.strictEqual(mock.calls, 1);

    const traces = client.getTraces({ project_id: 'proj-a', limit: 10 });
    assert.strictEqual(traces.length, 1);
    assert.strictEqual(traces[0].project_id, 'proj-a');
    assert.strictEqual(traces[0].input_tokens, 10);
    assert.strictEqual(traces[0].output_tokens, 5);
    assert.ok(traces[0].cost_usd >= 0);
  });

  it('prompt cache returns cached response without second provider call', async () => {
    const mock = new MockProvider();
    const client = new AgentClient({ options: { budget: false } });
    client.gateway.registry.mock = mock;
    const originalGet = client.gateway.getAdapter.bind(client.gateway);
    client.gateway.getAdapter = (provider) => {
      if (provider === 'mock') return mock;
      return originalGet(provider);
    };

    const params = {
      prompt: 'cache me',
      project_id: 'proj-cache',
      model_config: { provider: 'mock', model: 'mock-model' },
    };
    await client.query(params);
    const second = await client.query(params);
    assert.strictEqual(mock.calls, 1);
    assert.strictEqual(second.meta.cache_hit, true);
    const traces = client.getTraces({ project_id: 'proj-cache' });
    assert.ok(traces.some((t) => t.cache_hit));
  });

  it('budget hard-stop raises AccessDeniedException', async () => {
    const mock = new MockProvider();
    const client = new AgentClient({ options: { budget: true, cache: false } });
    client.gateway.registry.mock = mock;
    client.gateway.getAdapter = (provider) => {
      if (provider === 'mock') return mock;
      throw new Error(`unexpected provider ${provider}`);
    };
    client.setBudget('proj-budget', { daily_usd_cap: 0.000001, hard_stop: true });

    await assert.rejects(
      () => client.query({
        prompt: 'expensive',
        project_id: 'proj-budget',
        model_config: { provider: 'mock', model: 'gpt-4o' },
      }),
      (err) => err instanceof AccessDeniedException,
    );
  });

  it('mergeOpenRouterModels converts per-token rates to per-1k', () => {
    assert.ok(Math.abs(perTokenToPer1k(0.00003) - 0.03) < 0.0001);
    const { pricing, merged } = mergeOpenRouterModels(
      { models: { default: { input_per_1k: 0.001, output_per_1k: 0.003 } } },
      [{ id: 'openai/gpt-4o-mini', pricing: { prompt: '0.00000015', completion: '0.0000006' } }],
    );
    assert.ok(merged >= 1);
    assert.ok(pricing.models['gpt-4o-mini']);
    assert.ok(pricing.models['openai/gpt-4o-mini']);
  });

  it('notifications emit budget alerts and coach hints', () => {
    const client = new AgentClient();
    client.setBudget('proj-note', { daily_usd_cap: 1, alert_threshold: 0.01, hard_stop: true });
    pushNotification(client.coreDir, {
      type: 'budget_alert',
      severity: 'warning',
      project_id: 'proj-note',
      title: 'Test',
      message: 'Alert test',
    });
    const active = listActiveNotifications(client.coreDir, { project_id: 'proj-note' });
    assert.ok(active.length >= 1);
    const hints = toCoachHints(active);
    assert.ok(hints[0].message.includes('Alert'));
    const emitted = evaluateBudgetNotifications(client.coreDir, 'proj-note');
    assert.ok(Array.isArray(emitted));
  });

  it('langfuse export shapes transactions', async () => {
    const mock = new MockProvider();
    const client = new AgentClient({ options: { budget: false, cache: false } });
    client.gateway.registry.mock = mock;
    client.gateway.getAdapter = (provider) => (provider === 'mock' ? mock : null);
    await client.query({
      prompt: 'export me',
      project_id: 'proj-export',
      model_config: { provider: 'mock', model: 'mock-model' },
    });
    const traces = client.getTraces({ project_id: 'proj-export' });
    const batch = transactionsToLangfuseBatch(traces);
    assert.ok(batch.traces.length >= 1);
    assert.ok(batch.traces[0].generations.length >= 1);
  });

  it('rollup aggregates by project and model', async () => {
    const mock = new MockProvider();
    const client = new AgentClient({ options: { budget: false, cache: false } });
    client.gateway.registry.mock = mock;
    client.gateway.getAdapter = (provider) => (provider === 'mock' ? mock : null);

    await client.query({
      prompt: 'one',
      project_id: 'rollup-proj',
      model_config: { provider: 'mock', model: 'mock-model' },
    });
    await client.query({
      prompt: 'two',
      project_id: 'rollup-proj',
      model_config: { provider: 'mock', model: 'mock-model' },
    });

    const rollup = client.getRollup({ project_id: 'rollup-proj' });
    assert.strictEqual(rollup.total_requests, 2);
    assert.strictEqual(rollup.by_project.length, 1);
    assert.strictEqual(rollup.by_model[0].model_id, 'mock-model');
  });
});