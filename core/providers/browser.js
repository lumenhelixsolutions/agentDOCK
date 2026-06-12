/**
 * C.O.R.E. — Browser automation adapter (web-sub placeholder).
 * Phase 1: stub with graceful failure until cookie/session bridge ships.
 */

const { BaseProvider } = require('./base');
const { ProviderError } = require('../errors');

class BrowserAutomationAdapter extends BaseProvider {
  constructor({ handler } = {}) {
    super('browser');
    this.handler = handler || null;
  }

  async execute(prompt, projectId, modelConfig = {}) {
    if (typeof this.handler === 'function') {
      const started = Date.now();
      const result = await this.handler(prompt, projectId, modelConfig);
      const text = result?.text || '';
      const usage = this.normalizeUsage(result?.usage, { prompt, responseText: text });
      return {
        text,
        usage,
        raw: result?.raw || null,
        latency_ms: Date.now() - started,
        ttft_ms: result?.ttft_ms ?? Date.now() - started,
        model_id: modelConfig.model || 'browser-sub',
        provider: this.id,
        project_id: projectId,
      };
    }
    throw new ProviderError(
      'Browser automation adapter not configured. Set a handler or use an API/local provider.',
      this.id,
    );
  }
}

module.exports = { BrowserAutomationAdapter };