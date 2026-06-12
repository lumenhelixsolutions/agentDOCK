/**
 * C.O.R.E. — Anthropic API adapter.
 */

const { BaseProvider } = require('./base');
const { ProviderError } = require('../errors');

class AnthropicAdapter extends BaseProvider {
  constructor({ postJSON, getApiKey } = {}) {
    super('anthropic');
    this.postJSON = postJSON;
    this.getApiKey = getApiKey || (() => process.env.ANTHROPIC_API_KEY || null);
  }

  async execute(prompt, projectId, modelConfig = {}) {
    const key = modelConfig.api_key || this.getApiKey();
    if (!key) throw new ProviderError('No ANTHROPIC_API_KEY', this.id);
    const model = modelConfig.model || 'claude-3-5-sonnet-20241022';
    const messages = modelConfig.messages || [{ role: 'user', content: String(prompt) }];
    const system = modelConfig.system || undefined;
    const body = JSON.stringify({
      model,
      max_tokens: modelConfig.max_tokens ?? 4096,
      temperature: modelConfig.temperature ?? 0.3,
      system,
      messages: messages.filter((m) => m.role !== 'system'),
    });
    const started = Date.now();
    let json;
    try {
      json = await this.postJSON(
        'https://api.anthropic.com/v1/messages',
        {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        body,
        modelConfig.timeout_ms ?? 90000,
      );
    } catch (err) {
      throw new ProviderError(err.message, this.id, err);
    }
    if (json.error) throw new ProviderError(json.error.message || JSON.stringify(json.error), this.id);
    const text = (json.content || []).filter((p) => p.type === 'text').map((p) => p.text).join('\n');
    const usage = this.normalizeUsage(
      {
        input_tokens: json.usage?.input_tokens,
        output_tokens: json.usage?.output_tokens,
      },
      { prompt, responseText: text },
    );
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

module.exports = { AnthropicAdapter };