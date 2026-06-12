const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  parseBenchCsv,
  findBenchRow,
  benchScoreAdjustment,
  applyBenchToProfile,
} = require('../bench-results');

const SAMPLE = `model,status,latency_ms,tokens_per_sec,note
phi3:mini,pass,1200,24.5,"OK"
qwen2.5:1.5b,missing,0,0,"not pulled"`;

describe('bench-results', () => {
  it('parses CSV rows', () => {
    const rows = parseBenchCsv(SAMPLE);
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[0].model, 'phi3:mini');
    assert.strictEqual(rows[0].tokens_per_sec, 24.5);
  });

  it('finds model by variant', () => {
    const rows = parseBenchCsv(SAMPLE);
    assert.ok(findBenchRow(rows, 'phi3:mini'));
    assert.ok(findBenchRow(rows, 'phi3'));
  });

  it('scores pass tier', () => {
    const adj = benchScoreAdjustment({ status: 'pass', tokens_per_sec: 25, model: 'phi3:mini' });
    assert.strictEqual(adj.delta, 12);
    assert.strictEqual(adj.tier, 'fast');
  });

  it('applies bench delta to ollama profile eval', () => {
    const rows = parseBenchCsv(SAMPLE);
    const base = { state: 'READY', score: 75, reasons: ['Ollama detected'] };
    const profile = { meta: { backend: 'ollama', model: 'phi3:mini' } };
    const out = applyBenchToProfile(base, profile, { rows });
    assert.strictEqual(out.score, 87);
    assert.ok(out.bench);
    assert.ok(out.reasons.some((r) => r.includes('Bench pass')));
  });

  it('skips non-ollama backends without model', () => {
    const rows = parseBenchCsv(SAMPLE);
    const base = { state: 'READY', score: 75, reasons: [] };
    const profile = { meta: { backend: 'gemini', model: 'gemini-2.5-flash' } };
    const out = applyBenchToProfile(base, profile, { rows });
    assert.strictEqual(out.score, 75);
    assert.strictEqual(out.bench, undefined);
  });
});