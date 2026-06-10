const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { startTestServer, stopTestServer } = require('./helpers/test-server');

describe('server skills api', () => {
  let server;
  let baseUrl;

  before(async () => {
    ({ server, baseUrl } = await startTestServer());
  });

  after(() => {
    stopTestServer(server);
  });

  function request(path) {
    return new Promise((resolve, reject) => {
      const req = http.get(`${baseUrl}${path}`, { timeout: 5000 }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          resolve({ status: res.statusCode, body: data });
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    });
  }

  it('GET /api/skills returns 200 with catalog', async () => {
    const res = await request('/api/skills');
    assert.strictEqual(res.status, 200);
    const json = JSON.parse(res.body);
    assert.ok(Array.isArray(json.skills));
    assert.ok(json.skills.length > 0);
  });

  it('GET /api/skills/ce-plan returns the plan skill', async () => {
    const res = await request('/api/skills/ce-plan');
    assert.strictEqual(res.status, 200);
    const json = JSON.parse(res.body);
    assert.strictEqual(json.id, 'ce-plan');
  });

  it('GET /api/skills/ce-plan/content returns markdown', async () => {
    const res = await request('/api/skills/ce-plan/content');
    assert.strictEqual(res.status, 200);
    const json = JSON.parse(res.body);
    assert.ok(json.content.length > 0);
    assert.ok(json.content.includes('#') || json.content.includes('---'));
  });

  it('GET /api/skills/nonexistent returns 404', async () => {
    const res = await request('/api/skills/nonexistent');
    assert.strictEqual(res.status, 404);
  });
});
