const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');

describe('server', () => {
  let server;
  let port;
  let baseUrl;

  before(async () => {
    process.env.AGENTDOCK_PORT = '0';
    const mod = require('../server.js');
    server = mod.__server;
    if (!server) {
      throw new Error('server.js did not export __server');
    }
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Server did not start in time')), 5000);
      const check = () => {
        const addr = server.address();
        if (addr) {
          clearTimeout(timeout);
          port = addr.port;
          baseUrl = `http://127.0.0.1:${port}`;
          resolve();
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  });

  after(() => {
    if (server) {
      server.close();
    }
    delete require.cache[require.resolve('../server.js')];
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
