const path = require('path');

const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');

async function startTestServer() {
  process.env.AGENTDOCK_PORT = '0';
  process.env.AGENTDOCK_PROJECTS_ROOT = FIXTURES_DIR;
  delete require.cache[require.resolve('../../server.js')];
  const mod = require('../../server.js');
  const server = await mod.startServer(0);
  const addr = server.address();
  const port = typeof addr === 'object' ? addr.port : 0;
  return {
    server,
    port,
    baseUrl: `http://127.0.0.1:${port}`,
    mod,
  };
}

function stopTestServer(server) {
  if (server && server.listening) {
    server.close();
  }
  delete require.cache[require.resolve('../../server.js')];
}

module.exports = { startTestServer, stopTestServer, FIXTURES_DIR };