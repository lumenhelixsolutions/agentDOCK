/**
 * C.O.R.E. — OpenAI API adapter.
 */

const { BaseProvider } = require('./base');
const { ProviderError } = require('../errors');

class OpenAIAdapter extends BaseProvider {
  constructor({ postJSON, getApiKey } = {}) {
    super('openai');
    this.postJSON = postJSON;
    this.getApiKey = getApiKey || (() => process.env.OPENAI_API_KEY || null);
  }

  async execute(prompt, projectId, modelConfig = {}) {
    const key = modelConfig.api_key || this.getApiKey();
    if (!key) throw new ProviderError('No OPENAI_API_KEY', this.id);
    const model = modelConfig.model || 'gpt-4o-mini';
    const messages = modelConfig.messages || [{ role: 'user', content: String(prompt) }];
    const body = JSON.stringify({
      model,
      messages,
      temperature: modelConfig.temperature ?? 0.3,
      max_tokens: modelConfig.max_tokens ?? 4096,
    });
    const started = Date.now();
    let json;
    try {
      json = await this.postJSON(
        'https://api.openai.com/v1/chat/completions',
        { Authorization: `Bearer ${key}` },
        body,
        modelConfig.timeout_ms ?? 60000,
      );
    } catch (err) {
      throw new ProviderError(err.message, this.id, err);
    }
    if (json.error) throw new ProviderError(json.error.message || JSON.stringify(json.error), this.id);
    const text = json.choices?.[0]?.message?.content || '';
    const usage = this.normalizeUsage(json.usage, { prompt, responseText: text });
    return {
      text,
      usage,
      raw: json,
      latency_ms: Date.now() - started,
      ttft_ms: Date.now() - started,
      model_id: model,
      provider: this.id,
      project_id: projectId,
    };
  }
}

module.exports = { OpenAIAdapter };