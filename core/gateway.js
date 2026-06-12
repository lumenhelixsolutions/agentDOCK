/**
 * C.O.R.E. — Provider gateway (interceptor entry point).
 */

const { createProviderRegistry, getProvider } = require('./providers');
const { withMiddleware, createMiddlewareHooks } = require('./middleware');
const { loadPricing } = require('./pricing');
const { initStorage, resolveCoreDir } = require('./storage');

class ProviderGateway {
  constructor({ hootRoot, deps = {}, options = {} } = {}) {
    this.coreDir = resolveCoreDir(hootRoot);
    this.pricing = options.pricing || loadPricing(this.coreDir);
    this.options = options;
    this.registry = createProviderRegistry(deps);
    initStorage(this.coreDir);
    this.hooks = createMiddlewareHooks({
      coreDir: this.coreDir,
      pricing: this.pricing,
      options: this.options,
    });
  }

  getAdapter(provider) {
    return getProvider(this.registry, provider);
  }

  async execute(prompt, projectId, modelConfig = {}) {
    const providerId = modelConfig.provider || 'openai';
    const adapter = this.getAdapter(providerId);
    const tags = Array.isArray(modelConfig.tags) ? modelConfig.tags : [];
    const callHooks = createMiddlewareHooks({
      coreDir: this.coreDir,
      pricing: this.pricing,
      options: {
        cache: modelConfig.cache !== false && this.options.cache !== false,
        budget: modelConfig.budget !== false && this.options.budget !== false,
        compress: modelConfig.compress !== false && this.options.compress !== false,
        ...(modelConfig.core_options || {}),
      },
    });

    const run = withMiddleware(async (ctx) => {
      if (ctx.cache_hit) {
        return {
          text: ctx.cached_response,
          usage: ctx.cached_usage || { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
          cache_hit: true,
          provider: ctx.provider,
          model_id: ctx.model_id,
          project_id: ctx.project_id,
          latency_ms: 0,
          ttft_ms: 0,
        };
      }
      return adapter.execute(ctx.prompt, ctx.project_id, {
        ...modelConfig,
        provider: providerId,
      });
    }, callHooks);

    const result = await run({
      prompt,
      project_id: projectId || 'default',
      model_config: modelConfig,
      tags,
    });

    const rawChoice = result.raw?.choices?.[0]?.message;
    return {
      text: result.text || '',
      usage: result.usage || { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
      provider: result.provider || providerId,
      model_id: result.model_id || modelConfig.model || 'unknown',
      project_id: projectId || 'default',
      latency_ms: result.latency_ms || 0,
      ttft_ms: result.ttft_ms ?? null,
      cache_hit: Boolean(result.cache_hit),
      raw: result.raw || null,
      message: result.message || rawChoice || null,
      tool_calls: result.tool_calls || rawChoice?.tool_calls || [],
    };
  }
}

module.exports = { ProviderGateway };