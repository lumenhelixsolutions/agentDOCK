/**
 * C.O.R.E. — Policy engine: budget controller + token compressor.
 */

const { AccessDeniedException } = require('./errors');
const { estimateCost } = require('./pricing');
const { queryUsage, getProjectBudget } = require('./storage');

const DEFAULT_COMPRESS_THRESHOLD = 12000;

function compressPrompt(prompt, { threshold = DEFAULT_COMPRESS_THRESHOLD, head = 4000, tail = 2000 } = {}) {
  const text = String(prompt || '');
  if (text.length <= threshold) {
    return { prompt: text, compressed: false, original_length: text.length, final_length: text.length };
  }
  const headText = text.slice(0, head);
  const tailText = text.slice(-tail);
  const omitted = text.length - head - tail;
  const compressedPrompt = [
    headText,
    `\n\n[CORE: compressed ${omitted} chars from middle of prompt]\n\n`,
    tailText,
  ].join('');
  return {
    prompt: compressedPrompt,
    compressed: true,
    original_length: text.length,
    final_length: compressedPrompt.length,
  };
}

function checkBudget(coreDir, { project_id, estimated_cost_usd, pricing, prompt, model_id }) {
  const budget = getProjectBudget(coreDir, project_id || 'default');
  if (!budget.daily_usd_cap || !budget.hard_stop) {
    return { allowed: true, budget, current_spend: 0, estimated_cost_usd };
  }
  const usage = queryUsage(coreDir, project_id || 'default', 'day');
  const estimate = estimated_cost_usd != null
    ? Number(estimated_cost_usd)
    : estimateCost(prompt, model_id, pricing).cost_usd;
  const projected = usage.current_spend + estimate;
  if (projected > budget.daily_usd_cap) {
    throw new AccessDeniedException(
      `Budget exceeded for project "${project_id}": $${usage.current_spend.toFixed(4)} spent + $${estimate.toFixed(4)} estimated > $${budget.daily_usd_cap} daily cap`,
      {
        project_id,
        current_spend: usage.current_spend,
        estimated_cost_usd: estimate,
        daily_usd_cap: budget.daily_usd_cap,
        alert_threshold: budget.alert_threshold,
      },
    );
  }
  const alert = budget.alert_threshold && usage.current_spend >= budget.alert_threshold;
  return {
    allowed: true,
    budget,
    current_spend: usage.current_spend,
    estimated_cost_usd: estimate,
    projected_spend: projected,
    alert,
  };
}

module.exports = {
  DEFAULT_COMPRESS_THRESHOLD,
  compressPrompt,
  checkBudget,
};