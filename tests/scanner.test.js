const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { parseOllamaPsRaw, normalizeLoadedModels } = require('../server.js');

const SCAN_LOG_DIR = path.join(__dirname, '..', 'logs');

function findScanFixture() {
  if (!fs.existsSync(SCAN_LOG_DIR)) return null;
  const files = fs.readdirSync(SCAN_LOG_DIR).filter(f => f.startsWith('scan-') && f.endsWith('.json')).sort();
  return files.length ? path.join(SCAN_LOG_DIR, files[files.length - 1]) : null;
}

function loadFixture() {
  const fixturePath = findScanFixture();
  if (!fixturePath) return null;
  try {
    return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  } catch {
    return null;
  }
}

describe('scanner output schema', () => {
  const scan = loadFixture();

  it('should load a scan fixture', () => {
    assert.ok(scan, 'Expected a scan JSON fixture in logs/');
  });

  it('should have top-level object with required keys', { skip: !scan }, () => {
    const requiredKeys = ['env', 'coders', 'tools', 'system', 'hardware'];
    for (const key of requiredKeys) {
      assert.ok(key in scan, `Missing required top-level key: ${key}`);
    }
  });

  it('should have env as an object', { skip: !scan }, () => {
    assert.strictEqual(typeof scan.env, 'object');
    assert.ok(scan.env !== null);
  });

  it('should have coders as an array', { skip: !scan }, () => {
    assert.ok(Array.isArray(scan.coders));
  });

  it('should have tools as an object', { skip: !scan }, () => {
    assert.strictEqual(typeof scan.tools, 'object');
    assert.ok(scan.tools !== null);
  });

  it('should have system info with os', { skip: !scan }, () => {
    assert.ok(scan.system);
    assert.strictEqual(typeof scan.system.os, 'string');
  });

  it('should have hardware with ram_gb and cpu', { skip: !scan }, () => {
    assert.ok(scan.hardware);
    assert.strictEqual(typeof scan.hardware.ram_gb, 'number');
    assert.strictEqual(typeof scan.hardware.cpu, 'string');
  });
});

describe('parseOllamaPsRaw', () => {
  it('parses a well-formed ollama ps line', () => {
    const raw = 'llama31-hermes-64k    abc123    5.2 GB    100% GPU    64000    2 minutes from now';
    const result = parseOllamaPsRaw(raw);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, 'llama31-hermes-64k');
    assert.strictEqual(result[0].context, 64000);
  });

  it('returns empty array for empty input', () => {
    const result = parseOllamaPsRaw('');
    assert.deepStrictEqual(result, []);
  });

  it('skips header line', () => {
    const raw = 'NAME    ID    SIZE    PROCESSOR    UNTIL\nllama31-hermes-64k    abc123    5.2 GB    100% GPU    64000    2m';
    const result = parseOllamaPsRaw(raw);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, 'llama31-hermes-64k');
  });
});

describe('normalizeLoadedModels', () => {
  it('returns array when scan.ollama.loaded_models is an array', () => {
    const scan = { ollama: { loaded_models: [{ name: 'x', context: 1 }] } };
    const result = normalizeLoadedModels(scan);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, 'x');
  });

  it('falls back to ps_raw when loaded_models is missing', () => {
    const scan = { ollama: { ps_raw: 'llama31-hermes-64k    abc123    5.2 GB    100% GPU    64000    2m' } };
    const result = normalizeLoadedModels(scan);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, 'llama31-hermes-64k');
  });

  it('returns empty array when ollama section is missing', () => {
    const result = normalizeLoadedModels({});
    assert.deepStrictEqual(result, []);
  });
});
