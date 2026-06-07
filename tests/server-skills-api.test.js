const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');

describe('server skills api', () => {
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
    assert.ok(json.content.includes('Placeholder') || json.content.includes('SKILL'));
  });

  it('GET /api/skills/nonexistent returns 404', async () => {
    const res = await request('/api/skills/nonexistent');
    assert.strictEqual(res.status, 404);
  });
});
