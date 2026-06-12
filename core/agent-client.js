/**
 * C.O.R.E. — AgentClient unified query entry point.
 */

const { ProviderGateway } = require('./gateway');
const {
  resolveCoreDir,
  loadTransactions,
  loadBudgets,
  setProjectBudget,
  queryUsage,
  buildRollup,
} = require('./storage');
const { loadPricing, savePricing } = require('./pricing');
const { clearCache } = require('./cache');
const { refreshPricing } = require('./pricing-fetch');
const {
  listActiveNotifications,
  dismissNotification,
  markNotificationRead,
  evaluateBudgetNotifications,
} = require('./notifications');

class AgentClient {
  constructor({ hootRoot, deps = {}, options = {} } = {}) {
    this.hootRoot = hootRoot;
    this.coreDir = resolveCoreDir(hootRoot);
    this.gateway = new ProviderGateway({ hootRoot, deps, options });
  }

  /**
   * Unified query — passes through gateway middleware pipeline.
   * @param {{ prompt: string, project_id?: string, model_config?: object, tags?: string[] }} params
   */
  async query({ prompt, project_id, model_config, tags } = {}) {
    if (!prompt || !String(prompt).trim()) {
      throw new Error('AgentClient.query requires a non-empty prompt');
    }
    const config = { ...(model_config || {}) };
    if (tags?.length) config.tags = tags;
    const response = await this.gateway.execute(String(prompt), project_id || 'default', config);
    return {
      ok: true,
      text: response.text,
      usage: response.usage,
      meta: {
        provider: response.provider,
        model_id: response.model_id,
        project_id: project_id || 'default',
        latency_ms: response.latency_ms,
        ttft_ms: response.ttft_ms,
        cache_hit: response.cache_hit,
      },
    };
  }

  getTraces(opts) {
    return loadTransactions(this.coreDir, opts);
  }

  getRollup(opts) {
    return buildRollup(this.coreDir, opts);
  }

  getUsage(projectId, timeframe) {
    return queryUsage(this.coreDir, projectId || 'default', timeframe || 'day');
  }

  getBudgets() {
    return loadBudgets(this.coreDir);
  }

  setBudget(projectId, patch) {
    return setProjectBudget(this.coreDir, projectId, patch);
  }

  getPricing() {
    return loadPricing(this.coreDir);
  }

  updatePricing(pricing) {
    return savePricing(this.coreDir, pricing);
  }

  clearPromptCache() {
    return clearCache(this.coreDir);
  }

  async refreshModelPricing({ force = false } = {}) {
    const result = await refreshPricing(this.coreDir, { force });
    if (result.pricing) this.gateway.pricing = result.pricing;
    return result;
  }

  getNotifications(opts) {
    return listActiveNotifications(this.coreDir, opts);
  }

  readNotification(id) {
    return markNotificationRead(this.coreDir, id);
  }

  dismissNotification(id) {
    return dismissNotification(this.coreDir, id);
  }

  evaluateBudgetAlerts(projectId) {
    return evaluateBudgetNotifications(this.coreDir, projectId || 'default', { pricing: this.getPricing() });
  }
}

function createAgentClient(opts) {
  return new AgentClient(opts);
}

module.exports = {
  AgentClient,
  createAgentClient,
};