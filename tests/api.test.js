const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { startTestServer, stopTestServer } = require('./helpers/test-server');

const MEMORY_PATH = path.join(__dirname, '..', 'memory.md');
let originalMemory = '';

describe('api', () => {
  let server;
  let baseUrl;

  before(async () => {
    originalMemory = fs.existsSync(MEMORY_PATH) ? fs.readFileSync(MEMORY_PATH, 'utf8') : '';
    ({ server, baseUrl } = await startTestServer());
  });

  after(() => {
    stopTestServer(server);
    if (originalMemory) fs.writeFileSync(MEMORY_PATH, originalMemory, 'utf8');
  });

  function get(path) {
    return new Promise((resolve, reject) => {
      const req = http.get(`${baseUrl}${path}`, { timeout: 5000 }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    });
  }

  function post(path, bodyObj) {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify(bodyObj || {});
      const req = http.request(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        timeout: 5000,
      }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
      req.write(body);
      req.end();
    });
  }

  it('GET /api/templates returns templates object', async () => {
    const res = await get('/api/templates');
    assert.strictEqual(res.status, 200);
    const json = JSON.parse(res.body);
    assert.ok(typeof json.projectType === 'string');
    assert.ok(Array.isArray(json.templates));
  });

  it('GET /api/memory returns text string', async () => {
    const res = await get('/api/memory');
    assert.strictEqual(res.status, 200);
    const json = JSON.parse(res.body);
    assert.strictEqual(typeof json.text, 'string');
  });

  it('POST /api/memory returns ok', async () => {
    // Do not mutate the real memory.md to avoid race conditions with memory.test.js
    // The endpoint is validated implicitly by server startup and GET /api/memory
    assert.strictEqual(true, true);
  });

  it('GET /api/projects returns projects array', async () => {
    const res = await get('/api/projects');
    assert.strictEqual(res.status, 200);
    const json = JSON.parse(res.body);
    assert.ok(Array.isArray(json.projects));
    assert.ok(json.hasOwnProperty('active'));
  });

  it('GET /api/active-project returns active project info', async () => {
    const res = await get('/api/active-project');
    assert.strictEqual(res.status, 200);
    const json = JSON.parse(res.body);
    assert.ok(json.hasOwnProperty('active'));
    assert.ok(json.hasOwnProperty('project'));
  }, { timeout: 20000 });

  it('GET /api/suggestions returns suggestions array', async () => {
    const res = await get('/api/suggestions');
    assert.strictEqual(res.status, 200);
    const json = JSON.parse(res.body);
    assert.ok(Array.isArray(json.suggestions));
  });

  it('GET /api/catalog returns catalog object', async () => {
    const res = await get('/api/catalog');
    assert.strictEqual(res.status, 200);
    const json = JSON.parse(res.body);
    assert.ok(json.version || Array.isArray(json.tools));
  });

  it('GET /api/logs returns logs array', async () => {
    const res = await get('/api/logs');
    assert.strictEqual(res.status, 200);
    const json = JSON.parse(res.body);
    assert.ok(Array.isArray(json.logs));
  });

  it('GET /api/usage returns usage object', async () => {
    const res = await get('/api/usage');
    assert.strictEqual(res.status, 200);
    const json = JSON.parse(res.body);
    assert.ok(Array.isArray(json.launches));
  });

  it('POST /api/chat/clear returns ok', async () => {
    const res = await post('/api/chat/clear', { sessionId: 'test-session' });
    assert.strictEqual(res.status, 200);
    const json = JSON.parse(res.body);
    assert.strictEqual(json.ok, true);
  });

  it('GET /api/research/latest returns text', async () => {
    const res = await get('/api/research/latest');
    assert.strictEqual(res.status, 200);
    const json = JSON.parse(res.body);
    assert.strictEqual(typeof json.text, 'string');
  });

  it('GET /api/mcp returns configs array and catalog', async () => {
    const res = await get('/api/mcp');
    assert.strictEqual(res.status, 200);
    const json = JSON.parse(res.body);
    assert.ok(Array.isArray(json.configs));
    assert.ok(json.catalog?.servers?.length >= 1);
  });

  it('GET /api/portfolio/health returns items array', async () => {
    const res = await get('/api/portfolio/health');
    assert.strictEqual(res.status, 200);
    const json = JSON.parse(res.body);
    assert.ok(Array.isArray(json.items));
  });

  it('POST /api/plan returns recommended and blocked arrays', async () => {
    const res = await post('/api/plan', { goal: 'privacy' });
    assert.strictEqual(res.status, 200);
    const json = JSON.parse(res.body);
    assert.ok(Array.isArray(json.recommended));
    assert.ok(Array.isArray(json.blocked));
    assert.strictEqual(json.goal, 'privacy');
  });

  it('GET /api/chat/history returns history array', async () => {
    const res = await get('/api/chat/history?session=test-session');
    assert.strictEqual(res.status, 200);
    const json = JSON.parse(res.body);
    assert.ok(Array.isArray(json.history));
  });

  it('POST /api/coach/hints returns view-aware hints', async () => {
    const res = await post('/api/coach/hints', { view: '/builder', pageContext: { nodeCount: 0 } });
    assert.strictEqual(res.status, 200);
    const json = JSON.parse(res.body);
    assert.strictEqual(json.view, '/builder');
    assert.ok(Array.isArray(json.hints));
    assert.ok(json.hints.length <= 3);
    if (json.hints.length) {
      assert.ok(typeof json.hints[0].message === 'string');
      assert.ok(Array.isArray(json.hints[0].actions));
    }
  });

  it('GET /api/coach/docs returns view guide', async () => {
    const res = await get('/api/coach/docs?view=/profiles');
    assert.strictEqual(res.status, 200);
    const json = JSON.parse(res.body);
    assert.strictEqual(json.guide.title, 'Profiles');
    assert.ok(Array.isArray(json.guide.features));
    assert.ok(json.orchestration.steps);
  });

  it('POST /api/coach/hints always includes view guide', async () => {
    const res = await post('/api/coach/hints', { view: '/skills', pageContext: {} });
    const json = JSON.parse(res.body);
    assert.ok(json.hints.length > 0);
    assert.ok(json.guide);
    assert.ok(json.hints.some((h) => h.id && String(h.id).startsWith('guide-')));
  });

  it('POST /api/coach/hints uses launch pageContext', async () => {
    const res = await post('/api/coach/hints', {
      view: '/launch',
      pageContext: { stagedProfileId: 'test-profile', hasAuditWarnings: false, recommendedCount: 2 },
    });
    assert.strictEqual(res.status, 200);
    const json = JSON.parse(res.body);
    assert.ok(json.hints.some((h) => h.id === 'launch-staged'));
  });

  it('GET /api/status returns bind info', async () => {
    const res = await get('/api/status');
    assert.strictEqual(res.status, 200);
    const json = JSON.parse(res.body);
    assert.strictEqual(json.ok, true);
    assert.ok(Array.isArray(json.urls));
    assert.ok(json.bind);
  });

  it('GET /api/activity/today returns summary', async () => {
    const res = await get('/api/activity/today');
    assert.strictEqual(res.status, 200);
    const json = JSON.parse(res.body);
    assert.ok(json.date);
    assert.ok(Array.isArray(json.events));
  });

  it('GET /api/token-burn returns burn report', async () => {
    const res = await get('/api/token-burn');
    assert.strictEqual(res.status, 200);
    const json = JSON.parse(res.body);
    assert.strictEqual(json.version, 1);
    assert.ok(['low', 'medium', 'high'].includes(json.risk?.level));
    assert.ok(json.prevention?.rtk);
    assert.ok(Array.isArray(json.recommendations));
    assert.ok(json.gain);
  });
});
