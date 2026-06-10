const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { startTestServer, stopTestServer } = require('./helpers/test-server');

describe('server', () => {
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
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    });
  }

  it('responds 200 OK on /api/status', async () => {
    const res = await request('/api/status');
    assert.strictEqual(res.status, 200);
    const json = JSON.parse(res.body);
    assert.strictEqual(json.ok, true);
    assert.ok(json.version);
  });

  it('responds 200 OK on /api/catalog', async () => {
    const res = await request('/api/catalog');
    assert.strictEqual(res.status, 200);
    const json = JSON.parse(res.body);
    assert.ok(Array.isArray(json.tools) || json.version);
  });

  it('responds 200 OK on /api/profiles', async () => {
    const res = await request('/api/profiles');
    assert.strictEqual(res.status, 200);
    const json = JSON.parse(res.body);
    assert.ok(Array.isArray(json));
    if (json.length > 0) {
      assert.ok(json[0].id);
      assert.ok(json[0].name);
    }
  });
});
