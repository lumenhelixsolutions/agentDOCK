/**
 * C.O.R.E. — IProvider base contract.
 */

const { estimateTokens } = require('../pricing');

class BaseProvider {
  constructor(id) {
    this.id = id;
  }

  /**
   * @param {string} prompt
   * @param {string} projectId
   * @param {object} modelConfig
   * @returns {Promise<{ text: string, usage: object, raw?: object, ttft_ms?: number }>}
   */
  async execute(prompt, projectId, modelConfig) {
    throw new Error(`Provider "${this.id}" execute() not implemented`);
  }

  normalizeUsage(raw, { prompt = '', responseText = '' } = {}) {
    const input = Number(raw?.prompt_tokens ?? raw?.input_tokens ?? estimateTokens(prompt));
    const output = Number(raw?.completion_tokens ?? raw?.output_tokens ?? estimateTokens(responseText));
    return {
      input_tokens: input,
      output_tokens: output,
      total_tokens: input + output,
      raw_tokens: raw || null,
    };
  }
}

module.exports = { BaseProvider };