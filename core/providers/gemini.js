/**
 * C.O.R.E. — Gemini API adapter.
 */

const { BaseProvider } = require('./base');
const { ProviderError } = require('../errors');

class GeminiAdapter extends BaseProvider {
  constructor({ postJSON, getApiKey } = {}) {
    super('gemini');
    this.postJSON = postJSON;
    this.getApiKey = getApiKey || (() => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null);
  }

  async execute(prompt, projectId, modelConfig = {}) {
    const key = modelConfig.api_key || this.getApiKey();
    if (!key) throw new ProviderError('No GEMINI_API_KEY or GOOGLE_API_KEY', this.id);
    const model = modelConfig.model || 'gemini-2.0-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const contents = modelConfig.contents || [{ role: 'user', parts: [{ text: String(prompt) }] }];
    const body = JSON.stringify({
      contents,
      generationConfig: {
        temperature: modelConfig.temperature ?? 0.3,
        maxOutputTokens: modelConfig.max_tokens ?? 4096,
      },
    });
    const started = Date.now();
    let json;
    try {
      json = await this.postJSON(endpoint, {}, body, modelConfig.timeout_ms ?? 60000);
    } catch (err) {
      throw new ProviderError(err.message, this.id, err);
    }
    if (json.error) throw new ProviderError(json.error.message || JSON.stringify(json.error), this.id);
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const meta = json.usageMetadata || {};
    const usage = this.normalizeUsage(
      {
        prompt_tokens: meta.promptTokenCount,
        completion_tokens: meta.candidatesTokenCount,
        total_tokens: meta.totalTokenCount,
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

module.exports = { GeminiAdapter };