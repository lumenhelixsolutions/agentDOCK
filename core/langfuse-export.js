/**
 * C.O.R.E. — Langfuse-shaped export (file-compatible, no server dependency).
 */

function transactionToLangfuseGeneration(tx) {
  return {
    id: tx.id,
    traceId: tx.trace_id || tx.id,
    name: `${tx.provider}:${tx.model_id}`,
    startTime: tx.timestamp,
    endTime: tx.timestamp,
    model: tx.model_id,
    input: { tokens: tx.input_tokens },
    output: { tokens: tx.output_tokens },
    usage: {
      input: tx.input_tokens,
      output: tx.output_tokens,
      total: tx.input_tokens + tx.output_tokens,
    },
    metadata: {
      project_id: tx.project_id,
      cost_usd: tx.cost_usd,
      latency_ms: tx.latency_ms,
      ttft_ms: tx.ttft_ms,
      cache_hit: tx.cache_hit,
      tags: tx.tags,
      status: tx.status,
    },
  };
}

function transactionsToLangfuseBatch(transactions) {
  const traces = {};
  for (const tx of transactions) {
    const traceId = tx.trace_id || tx.id;
    if (!traces[traceId]) {
      traces[traceId] = {
        id: traceId,
        timestamp: tx.timestamp,
        name: `core:${tx.project_id}`,
        metadata: { project_id: tx.project_id, tags: tx.tags },
        generations: [],
      };
    }
    traces[traceId].generations.push(transactionToLangfuseGeneration(tx));
  }
  return { traces: Object.values(traces) };
}

module.exports = {
  transactionToLangfuseGeneration,
  transactionsToLangfuseBatch,
};