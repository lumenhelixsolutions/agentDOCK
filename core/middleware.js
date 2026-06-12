/**
 * C.O.R.E. — Middleware pipeline (JS equivalents of @track_usage / @enforce_budget).
 */

const { AccessDeniedException } = require('./errors');
const { lookup, store } = require('./cache');
const { compressPrompt, checkBudget } = require('./policy');
const { calculateCost, loadPricing } = require('./pricing');
const { appendTransaction, newTransactionId } = require('./storage');

function withMiddleware(executeFn, hooks = {}) {
  return async function wrappedExecute(ctx) {
    const startedAt = Date.now();
    const traceId = ctx.trace_id || newTransactionId();
    let pre = {};
    if (hooks.pre) pre = await hooks.pre({ ...ctx, trace_id: traceId, started_at: startedAt }) || {};

    const merged = { ...ctx, ...pre, trace_id: traceId };
    let result;
    let error = null;
    try {
      result = await executeFn(merged);
    } catch (err) {
      error = err;
      result = {
        text: '',
        usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
        error: err.message,
        provider: merged.provider,
        model_id: merged.model_id,
        project_id: merged.project_id,
      };
    }

    const endedAt = Date.now();
    const latencyMs = endedAt - startedAt;
    if (hooks.post) {
      await hooks.post({
        ...merged,
        result,
        error,
        started_at: startedAt,
        ended_at: endedAt,
        latency_ms: latencyMs,
      });
    }
    if (error && !(error instanceof AccessDeniedException)) throw error;
    if (error) throw error;
    return result;
  };
}

function createMiddlewareHooks({ coreDir, pricing, options = {} }) {
  const useCache = options.cache !== false;
  const useBudget = options.budget !== false;
  const useCompress = options.compress !== false;

  return {
    async pre(ctx) {
      const modelId = ctx.model_config?.model || ctx.model_id || 'unknown';
      const projectId = ctx.project_id || 'default';
      const provider = ctx.model_config?.provider || ctx.provider || 'openai';

      let prompt = String(ctx.prompt || '');
      let compressed = false;
      if (useCompress) {
        const comp = compressPrompt(prompt, options.compress || {});
        prompt = comp.prompt;
        compressed = comp.compressed;
      }

      if (useBudget) {
        checkBudget(coreDir, {
          project_id: projectId,
          pricing,
          prompt,
          model_id: modelId,
        });
      }

      if (useCache) {
        const cache = lookup(coreDir, { prompt, model_id: modelId, project_id: projectId });
        if (cache.hit) {
          return {
            prompt,
            compressed,
            cache_hit: true,
            cached_response: cache.response,
            cached_usage: cache.usage,
            provider,
            model_id: modelId,
            project_id: projectId,
          };
        }
      }

      return {
        prompt,
        compressed,
        cache_hit: false,
        provider,
        model_id: modelId,
        project_id: projectId,
      };
    },

    async post(ctx) {
      const modelId = ctx.model_id || ctx.model_config?.model || 'unknown';
      const projectId = ctx.project_id || 'default';
      const provider = ctx.provider || ctx.model_config?.provider || 'unknown';
      const tags = Array.isArray(ctx.tags) ? ctx.tags : [];

      if (ctx.cache_hit && ctx.cached_response != null) {
        const usage = ctx.cached_usage || { input_tokens: 0, output_tokens: 0, total_tokens: 0 };
        const cost = calculateCost(usage, pricing, modelId);
        appendTransaction(coreDir, {
          id: ctx.trace_id,
          trace_id: ctx.trace_id,
          timestamp: new Date(ctx.started_at).toISOString(),
          project_id: projectId,
          model_id: modelId,
          provider,
          input_tokens: usage.input_tokens,
          output_tokens: usage.output_tokens,
          latency_ms: ctx.latency_ms,
          ttft_ms: 0,
          cost_usd: cost.cost_usd,
          tags: [...tags, 'cache_hit'],
          cache_hit: true,
          compressed: ctx.compressed,
          status: 'success',
        });
        return;
      }

      const result = ctx.result || {};
      const usage = result.usage || { input_tokens: 0, output_tokens: 0, total_tokens: 0 };
      const cost = calculateCost(usage, pricing, modelId);
      const status = ctx.error ? 'error' : 'success';

      appendTransaction(coreDir, {
        id: ctx.trace_id,
        trace_id: ctx.trace_id,
        timestamp: new Date(ctx.started_at).toISOString(),
        project_id: projectId,
        model_id: modelId,
        provider: result.provider || provider,
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        latency_ms: result.latency_ms ?? ctx.latency_ms,
        ttft_ms: result.ttft_ms ?? null,
        cost_usd: cost.cost_usd,
        tags,
        cache_hit: false,
        compressed: ctx.compressed,
        status,
        error: ctx.error?.message || result.error || null,
      });

      if (!ctx.error && useCache && result.text != null) {
        store(coreDir, {
          prompt: ctx.prompt,
          model_id: modelId,
          project_id: projectId,
          response: result.text,
          usage,
        });
      }
    },
  };
}

function enforceBudget(coreDir, pricing) {
  return async function budgetHook(ctx) {
    checkBudget(coreDir, {
      project_id: ctx.project_id,
      pricing,
      prompt: ctx.prompt,
      model_id: ctx.model_config?.model,
    });
    return ctx;
  };
}

function trackUsage(coreDir, pricing) {
  const hooks = createMiddlewareHooks({ coreDir, pricing });
  return hooks.post;
}

module.exports = {
  withMiddleware,
  createMiddlewareHooks,
  enforceBudget,
  trackUsage,
};